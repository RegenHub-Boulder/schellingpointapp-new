'use client'

import * as React from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Ticket, CheckCircle, Clock, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TicketQR } from '@/components/TicketQR'
import { useAuth } from '@/hooks/useAuth'
import { useEvent } from '@/contexts/EventContext'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TicketData {
  id: string
  status: string
  created_at: string
  checked_in_at: string | null
  tier: {
    name: string
    description: string | null
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

const STATUS_CONFIG = {
  pending: {
    label: 'Pending',
    icon: Clock,
    color: 'bg-amber-500',
    description: 'Your payment is being processed',
  },
  confirmed: {
    label: 'Confirmed',
    icon: CheckCircle,
    color: 'bg-green-600',
    description: 'Your ticket is confirmed',
  },
  checked_in: {
    label: 'Checked In',
    icon: CheckCircle,
    color: 'bg-blue-600',
    description: 'You have checked in to the event',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'bg-red-600',
    description: 'This ticket has been cancelled',
  },
}

export default function TicketDetailPage() {
  const router = useRouter()
  const params = useParams()
  const ticketId = params.ticketId as string
  const { user } = useAuth()
  const event = useEvent()

  const [ticket, setTicket] = React.useState<TicketData | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    async function fetchTicket() {
      if (!user) {
        setLoading(false)
        return
      }

      try {
        const token = getAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/tickets?id=eq.${ticketId}&select=id,status,created_at,checked_in_at,tier:ticket_tiers(name,description)`,
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
            created_at: data[0].created_at,
            checked_in_at: data[0].checked_in_at,
            tier: data[0].tier,
          })
        } else {
          setError('Ticket not found')
        }
      } catch (err) {
        console.error('Error fetching ticket:', err)
        setError('Failed to load ticket')
      } finally {
        setLoading(false)
      }
    }

    fetchTicket()
  }, [ticketId, user, router])

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Please Log In</h2>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to view your ticket.
            </p>
            <Button onClick={() => router.push('/login')}>Log In</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-12 text-center">
            <Ticket className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h2 className="text-xl font-semibold mb-2">Ticket Not Found</h2>
            <p className="text-muted-foreground mb-4">
              {error || 'This ticket could not be found.'}
            </p>
            <Button variant="outline" asChild>
              <Link href={`/e/${event.slug}/tickets`}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Tickets
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pending
  const StatusIcon = statusConfig.icon
  const showQR = ticket.status === 'confirmed' || ticket.status === 'checked_in'

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Back link */}
        <Link
          href={`/e/${event.slug}/tickets`}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Tickets
        </Link>

        {/* Ticket Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold">{ticket.tier?.name || 'Event Ticket'}</h1>
                {ticket.tier?.description && (
                  <p className="text-muted-foreground mt-1">{ticket.tier.description}</p>
                )}
              </div>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  {new Date(event.startDate).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                  {event.endDate.getTime() !== event.startDate.getTime() && (
                    <> - {new Date(event.endDate).toLocaleDateString('en-US', {
                      weekday: 'long',
                      month: 'long',
                      day: 'numeric',
                    })}</>
                  )}
                </span>
              </div>

              {event.locationName && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{event.locationName}</span>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground mt-4">
              {statusConfig.description}
            </p>

            {ticket.checked_in_at && (
              <p className="text-sm text-muted-foreground mt-2">
                Checked in: {new Date(ticket.checked_in_at).toLocaleString()}
              </p>
            )}
          </CardContent>
        </Card>

        {/* QR Code */}
        {showQR && (
          <TicketQR
            ticketId={ticket.id}
            eventSlug={event.slug}
            tierName={ticket.tier?.name}
            eventName={event.name}
            size="lg"
          />
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" asChild className="flex-1">
            <Link href={`/e/${event.slug}/sessions`}>
              <Calendar className="h-4 w-4 mr-2" />
              View Schedule
            </Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
