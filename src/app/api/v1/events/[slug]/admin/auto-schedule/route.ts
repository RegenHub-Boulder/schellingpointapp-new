/**
 * Auto-Schedule API
 *
 * POST /preview - Generate a proposed schedule (dry run)
 * POST /apply - Apply a proposed schedule to the database
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'
import { autoSchedule, AutoScheduleResult, ScheduleAssignment } from '@/lib/scheduling/auto-scheduler'

// Preview auto-schedule (dry run)
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

  // Get event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
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

  // Fetch data
  const [sessionsRes, timeSlotsRes, venuesRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, title, duration, total_votes, status, time_slot_id, venue_id, track_id, time_preferences')
      .eq('event_id', event.id),
    supabase
      .from('time_slots')
      .select('id, start_time, end_time, is_break, venue_id, day_date, slot_type')
      .eq('event_id', event.id),
    supabase
      .from('venues')
      .select('id, name, capacity, is_primary')
      .eq('event_id', event.id),
  ])

  if (sessionsRes.error || timeSlotsRes.error || venuesRes.error) {
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 })
  }

  // Run auto-scheduler
  const result = autoSchedule(
    sessionsRes.data || [],
    timeSlotsRes.data || [],
    venuesRes.data || []
  )

  return NextResponse.json(result)
}

// Apply auto-schedule
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
    .select('id')
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

  // Parse body
  let body: { assignments: ScheduleAssignment[] }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { assignments } = body

  if (!assignments || !Array.isArray(assignments) || assignments.length === 0) {
    return NextResponse.json({ error: 'No assignments provided' }, { status: 400 })
  }

  // Verify all sessions and slots belong to this event
  const sessionIds = assignments.map((a) => a.sessionId)
  const slotIds = assignments.map((a) => a.slotId)

  const [sessionsCheck, slotsCheck] = await Promise.all([
    supabase
      .from('sessions')
      .select('id')
      .eq('event_id', event.id)
      .in('id', sessionIds),
    supabase
      .from('time_slots')
      .select('id')
      .eq('event_id', event.id)
      .in('id', slotIds),
  ])

  if (sessionsCheck.error || slotsCheck.error) {
    return NextResponse.json({ error: 'Failed to verify data' }, { status: 500 })
  }

  const validSessionIds = new Set((sessionsCheck.data || []).map((s) => s.id))
  const validSlotIds = new Set((slotsCheck.data || []).map((s) => s.id))

  const invalidAssignments = assignments.filter(
    (a) => !validSessionIds.has(a.sessionId) || !validSlotIds.has(a.slotId)
  )

  if (invalidAssignments.length > 0) {
    return NextResponse.json(
      { error: 'Some assignments have invalid session or slot IDs' },
      { status: 400 }
    )
  }

  // Apply assignments
  let applied = 0
  const errors: string[] = []

  for (const assignment of assignments) {
    const { error: updateError } = await supabase
      .from('sessions')
      .update({
        status: 'scheduled',
        venue_id: assignment.venueId,
        time_slot_id: assignment.slotId,
      })
      .eq('id', assignment.sessionId)
      .eq('event_id', event.id)

    if (updateError) {
      errors.push(`Failed to schedule session ${assignment.sessionId}: ${updateError.message}`)
    } else {
      applied++
    }
  }

  return NextResponse.json({
    success: true,
    applied,
    total: assignments.length,
    errors: errors.length > 0 ? errors : undefined,
    message: `Applied ${applied} of ${assignments.length} assignments`,
  })
}
