import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { getUserFromRequest } from '@/lib/api/getUser'
import { createAdminClient } from '@/lib/supabase/server'
import { buildSessionScheduledEmail } from '@/lib/email/session-scheduled'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: sessionId } = await params

  // 1. Auth: verify user is admin
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 2. Fetch session with host profile, venue, time_slot, track, and event
  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select(`
      id, title, status, host_notified_at, host_id, event_id,
      host:profiles!host_id(email, display_name),
      venue:venues(name, address),
      time_slot:time_slots(start_time, end_time, day_date, label),
      track:tracks(name, color),
      event:events(id, slug, name, start_date, end_date, timezone, location_name)
    `)
    .eq('id', sessionId)
    .single()

  if (sessionError || !session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  // 3. Idempotency: if already notified, return early
  if (session.host_notified_at) {
    return NextResponse.json({ already_notified: true })
  }

  // 4. Guard: must be scheduled
  if (session.status !== 'scheduled') {
    return NextResponse.json(
      { error: 'Session is not scheduled' },
      { status: 400 }
    )
  }

  // 5. Guard: host must have email
  // Supabase FK join may return object or array depending on relationship
  const hostRaw = session.host as unknown
  const host = Array.isArray(hostRaw) ? hostRaw[0] : hostRaw as { email: string; display_name: string | null } | null
  if (!host?.email) {
    return NextResponse.json(
      { error: 'No host email found', skippable: true },
      { status: 400 }
    )
  }

  // 6. Build email
  const venueRaw = session.venue as unknown
  const venue = (Array.isArray(venueRaw) ? venueRaw[0] : venueRaw) as { name: string; address: string | null } | null
  const timeSlotRaw = session.time_slot as unknown
  const timeSlot = (Array.isArray(timeSlotRaw) ? timeSlotRaw[0] : timeSlotRaw) as {
    start_time: string; end_time: string; day_date: string | null; label: string | null
  } | null
  const trackRaw = session.track as unknown
  const track = (Array.isArray(trackRaw) ? trackRaw[0] : trackRaw) as { name: string; color: string | null } | null

  const eventRaw = session.event as unknown
  const event = (Array.isArray(eventRaw) ? eventRaw[0] : eventRaw) as {
    id: string; slug: string; name: string; start_date: string | null; end_date: string | null;
    timezone: string | null; location_name: string | null
  } | null

  // Use event timezone or fallback to UTC
  const eventTimezone = event?.timezone || 'UTC'

  const startDate = timeSlot?.start_time ? new Date(timeSlot.start_time) : null
  const endDate = timeSlot?.end_time ? new Date(timeSlot.end_time) : null

  const dateString = startDate
    ? startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: eventTimezone,
      })
    : 'TBD'

  // Get timezone abbreviation
  const tzAbbr = startDate
    ? startDate.toLocaleTimeString('en-US', { timeZone: eventTimezone, timeZoneName: 'short' }).split(' ').pop()
    : ''

  const timeString = startDate && endDate
    ? `${startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: eventTimezone,
      })} – ${endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: eventTimezone,
      })}${tzAbbr ? ` ${tzAbbr}` : ''}`
    : 'TBD'

  // Build event date range (e.g., "February 13-15, 2026")
  let eventDateRange: string | undefined
  if (event?.start_date && event?.end_date) {
    const eventStart = new Date(event.start_date)
    const eventEnd = new Date(event.end_date)
    const startMonth = eventStart.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
    const endMonth = eventEnd.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
    const startDay = eventStart.getUTCDate()
    const endDay = eventEnd.getUTCDate()
    const year = eventStart.getUTCFullYear()

    if (startMonth === endMonth) {
      eventDateRange = `${startMonth} ${startDay}-${endDay}, ${year}`
    } else {
      eventDateRange = `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://schellingpoint.city'

  // Build session URL using event slug
  const sessionUrl = event?.slug
    ? `${appUrl}/e/${event.slug}/sessions/${session.id}`
    : `${appUrl}/sessions/${session.id}` // Fallback for legacy sessions

  const { subject, html } = buildSessionScheduledEmail({
    sessionTitle: session.title,
    hostName: host.display_name || 'there',
    venueName: venue?.name || 'TBD',
    venueAddress: venue?.address || null,
    dateString,
    timeString,
    trackName: track?.name || null,
    trackColor: track?.color || null,
    sessionUrl,
    eventName: event?.name || 'Schelling Point',
    eventDateRange,
    eventLocation: event?.location_name || undefined,
  })

  // 7. Send via Resend
  // Note: For production, you'd want event-specific from addresses
  // For now, use a generic Schelling Point address with event name in display name
  const fromName = event?.name || 'Schelling Point'
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@schellingpoint.city'

  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: `${fromName} <${fromEmail}>`,
    to: host.email,
    subject,
    html,
  })

  if (sendError) {
    console.error('Resend error:', sendError)
    return NextResponse.json(
      { error: 'Failed to send email', detail: sendError.message },
      { status: 500 }
    )
  }

  // 8. Update host_notified_at (only after successful send)
  await admin
    .from('sessions')
    .update({ host_notified_at: new Date().toISOString() })
    .eq('id', sessionId)

  return NextResponse.json({ sent: true })
}
