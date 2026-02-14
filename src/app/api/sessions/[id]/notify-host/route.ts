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

  // 2. Fetch session with host profile, venue, time_slot, track
  const { data: session, error: sessionError } = await admin
    .from('sessions')
    .select(`
      id, title, status, host_notified_at, host_id,
      host:profiles!host_id(email, display_name),
      venue:venues(name, address),
      time_slot:time_slots(start_time, end_time, day_date, label),
      track:tracks(name, color)
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
      { error: 'No host email found' },
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

  const startDate = timeSlot?.start_time ? new Date(timeSlot.start_time) : null
  const endDate = timeSlot?.end_time ? new Date(timeSlot.end_time) : null

  const dateString = startDate
    ? startDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'America/Denver',
      })
    : 'TBD'

  const timeString = startDate && endDate
    ? `${startDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver',
      })} – ${endDate.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/Denver',
      })} MST`
    : 'TBD'

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://app.ethboulder.xyz'

  const { subject, html } = buildSessionScheduledEmail({
    sessionTitle: session.title,
    hostName: host.display_name || 'there',
    venueName: venue?.name || 'TBD',
    venueAddress: venue?.address || null,
    dateString,
    timeString,
    trackName: track?.name || null,
    trackColor: track?.color || null,
    sessionUrl: `${appUrl}/sessions/${session.id}`,
  })

  // 7. Send via Resend
  const resend = new Resend(process.env.RESEND_API_KEY)
  const { error: sendError } = await resend.emails.send({
    from: 'EthBoulder <hello@ethboulder.xyz>',
    to: host.email,
    subject,
    html,
  })

  if (sendError) {
    console.error('Resend error:', sendError)
    return NextResponse.json(
      { error: 'Failed to send email' },
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
