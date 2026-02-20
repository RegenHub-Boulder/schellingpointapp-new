import Stripe from 'stripe'

// Initialize Stripe client
const stripeSecretKey = process.env.STRIPE_SECRET_KEY

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not set - payment features will be disabled')
}

export const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, {
      apiVersion: '2026-01-28.clover',
      typescript: true,
    })
  : null

/**
 * Format price in cents to display string
 */
export function formatPrice(cents: number, currency: string = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

/**
 * Create a Stripe Checkout session for ticket purchase
 */
export async function createCheckoutSession({
  tierId,
  tierName,
  priceCents,
  currency,
  eventId,
  eventSlug,
  eventName,
  userId,
  userEmail,
  stripeAccountId,
  successUrl,
  cancelUrl,
}: {
  tierId: string
  tierName: string
  priceCents: number
  currency: string
  eventId: string
  eventSlug: string
  eventName: string
  userId: string
  userEmail: string
  stripeAccountId?: string | null
  successUrl: string
  cancelUrl: string
}): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price_data: {
        currency: currency,
        product_data: {
          name: tierName,
          description: `Ticket for ${eventName}`,
        },
        unit_amount: priceCents,
      },
      quantity: 1,
    },
  ]

  // Session parameters
  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    payment_method_types: ['card'],
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    customer_email: userEmail,
    metadata: {
      tier_id: tierId,
      event_id: eventId,
      event_slug: eventSlug,
      user_id: userId,
    },
    payment_intent_data: {
      metadata: {
        tier_id: tierId,
        event_id: eventId,
        event_slug: eventSlug,
        user_id: userId,
      },
    },
  }

  // If event has connected Stripe account, use it with application fee
  if (stripeAccountId) {
    // Platform takes 5% + $0.50 fee
    const applicationFee = Math.round(priceCents * 0.05) + 50
    sessionParams.payment_intent_data = {
      ...sessionParams.payment_intent_data,
      application_fee_amount: applicationFee,
      transfer_data: {
        destination: stripeAccountId,
      },
    }
  }

  const session = await stripe.checkout.sessions.create(sessionParams)
  return session
}

/**
 * Retrieve a checkout session by ID
 */
export async function getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session | null> {
  if (!stripe) return null

  try {
    return await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    })
  } catch {
    return null
  }
}

/**
 * Verify Stripe webhook signature
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  if (!stripe) {
    throw new Error('Stripe is not configured')
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret)
}
