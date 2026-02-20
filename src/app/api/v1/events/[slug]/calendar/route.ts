import { NextResponse } from 'next/server'
import { createAdminClient, createClient } from '@/lib/supabase/server'
import { generateICS, type ICSEvent, type ICSCalendar } from '@/lib/calendar/ics'

/**
 * GET /api/v1/events/[slug]/calendar
 *
 * Download an ICS file for the full event schedule.
 * If authenticated, includes user's favorited sessions only (personal schedule).
 * If not authenticated or ?all=true, includes all scheduled sessions.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const { searchParams } = new URL(request.url)
  const includeAll = searchParams.get('all') === 'true'
  const favoritesOnly = searchParams.get('favorites') === 'true'

  const supabase = await createAdminClient()

  // Fetch event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name, timezone, location_name, location_address')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json(
      { error: 'Event not found' },
      { status: 404 }
    )
  }

  // Check if user wants favorites only
  let favoriteSessionIds: Set<string> | null = null
  if (favoritesOnly) {
    // Get user session to fetch favorites
    const userSupabase = await createClient()
    const { data: { user } } = await userSupabase.auth.getUser()

    if (user) {
      const { data: favorites } = await supabase
        .from('favorites')
        .select('session_id')
        .eq('user_id', user.id)
        .eq('event_id', event.id)

      if (favorites) {
        favoriteSessionIds = new Set(favorites.map(f => f.session_id))
      }
    }
  }

  // Fetch all scheduled sessions
  let query = supabase
    .from('sessions')
    .select(`
      id, title, description, host_name, duration,
      venue:venues(name, address),
      time_slot:time_slots(start_time, end_time)
    `)
    .eq('event_id', event.id)
    .eq('status', 'scheduled')
    .not('time_slot_id', 'is', null)
    .order('time_slot_id')

  const { data: sessions, error: sessionsError } = await query

  if (sessionsError) {
    return NextResponse.json(
      { error: 'Failed to fetch sessions' },
      { status: 500 }
    )
  }

  // Filter to favorites if requested
  let filteredSessions = sessions || []
  if (favoriteSessionIds && favoriteSessionIds.size > 0) {
    filteredSessions = filteredSessions.filter(s => favoriteSessionIds!.has(s.id))
  }

  // If no sessions, still return valid ICS
  if (filteredSessions.length === 0) {
    const emptyCalendar: ICSCalendar = {
      name: event.name,
      events: [],
    }
    const ics = generateICS(emptyCalendar)

    return new NextResponse(ics, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(event.name)}-schedule.ics"`,
      },
    })
  }

  // Build ICS events
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://schellingpoint.io'

  // Type helper for Supabase nested selects (they can return single object or array)
  type TimeSlotData = { start_time: string; end_time: string } | null
  type VenueData = { name: string; address?: string } | null

  const icsEvents: ICSEvent[] = []
  for (const session of filteredSessions) {
    const timeSlot = session.time_slot as unknown as TimeSlotData
    const venue = session.venue as unknown as VenueData

    // Skip sessions without valid time slots
    if (!timeSlot?.start_time || !timeSlot?.end_time) {
      continue
    }

    // Build location string
    let location = venue?.name || event.location_name || ''
    if (venue?.address) {
      location += `, ${venue.address}`
    } else if (event.location_address) {
      location += `, ${event.location_address}`
    }

    // Build description
    let description = session.description || ''
    if (session.host_name) {
      description = `Host: ${session.host_name}\n\n${description}`
    }
    const sessionUrl = `${baseUrl}/e/${slug}/sessions/${session.id}`
    description += `\n\nView session: ${sessionUrl}`

    icsEvents.push({
      uid: `session-${session.id}@schellingpoint.io`,
      title: session.title,
      description: description.trim(),
      location,
      startTime: new Date(timeSlot.start_time),
      endTime: new Date(timeSlot.end_time),
      url: sessionUrl,
      organizer: session.host_name || undefined,
    })
  }

  const calendar: ICSCalendar = {
    name: favoritesOnly ? `${event.name} - My Schedule` : event.name,
    events: icsEvents,
  }

  const ics = generateICS(calendar)

  const filename = favoritesOnly
    ? `${event.name}-my-schedule.ics`
    : `${event.name}-schedule.ics`

  return new NextResponse(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
    },
  })
}
