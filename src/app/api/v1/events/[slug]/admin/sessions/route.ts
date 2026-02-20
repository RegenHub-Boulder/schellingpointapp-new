/**
 * Admin Session Creation API
 *
 * POST /api/v1/events/[slug]/admin/sessions
 * Creates a session with full admin control over status, host, and scheduling
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'

const VALID_STATUSES = ['pending', 'approved', 'scheduled']
const VALID_FORMATS = ['talk', 'workshop', 'discussion', 'panel', 'demo']
const VALID_DURATIONS = [15, 30, 60, 90]

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
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // Validate required fields
  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  if (!body.host_name || typeof body.host_name !== 'string' || !body.host_name.trim()) {
    return NextResponse.json({ error: 'Host name is required' }, { status: 400 })
  }

  // Validate optional fields
  const status = (body.status as string) || 'approved'
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` },
      { status: 400 }
    )
  }

  const format = (body.format as string) || 'talk'
  if (!VALID_FORMATS.includes(format)) {
    return NextResponse.json(
      { error: `Invalid format. Must be one of: ${VALID_FORMATS.join(', ')}` },
      { status: 400 }
    )
  }

  const duration = (body.duration as number) || 60
  if (!VALID_DURATIONS.includes(duration)) {
    return NextResponse.json(
      { error: `Invalid duration. Must be one of: ${VALID_DURATIONS.join(', ')}` },
      { status: 400 }
    )
  }

  // If status is 'scheduled', venue_id and time_slot_id are required
  if (status === 'scheduled') {
    if (!body.venue_id) {
      return NextResponse.json(
        { error: 'venue_id is required for scheduled sessions' },
        { status: 400 }
      )
    }
    if (!body.time_slot_id) {
      return NextResponse.json(
        { error: 'time_slot_id is required for scheduled sessions' },
        { status: 400 }
      )
    }

    // Verify venue belongs to this event
    const { data: venue } = await supabase
      .from('venues')
      .select('id')
      .eq('id', body.venue_id)
      .eq('event_id', event.id)
      .single()

    if (!venue) {
      return NextResponse.json({ error: 'Invalid venue_id' }, { status: 400 })
    }

    // Verify time slot belongs to this event
    const { data: timeSlot } = await supabase
      .from('time_slots')
      .select('id')
      .eq('id', body.time_slot_id)
      .eq('event_id', event.id)
      .single()

    if (!timeSlot) {
      return NextResponse.json({ error: 'Invalid time_slot_id' }, { status: 400 })
    }
  }

  // Verify track_id if provided
  if (body.track_id) {
    const { data: track } = await supabase
      .from('tracks')
      .select('id')
      .eq('id', body.track_id)
      .eq('event_id', event.id)
      .single()

    if (!track) {
      return NextResponse.json({ error: 'Invalid track_id' }, { status: 400 })
    }
  }

  // Verify host_id if provided
  if (body.host_id) {
    const { data: hostProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', body.host_id)
      .single()

    if (!hostProfile) {
      return NextResponse.json({ error: 'Invalid host_id' }, { status: 400 })
    }
  }

  // Build insert object
  const sessionData = {
    event_id: event.id,
    title: (body.title as string).trim(),
    description: body.description ? (body.description as string).trim() : null,
    format,
    duration,
    status,
    host_id: body.host_id || null,
    host_name: (body.host_name as string).trim(),
    track_id: body.track_id || null,
    venue_id: status === 'scheduled' ? body.venue_id : null,
    time_slot_id: status === 'scheduled' ? body.time_slot_id : null,
    topic_tags: Array.isArray(body.topic_tags) ? body.topic_tags : null,
    session_type: 'curated', // Mark as admin-created
    is_votable: status !== 'scheduled', // Only votable if not already scheduled
  }

  // Insert session
  const { data: session, error: insertError } = await supabase
    .from('sessions')
    .insert(sessionData)
    .select('id')
    .single()

  if (insertError) {
    console.error('Error creating session:', insertError)
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    id: session.id,
    message: `Session created with status: ${status}`,
  })
}
