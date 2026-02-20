/**
 * Publish Schedule API
 *
 * POST /api/v1/events/[slug]/admin/publish-schedule
 * Publishes the current schedule, updating schedule_published_at
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Auth
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Get event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, schedule_published_at, last_schedule_change_at')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check admin permission
  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get scheduled sessions count for the response
  const { count: scheduledCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'scheduled')
    .not('time_slot_id', 'is', null)

  // Update schedule_published_at
  const now = new Date().toISOString()
  const { error: updateError } = await supabase
    .from('events')
    .update({ schedule_published_at: now })
    .eq('id', event.id)

  if (updateError) {
    console.error('Error publishing schedule:', updateError)
    return NextResponse.json(
      { error: 'Failed to publish schedule' },
      { status: 500 }
    )
  }

  // TODO: Trigger "schedule published" notification to attendees
  // This can be implemented with the existing notification system

  return NextResponse.json({
    success: true,
    publishedAt: now,
    scheduledSessions: scheduledCount || 0,
    message: `Schedule published with ${scheduledCount || 0} scheduled sessions`,
  })
}

// GET endpoint to check publish status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Auth
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // Get event with schedule timestamps
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, schedule_published_at, last_schedule_change_at')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // Check admin permission
  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Get scheduled sessions count
  const { count: scheduledCount } = await supabase
    .from('sessions')
    .select('id', { count: 'exact', head: true })
    .eq('event_id', event.id)
    .eq('status', 'scheduled')
    .not('time_slot_id', 'is', null)

  // Determine if there are unpublished changes
  const hasUnpublishedChanges = !event.schedule_published_at || (
    event.last_schedule_change_at &&
    new Date(event.last_schedule_change_at) > new Date(event.schedule_published_at)
  )

  return NextResponse.json({
    schedulePublishedAt: event.schedule_published_at,
    lastScheduleChangeAt: event.last_schedule_change_at,
    hasUnpublishedChanges,
    scheduledSessions: scheduledCount || 0,
  })
}
