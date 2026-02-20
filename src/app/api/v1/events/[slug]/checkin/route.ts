import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'
import { verifyTicketToken } from '@/lib/tickets/qr'

interface TicketData {
  id: string
  event_id: string
  user_id: string
  tier_id: string
  status: string
  checked_in_at: string | null
  user: {
    display_name: string | null
    email: string | null
    avatar_url: string | null
  }
  tier: {
    name: string
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Authenticate user (must be volunteer or above)
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { qrToken } = body

    if (!qrToken) {
      return NextResponse.json({ error: 'QR token is required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify user has check-in permission (volunteer, admin, or owner)
    const { data: membership, error: membershipError } = await supabase
      .from('event_members')
      .select('role')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single()

    if (membershipError || !membership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const allowedRoles = ['owner', 'admin', 'volunteer']
    if (!allowedRoles.includes(membership.role)) {
      return NextResponse.json(
        { error: 'You do not have permission to check in attendees' },
        { status: 403 }
      )
    }

    // Verify the QR token
    const tokenPayload = await verifyTicketToken(qrToken)

    if (!tokenPayload) {
      return NextResponse.json(
        {
          error: 'Invalid or expired QR code',
          code: 'INVALID_TOKEN',
        },
        { status: 400 }
      )
    }

    // Verify ticket belongs to this event
    if (tokenPayload.eventId !== event.id) {
      return NextResponse.json(
        {
          error: 'This ticket is for a different event',
          code: 'WRONG_EVENT',
        },
        { status: 400 }
      )
    }

    // Fetch the ticket with user info
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        id,
        event_id,
        user_id,
        tier_id,
        status,
        checked_in_at,
        user:profiles(display_name, email, avatar_url),
        tier:ticket_tiers(name)
      `)
      .eq('id', tokenPayload.ticketId)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json(
        {
          error: 'Ticket not found',
          code: 'TICKET_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // Type assertion for nested data
    const ticketData = ticket as unknown as TicketData

    // Check ticket status
    if (ticketData.status === 'cancelled') {
      return NextResponse.json(
        {
          error: 'This ticket has been cancelled',
          code: 'TICKET_CANCELLED',
          attendee: {
            name: ticketData.user?.display_name || ticketData.user?.email || 'Unknown',
            email: ticketData.user?.email,
            tierName: ticketData.tier?.name,
          },
        },
        { status: 400 }
      )
    }

    if (ticketData.status === 'pending') {
      return NextResponse.json(
        {
          error: 'This ticket payment is still pending',
          code: 'TICKET_PENDING',
          attendee: {
            name: ticketData.user?.display_name || ticketData.user?.email || 'Unknown',
            email: ticketData.user?.email,
            tierName: ticketData.tier?.name,
          },
        },
        { status: 400 }
      )
    }

    if (ticketData.status === 'checked_in') {
      return NextResponse.json(
        {
          error: 'This ticket has already been checked in',
          code: 'ALREADY_CHECKED_IN',
          checkedInAt: ticketData.checked_in_at,
          attendee: {
            name: ticketData.user?.display_name || ticketData.user?.email || 'Unknown',
            email: ticketData.user?.email,
            avatarUrl: ticketData.user?.avatar_url,
            tierName: ticketData.tier?.name,
          },
        },
        { status: 400 }
      )
    }

    // Mark ticket as checked in
    const { error: updateError } = await supabase
      .from('tickets')
      .update({
        status: 'checked_in',
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq('id', ticketData.id)

    if (updateError) {
      console.error('Error updating ticket:', updateError)
      return NextResponse.json(
        { error: 'Failed to check in ticket' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      attendee: {
        name: ticketData.user?.display_name || ticketData.user?.email || 'Unknown',
        email: ticketData.user?.email,
        avatarUrl: ticketData.user?.avatar_url,
        tierName: ticketData.tier?.name,
        ticketId: ticketData.id,
      },
    })
  } catch (error) {
    console.error('Check-in error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Get check-in stats
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params

    // Authenticate user
    const user = await getUserFromRequest(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createAdminClient()

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Verify user has check-in permission
    const { data: membership } = await supabase
      .from('event_members')
      .select('role')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single()

    const allowedRoles = ['owner', 'admin', 'volunteer']
    if (!membership || !allowedRoles.includes(membership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get check-in stats
    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('status')
      .eq('event_id', event.id)
      .in('status', ['confirmed', 'checked_in'])

    if (ticketsError) {
      return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
    }

    const stats = {
      total: tickets?.length || 0,
      checkedIn: tickets?.filter(t => t.status === 'checked_in').length || 0,
      pending: tickets?.filter(t => t.status === 'confirmed').length || 0,
    }

    return NextResponse.json({
      success: true,
      stats,
    })
  } catch (error) {
    console.error('Check-in stats error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
