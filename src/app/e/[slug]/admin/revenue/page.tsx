'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  DollarSign,
  Ticket,
  Users,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Download,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AdminNav } from '@/components/admin/AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { formatPrice } from '@/lib/payments/stripe'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TicketTier {
  id: string
  name: string
  price_cents: number
  currency: string
  quantity_total: number | null
  quantity_sold: number
}

interface Ticket {
  id: string
  tier_id: string
  status: string
  amount_paid_cents: number | null
  created_at: string
  payment_confirmed_at: string | null
}

interface RevenueStats {
  totalRevenue: number
  totalTickets: number
  confirmedTickets: number
  pendingTickets: number
  checkedIn: number
  currency: string
  tierBreakdown: {
    tierId: string
    tierName: string
    sold: number
    revenue: number
    capacity: number | null
  }[]
  dailySales: {
    date: string
    tickets: number
    revenue: number
  }[]
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

export default function RevenueDashboardPage() {
  const router = useRouter()
  const { user } = useAuth()
  const event = useEvent()
  const { isAdmin, isOwner } = useEventRole()

  const [stats, setStats] = React.useState<RevenueStats | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  // Only owners and admins can view revenue
  const canViewRevenue = isOwner || isAdmin

  React.useEffect(() => {
    async function fetchData() {
      if (!canViewRevenue || !user) {
        setLoading(false)
        return
      }

      try {
        const token = getAccessToken()
        if (!token) {
          router.push('/login')
          return
        }

        // Fetch tiers
        const tiersRes = await fetch(
          `${SUPABASE_URL}/rest/v1/ticket_tiers?event_id=eq.${event.id}&order=display_order.asc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )
        const tiers: TicketTier[] = await tiersRes.json()

        // Fetch tickets
        const ticketsRes = await fetch(
          `${SUPABASE_URL}/rest/v1/tickets?event_id=eq.${event.id}&order=created_at.asc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )
        const tickets: Ticket[] = await ticketsRes.json()

        // Calculate stats
        const confirmedTickets = tickets.filter(t => t.status === 'confirmed' || t.status === 'checked_in')
        const pendingTickets = tickets.filter(t => t.status === 'pending')
        const checkedInTickets = tickets.filter(t => t.status === 'checked_in')

        const totalRevenue = confirmedTickets.reduce((sum, t) => sum + (t.amount_paid_cents || 0), 0)

        // Tier breakdown
        const tierBreakdown = tiers.map(tier => {
          const tierTickets = confirmedTickets.filter(t => t.tier_id === tier.id)
          return {
            tierId: tier.id,
            tierName: tier.name,
            sold: tierTickets.length,
            revenue: tierTickets.reduce((sum, t) => sum + (t.amount_paid_cents || 0), 0),
            capacity: tier.quantity_total,
          }
        })

        // Daily sales (last 30 days)
        const dailySalesMap = new Map<string, { tickets: number; revenue: number }>()
        const thirtyDaysAgo = new Date()
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

        confirmedTickets.forEach(ticket => {
          const date = ticket.payment_confirmed_at || ticket.created_at
          if (new Date(date) >= thirtyDaysAgo) {
            const dateKey = new Date(date).toISOString().split('T')[0]
            const existing = dailySalesMap.get(dateKey) || { tickets: 0, revenue: 0 }
            dailySalesMap.set(dateKey, {
              tickets: existing.tickets + 1,
              revenue: existing.revenue + (ticket.amount_paid_cents || 0),
            })
          }
        })

        // Fill in missing days
        const dailySales: { date: string; tickets: number; revenue: number }[] = []
        const current = new Date(thirtyDaysAgo)
        const today = new Date()
        while (current <= today) {
          const dateKey = current.toISOString().split('T')[0]
          const data = dailySalesMap.get(dateKey) || { tickets: 0, revenue: 0 }
          dailySales.push({
            date: dateKey,
            tickets: data.tickets,
            revenue: data.revenue,
          })
          current.setDate(current.getDate() + 1)
        }

        setStats({
          totalRevenue,
          totalTickets: tickets.length,
          confirmedTickets: confirmedTickets.length,
          pendingTickets: pendingTickets.length,
          checkedIn: checkedInTickets.length,
          currency: tiers[0]?.currency || 'usd',
          tierBreakdown,
          dailySales,
        })
      } catch (err) {
        console.error('Error fetching revenue data:', err)
        setError('Failed to load revenue data')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [canViewRevenue, event.id, user, router])

  if (!canViewRevenue) {
    return (
      <>
        <AdminNav eventSlug={event.slug} canManageSchedule={false} canManageVenues={false} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <DollarSign className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                Only event owners and admins can view revenue data.
              </p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <>
        <AdminNav eventSlug={event.slug} canManageSchedule={false} canManageVenues={false} />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </>
    )
  }

  if (error || !stats) {
    return (
      <>
        <AdminNav eventSlug={event.slug} canManageSchedule={false} canManageVenues={false} />
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-xl font-semibold mb-2">Error Loading Data</h2>
              <p className="text-muted-foreground">{error || 'Failed to load revenue data'}</p>
            </CardContent>
          </Card>
        </div>
      </>
    )
  }

  // Calculate comparison (week over week)
  const lastWeekRevenue = stats.dailySales
    .slice(-14, -7)
    .reduce((sum, day) => sum + day.revenue, 0)
  const thisWeekRevenue = stats.dailySales
    .slice(-7)
    .reduce((sum, day) => sum + day.revenue, 0)
  const revenueChange = lastWeekRevenue > 0
    ? ((thisWeekRevenue - lastWeekRevenue) / lastWeekRevenue) * 100
    : thisWeekRevenue > 0 ? 100 : 0

  return (
    <>
      <AdminNav eventSlug={event.slug} canManageSchedule={isAdmin} canManageVenues={isAdmin} />

      <div className="container mx-auto px-4 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Revenue Dashboard</h1>
            <p className="text-muted-foreground">Track ticket sales and revenue</p>
          </div>
          <Button variant="outline" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPrice(stats.totalRevenue, stats.currency)}
              </div>
              <p className="text-xs text-muted-foreground flex items-center">
                {revenueChange >= 0 ? (
                  <>
                    <ArrowUpRight className="h-3 w-3 text-green-600 mr-1" />
                    <span className="text-green-600">+{revenueChange.toFixed(1)}%</span>
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-600 mr-1" />
                    <span className="text-red-600">{revenueChange.toFixed(1)}%</span>
                  </>
                )}
                <span className="ml-1">vs last week</span>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tickets Sold</CardTitle>
              <Ticket className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.confirmedTickets}</div>
              <p className="text-xs text-muted-foreground">
                {stats.pendingTickets > 0 && `${stats.pendingTickets} pending`}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Check-Ins</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.checkedIn}</div>
              <p className="text-xs text-muted-foreground">
                {stats.confirmedTickets > 0 && (
                  `${((stats.checkedIn / stats.confirmedTickets) * 100).toFixed(0)}% attendance`
                )}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Ticket Price</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.confirmedTickets > 0
                  ? formatPrice(Math.round(stats.totalRevenue / stats.confirmedTickets), stats.currency)
                  : formatPrice(0, stats.currency)
                }
              </div>
              <p className="text-xs text-muted-foreground">per ticket</p>
            </CardContent>
          </Card>
        </div>

        {/* Tier Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Sales by Tier</CardTitle>
            <CardDescription>Breakdown of tickets sold per tier</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.tierBreakdown.map((tier) => {
                const percentage = tier.capacity
                  ? (tier.sold / tier.capacity) * 100
                  : 100

                return (
                  <div key={tier.tierId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{tier.tierName}</span>
                        <Badge variant="secondary">
                          {tier.sold}{tier.capacity ? `/${tier.capacity}` : ''} sold
                        </Badge>
                      </div>
                      <span className="font-semibold">
                        {formatPrice(tier.revenue, stats.currency)}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                )
              })}

              {stats.tierBreakdown.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  No ticket tiers configured yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sales Chart (Simplified) */}
        <Card>
          <CardHeader>
            <CardTitle>Sales Over Time</CardTitle>
            <CardDescription>Last 30 days of ticket sales</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-end gap-1">
              {stats.dailySales.slice(-30).map((day, index) => {
                const maxRevenue = Math.max(...stats.dailySales.map(d => d.revenue), 1)
                const height = (day.revenue / maxRevenue) * 100

                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 transition-colors rounded-t cursor-pointer relative group"
                    style={{ height: `${Math.max(2, height)}%` }}
                    title={`${day.date}: ${day.tickets} tickets, ${formatPrice(day.revenue, stats.currency)}`}
                  >
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-popover text-popover-foreground text-xs p-2 rounded shadow-lg whitespace-nowrap">
                        <p className="font-medium">{new Date(day.date).toLocaleDateString()}</p>
                        <p>{day.tickets} tickets</p>
                        <p>{formatPrice(day.revenue, stats.currency)}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{stats.dailySales[0]?.date}</span>
              <span>{stats.dailySales[stats.dailySales.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
