'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Ticket, Check, Clock, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useEvent } from '@/contexts/EventContext'
import { formatPrice } from '@/lib/payments/stripe'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TicketTier {
  id: string
  name: string
  description: string | null
  price_cents: number
  currency: string
  quantity_total: number | null
  quantity_sold: number
  sale_starts_at: string | null
  sale_ends_at: string | null
  is_active: boolean
  allows_proposals: boolean
  allows_voting: boolean
  display_order: number
}

interface UserTicket {
  id: string
  tier_id: string
  status: string
}

function getAccessToken(): string | null {
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
  const stored = localStorage.getItem(storageKey)
  if (stored) {
    try {
      const session = JSON.parse(stored)
      return session?.access_token || null
    } catch {
      return null
    }
  }
  return null
}

export default function TicketsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const event = useEvent()

  const [tiers, setTiers] = React.useState<TicketTier[]>([])
  const [userTickets, setUserTickets] = React.useState<UserTicket[]>([])
  const [loading, setLoading] = React.useState(true)
  const [purchasing, setPurchasing] = React.useState<string | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  // Fetch tiers and user tickets
  React.useEffect(() => {
    async function fetchData() {
      try {
        // Fetch active tiers
        const tiersRes = await fetch(
          `${SUPABASE_URL}/rest/v1/ticket_tiers?event_id=eq.${event.id}&is_active=eq.true&order=display_order.asc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
            },
          }
        )
        const tiersData = await tiersRes.json()
        setTiers(tiersData || [])

        // Fetch user's tickets if logged in
        if (user) {
          const token = getAccessToken()
          if (token) {
            const ticketsRes = await fetch(
              `${SUPABASE_URL}/rest/v1/tickets?event_id=eq.${event.id}&user_id=eq.${user.id}&status=neq.cancelled`,
              {
                headers: {
                  'apikey': SUPABASE_KEY,
                  'Authorization': `Bearer ${token}`,
                },
              }
            )
            const ticketsData = await ticketsRes.json()
            setUserTickets(ticketsData || [])
          }
        }
      } catch (err) {
        console.error('Error fetching ticket data:', err)
        setError('Failed to load ticket information')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [event.id, user])

  const handlePurchase = async (tier: TicketTier) => {
    if (!user) {
      router.push('/login')
      return
    }

    setPurchasing(tier.id)
    setError(null)

    try {
      const token = getAccessToken()
      if (!token) {
        router.push('/login')
        return
      }

      // Create checkout session
      const response = await fetch(`/api/v1/events/${event.slug}/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          tierId: tier.id,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe checkout
      if (data.url) {
        window.location.href = data.url
      } else if (data.ticketId) {
        // Free ticket - redirect to success page
        router.push(`/e/${event.slug}/tickets/success?ticket=${data.ticketId}`)
      }
    } catch (err) {
      console.error('Error creating checkout:', err)
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
    } finally {
      setPurchasing(null)
    }
  }

  const getTierStatus = (tier: TicketTier) => {
    const now = new Date()

    if (tier.sale_starts_at && new Date(tier.sale_starts_at) > now) {
      return { status: 'upcoming', label: 'Coming Soon' }
    }

    if (tier.sale_ends_at && new Date(tier.sale_ends_at) < now) {
      return { status: 'ended', label: 'Sales Ended' }
    }

    if (tier.quantity_total !== null && tier.quantity_sold >= tier.quantity_total) {
      return { status: 'soldout', label: 'Sold Out' }
    }

    return { status: 'available', label: null }
  }

  const userHasTicket = (tierId: string) => {
    return userTickets.some(t => t.tier_id === tierId && t.status !== 'cancelled')
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!event.ticketingEnabled) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Ticketing Not Available</h2>
            <p className="text-muted-foreground">
              Ticket sales are not enabled for this event.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Get Your Ticket</h1>
          <p className="text-muted-foreground">
            Choose the ticket that&apos;s right for you
          </p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
        )}

        {tiers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">No Tickets Available</h2>
              <p className="text-muted-foreground">
                Check back later for ticket sales.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {tiers.map((tier) => {
              const { status, label } = getTierStatus(tier)
              const hasTicket = userHasTicket(tier.id)
              const spotsLeft = tier.quantity_total !== null
                ? tier.quantity_total - tier.quantity_sold
                : null

              return (
                <Card
                  key={tier.id}
                  className={`relative ${status === 'available' ? '' : 'opacity-75'}`}
                >
                  {hasTicket && (
                    <div className="absolute -top-3 -right-3">
                      <Badge className="bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Purchased
                      </Badge>
                    </div>
                  )}

                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{tier.name}</span>
                      {tier.price_cents === 0 ? (
                        <Badge variant="secondary">Free</Badge>
                      ) : (
                        <span className="text-2xl font-bold">
                          {formatPrice(tier.price_cents, tier.currency)}
                        </span>
                      )}
                    </CardTitle>
                    {tier.description && (
                      <CardDescription>{tier.description}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-3">
                    {/* Permissions */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${tier.allows_proposals ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <span className={tier.allows_proposals ? '' : 'text-muted-foreground line-through'}>
                          Propose sessions
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Check className={`h-4 w-4 ${tier.allows_voting ? 'text-green-600' : 'text-muted-foreground'}`} />
                        <span className={tier.allows_voting ? '' : 'text-muted-foreground line-through'}>
                          Vote on sessions
                        </span>
                      </div>
                    </div>

                    {/* Availability */}
                    {spotsLeft !== null && status === 'available' && (
                      <div className="text-sm text-muted-foreground">
                        {spotsLeft <= 10 ? (
                          <span className="text-amber-600 font-medium">
                            Only {spotsLeft} left!
                          </span>
                        ) : (
                          <span>{spotsLeft} available</span>
                        )}
                      </div>
                    )}

                    {status === 'upcoming' && tier.sale_starts_at && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>
                          Sales start {new Date(tier.sale_starts_at).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter>
                    {hasTicket ? (
                      <Button variant="outline" className="w-full" disabled>
                        <Check className="h-4 w-4 mr-2" />
                        Already Purchased
                      </Button>
                    ) : status !== 'available' ? (
                      <Button variant="outline" className="w-full" disabled>
                        {label}
                      </Button>
                    ) : (
                      <Button
                        className="w-full"
                        onClick={() => handlePurchase(tier)}
                        disabled={purchasing !== null}
                      >
                        {purchasing === tier.id ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Processing...
                          </>
                        ) : tier.price_cents === 0 ? (
                          'Get Free Ticket'
                        ) : (
                          'Buy Ticket'
                        )}
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              )
            })}
          </div>
        )}

        {/* User's tickets */}
        {userTickets.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold mb-4">Your Tickets</h2>
            <div className="space-y-4">
              {userTickets.map((ticket) => {
                const tier = tiers.find(t => t.id === ticket.tier_id)
                return (
                  <Card key={ticket.id}>
                    <CardContent className="py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Ticket className="h-5 w-5" />
                        <div>
                          <p className="font-medium">{tier?.name || 'Ticket'}</p>
                          <p className="text-sm text-muted-foreground">
                            Status: {ticket.status}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/e/${event.slug}/tickets/${ticket.id}`)}
                      >
                        View Ticket
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
