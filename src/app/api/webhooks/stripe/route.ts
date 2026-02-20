import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { constructWebhookEvent, stripe } from '@/lib/payments/stripe'
import type Stripe from 'stripe'

// Disable body parsing, we need raw body for signature verification
export const runtime = 'nodejs'

export async function POST(request: Request) {
  if (!stripe) {
    return NextResponse.json(
      { error: 'Stripe is not configured' },
      { status: 500 }
    )
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not set')
    return NextResponse.json(
      { error: 'Webhook secret not configured' },
      { status: 500 }
    )
  }

  try {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json(
        { error: 'Missing signature' },
        { status: 400 }
      )
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = constructWebhookEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        // Get ticket details from metadata
        const tierId = session.metadata?.tier_id
        const eventId = session.metadata?.event_id
        const userId = session.metadata?.user_id
        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : session.payment_intent?.id

        if (!tierId || !eventId || !userId) {
          console.error('Missing metadata in checkout session:', session.id)
          break
        }

        // Find the pending ticket
        const { data: ticket, error: findError } = await supabase
          .from('tickets')
          .select('id')
          .eq('event_id', eventId)
          .eq('tier_id', tierId)
          .eq('user_id', userId)
          .eq('status', 'pending')
          .maybeSingle()

        if (findError) {
          console.error('Error finding ticket:', findError)
          break
        }

        if (!ticket) {
          // Create ticket if not found (webhook may arrive before redirect)
          const { error: createError } = await supabase
            .from('tickets')
            .insert({
              event_id: eventId,
              tier_id: tierId,
              user_id: userId,
              status: 'confirmed',
              payment_intent_id: paymentIntentId,
              amount_paid_cents: session.amount_total,
              payment_confirmed_at: new Date().toISOString(),
            })

          if (createError) {
            console.error('Error creating ticket:', createError)
          }
        } else {
          // Update existing pending ticket
          const { error: updateError } = await supabase
            .from('tickets')
            .update({
              status: 'confirmed',
              payment_intent_id: paymentIntentId,
              amount_paid_cents: session.amount_total,
              payment_confirmed_at: new Date().toISOString(),
            })
            .eq('id', ticket.id)

          if (updateError) {
            console.error('Error updating ticket:', updateError)
          }
        }

        console.log(`Ticket confirmed for user ${userId}, event ${eventId}`)
        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent

        // Find and cancel the pending ticket
        const { error } = await supabase
          .from('tickets')
          .update({ status: 'cancelled' })
          .eq('payment_intent_id', paymentIntent.id)
          .eq('status', 'pending')

        if (error) {
          console.error('Error cancelling ticket:', error)
        }

        console.log(`Payment failed for payment intent ${paymentIntent.id}`)
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const paymentIntentId = typeof charge.payment_intent === 'string'
          ? charge.payment_intent
          : charge.payment_intent?.id

        if (paymentIntentId) {
          // Mark ticket as cancelled on refund
          const { error } = await supabase
            .from('tickets')
            .update({ status: 'cancelled' })
            .eq('payment_intent_id', paymentIntentId)

          if (error) {
            console.error('Error cancelling refunded ticket:', error)
          }

          console.log(`Ticket cancelled due to refund: ${paymentIntentId}`)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
