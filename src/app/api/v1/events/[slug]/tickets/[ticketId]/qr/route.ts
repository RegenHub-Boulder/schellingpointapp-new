import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'
import { generateTicketToken, generateTicketQRCode } from '@/lib/tickets/qr'

interface Ticket {
  id: string
  event_id: string
  user_id: string
  tier_id: string
  status: string
  qr_code: string | null
  qr_generated_at: string | null
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string; ticketId: string }> }
) {
  try {
    const { slug, ticketId } = await params

    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // Fetch event to verify slug
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Fetch ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id, event_id, user_id, tier_id, status, qr_code, qr_generated_at')
      .eq('id', ticketId)
      .eq('event_id', event.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    const typedTicket = ticket as Ticket

    // Verify ownership (user owns ticket or is admin)
    if (typedTicket.user_id !== user.id) {
      // Check if user is admin
      const { data: membership } = await supabase
        .from('event_members')
        .select('role')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single()

      const isAdmin = membership?.role === 'owner' || membership?.role === 'admin'

      if (!isAdmin) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Only generate QR for confirmed tickets
    if (typedTicket.status !== 'confirmed' && typedTicket.status !== 'checked_in') {
      return NextResponse.json(
        { error: 'QR code only available for confirmed tickets' },
        { status: 400 }
      )
    }

    let qrToken = typedTicket.qr_code

    // Generate QR code if not already generated
    if (!qrToken) {
      qrToken = await generateTicketToken({
        ticketId: typedTicket.id,
        eventId: typedTicket.event_id,
        userId: typedTicket.user_id,
        tierId: typedTicket.tier_id,
      })

      // Store the QR code token
      await supabase
        .from('tickets')
        .update({
          qr_code: qrToken,
          qr_generated_at: new Date().toISOString(),
        })
        .eq('id', ticketId)
    }

    // Generate QR code image
    const qrDataUrl = await generateTicketQRCode(qrToken)

    return NextResponse.json({
      success: true,
      qrDataUrl,
      ticketId: typedTicket.id,
    })
  } catch (error) {
    console.error('Error generating QR code:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
