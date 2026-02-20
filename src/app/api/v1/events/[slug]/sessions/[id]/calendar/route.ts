import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { generateSingleEventICS, type ICSEvent } from '@/lib/calendar/ics'

/**
 * GET /api/v1/events/[slug]/sessions/[id]/calendar
 *
 * Download an ICS file for a single session
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; id: string }> }
) {
  const { slug, id } = await params

  const supabase = await createAdminClient()

  // Fetch event and session data
  const [eventResult, sessionResult] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, timezone, location_name')
      .eq('slug', slug)
      .single(),
    supabase
      .from('sessions')
      .select(`
        id, title, description, host_name, duration,
        venue:venues(name, address),
        time_slot:time_slots(start_time, end_time)
      `)
      .eq('id', id)
      .single(),
  ])

  if (eventResult.error || !eventResult.data) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  if (sessionResult.error || !sessionResult.data) {
    return NextResponse.json(
      { error: 'Session not found' },
      { status: 404 }
    )
  }

  const event = eventResult.data
  const session = sessionResult.data

  // Type helpers for Supabase nested selects
  type TimeSlotData = { start_time: string; end_time: string } | null
  type VenueData = { name: string; address?: string } | null

  // Session must be scheduled to have calendar entry
  const timeSlot = session.time_slot as unknown as TimeSlotData
  if (!timeSlot?.start_time || !timeSlot?.end_time) {
    return NextResponse.json(
      { error: 'Session is not scheduled' },
      { status: 400 }
    )
  }

  // Build location string
  const venue = session.venue as unknown as VenueData
  let location = venue?.name || event.location_name || ''
  if (venue?.address) {
    location += `, ${venue.address}`
  }

  // Build description
  let description = session.description || ''
  if (session.host_name) {
    description = `Host: ${session.host_name}\n\n${description}`
  }

  // Build URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://schellingpoint.io'
  const sessionUrl = `${baseUrl}/e/${slug}/sessions/${session.id}`
  description += `\n\nView session: ${sessionUrl}`

  const icsEvent: ICSEvent = {
    uid: `session-${session.id}@schellingpoint.io`,
    title: session.title,
    description: description.trim(),
    location,
    startTime: new Date(timeSlot.start_time),
    endTime: new Date(timeSlot.end_time),
    url: sessionUrl,
    organizer: session.host_name || undefined,
  }

  const ics = generateSingleEventICS(icsEvent, event.name)

  // Return ICS file
  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(session.title)}.ics"`,
    },
  })
}
