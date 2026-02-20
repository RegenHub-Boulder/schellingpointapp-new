'use client'

import * as React from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CheckCircle, Ticket, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useEvent } from '@/contexts/EventContext'
import { useAuth } from '@/hooks/useAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TicketDetails {
  id: string
  status: string
  tier: {
    name: string
  }
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

export default function TicketSuccessPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const event = useEvent()
  const { user } = useAuth()

  const [ticket, setTicket] = React.useState<TicketDetails | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const ticketId = searchParams.get('ticket')

  React.useEffect(() => {
    async function fetchTicket() {
      if (!ticketId || !user) {
        setLoading(false)
        return
      }

      try {
        const token = getAccessToken()
        if (!token) {
          setError('Please log in to view your ticket')
          setLoading(false)
          return
        }

        // Fetch ticket with tier info
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketId}&select=id,status,tier:ticket_tiers(name)`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        const data = await response.json()

        if (data && data.length > 0) {
          setTicket({
            id: data[0].id,
            status: data[0].status,
            tier: data[0].tier,
          })
        } else {
          // Ticket might still be processing, show generic success
          setTicket(null)
        }
      } catch (err) {
        console.error('Error fetching ticket:', err)
        setError('Failed to load ticket details')
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [ticketId, user])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto">
        <Card>
          <CardHeader className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <CardTitle className="text-2xl">You&apos;re In!</CardTitle>
            <CardDescription>
              Your ticket for {event.name} has been confirmed.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {error ? (
              <p className="text-sm text-muted-foreground text-center">{error}</p>
            ) : ticket ? (
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Ticket className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{ticket.tier?.name || 'Ticket'}</p>
                    <p className="text-sm text-muted-foreground">
                      Status: {ticket.status === 'confirmed' ? 'Confirmed' : ticket.status}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-muted rounded-lg p-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Your ticket is being processed. You&apos;ll receive a confirmation email shortly.
                </p>
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-medium">What&apos;s Next?</h3>

              <div className="space-y-2">
                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Check your email</p>
                    <p className="text-muted-foreground">
                      We&apos;ve sent your ticket confirmation with QR code.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Browse the schedule</p>
                    <p className="text-muted-foreground">
                      See what sessions are planned and add them to your calendar.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 text-sm">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-medium">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Propose a session</p>
                    <p className="text-muted-foreground">
                      Share your expertise by proposing a session of your own!
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button asChild className="flex-1">
                <Link href={`/e/${event.slug}/sessions`}>
                  <Calendar className="h-4 w-4 mr-2" />
                  View Schedule
                </Link>
              </Button>
              <Button variant="outline" asChild className="flex-1">
                <Link href={`/e/${event.slug}/propose`}>
                  Propose Session
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>

            {ticketId && (
              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => router.push(`/e/${event.slug}/tickets/${ticketId}`)}
                >
                  View Your Ticket
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
