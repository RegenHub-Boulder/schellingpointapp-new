import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'
import { createCheckoutSession, stripe } from '@/lib/payments/stripe'

interface TicketTier {
  id: string
  name: string
  price_cents: number
  currency: string
  quantity_total: number | null
  quantity_sold: number
  sale_starts_at: string | null
  sale_ends_at: string | null
  is_active: boolean
  allows_proposals: boolean
  allows_voting: boolean
  vote_credits_override: number | null
}

interface Event {
  id: string
  slug: string
  name: string
  ticketing_enabled: boolean
  stripe_account_id: string | null
}

export async function POST(
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

    // Parse request body
    const body = await request.json()
    const { tierId } = body

    if (!tierId) {
      return NextResponse.json({ error: 'Tier ID is required' }, { status: 400 })
    }

    const supabase = await createAdminClient()

    // Fetch event
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('id, slug, name, ticketing_enabled, stripe_account_id')
      .eq('slug', slug)
      .single()

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const typedEvent = event as Event

    if (!typedEvent.ticketing_enabled) {
      return NextResponse.json({ error: 'Ticketing is not enabled for this event' }, { status: 400 })
    }

    // Fetch tier
    const { data: tier, error: tierError } = await supabase
      .from('ticket_tiers')
      .select('*')
      .eq('id', tierId)
      .eq('event_id', typedEvent.id)
      .single()

    if (tierError || !tier) {
      return NextResponse.json({ error: 'Ticket tier not found' }, { status: 404 })
    }

    const typedTier = tier as TicketTier

    // Validate tier is available
    const now = new Date()

    if (!typedTier.is_active) {
      return NextResponse.json({ error: 'This ticket tier is not available' }, { status: 400 })
    }

    if (typedTier.sale_starts_at && new Date(typedTier.sale_starts_at) > now) {
      return NextResponse.json({ error: 'Ticket sales have not started yet' }, { status: 400 })
    }

    if (typedTier.sale_ends_at && new Date(typedTier.sale_ends_at) < now) {
      return NextResponse.json({ error: 'Ticket sales have ended' }, { status: 400 })
    }

    if (typedTier.quantity_total !== null && typedTier.quantity_sold >= typedTier.quantity_total) {
      return NextResponse.json({ error: 'This ticket tier is sold out' }, { status: 400 })
    }

    // Check if user already has a ticket for this event (optional - allow multiple)
    const { data: existingTicket } = await supabase
      .from('tickets')
      .select('id')
      .eq('event_id', typedEvent.id)
      .eq('user_id', user.id)
      .eq('tier_id', tierId)
      .in('status', ['pending', 'confirmed'])
      .maybeSingle()

    if (existingTicket) {
      return NextResponse.json({ error: 'You already have a ticket for this tier' }, { status: 400 })
    }

    // Fetch user email
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    const userEmail = profile?.email || user.email || ''

    // Handle free tickets
    if (typedTier.price_cents === 0) {
      // Create ticket directly
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          event_id: typedEvent.id,
          tier_id: typedTier.id,
          user_id: user.id,
          status: 'confirmed',
          amount_paid_cents: 0,
          payment_confirmed_at: new Date().toISOString(),
        })
        .select('id')
        .single()

      if (ticketError) {
        console.error('Error creating free ticket:', ticketError)
        return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        ticketId: ticket.id,
        message: 'Free ticket created successfully',
      })
    }

    // Check Stripe is configured
    if (!stripe) {
      return NextResponse.json(
        { error: 'Payment processing is not configured' },
        { status: 500 }
      )
    }

    // Create pending ticket
    const { data: pendingTicket, error: pendingError } = await supabase
      .from('tickets')
      .insert({
        event_id: typedEvent.id,
        tier_id: typedTier.id,
        user_id: user.id,
        status: 'pending',
      })
      .select('id')
      .single()

    if (pendingError) {
      console.error('Error creating pending ticket:', pendingError)
      return NextResponse.json({ error: 'Failed to initiate checkout' }, { status: 500 })
    }

    // Build URLs
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const successUrl = `${origin}/e/${slug}/tickets/success?session_id={CHECKOUT_SESSION_ID}&ticket=${pendingTicket.id}`
    const cancelUrl = `${origin}/e/${slug}/tickets?cancelled=true`

    // Create Stripe checkout session
    const session = await createCheckoutSession({
      tierId: typedTier.id,
      tierName: typedTier.name,
      priceCents: typedTier.price_cents,
      currency: typedTier.currency,
      eventId: typedEvent.id,
      eventSlug: typedEvent.slug,
      eventName: typedEvent.name,
      userId: user.id,
      userEmail,
      stripeAccountId: typedEvent.stripe_account_id,
      successUrl,
      cancelUrl,
    })

    if (!session) {
      // Clean up pending ticket
      await supabase.from('tickets').delete().eq('id', pendingTicket.id)
      return NextResponse.json({ error: 'Failed to create checkout session' }, { status: 500 })
    }

    // Update ticket with payment intent
    await supabase
      .from('tickets')
      .update({ payment_intent_id: session.payment_intent as string })
      .eq('id', pendingTicket.id)

    return NextResponse.json({
      success: true,
      url: session.url,
      sessionId: session.id,
    })
  } catch (error) {
    console.error('Checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
