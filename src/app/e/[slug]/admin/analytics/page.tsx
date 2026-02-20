'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  FileText,
  Users,
  Vote,
  Calendar,
  TrendingUp,
  BarChart3,
  ThumbsUp,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminNav } from '@/components/admin/AdminNav'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

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

interface Session {
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'scheduled'
  total_votes: number
  track_id: string | null
  venue_id: string | null
  time_slot_id: string | null
  format: string
  created_at: string
}

interface Track {
  id: string
  name: string
  color: string | null
}

interface EventMember {
  id: string
  role: string
  joined_at: string
}

interface Vote {
  id: string
  credits_spent: number
  user_id: string
}

interface TimeSlot {
  id: string
  is_break: boolean
  venue_id: string | null
}

interface Venue {
  id: string
  name: string
  capacity: number | null
}

export default function AdminAnalyticsPage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const event = useEvent()
  const { isAdmin, isLoading: roleLoading, can } = useEventRole()

  const [sessions, setSessions] = React.useState<Session[]>([])
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [members, setMembers] = React.useState<EventMember[]>([])
  const [votes, setVotes] = React.useState<Vote[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [venues, setVenues] = React.useState<Venue[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      router.push(`/e/${event.slug}/sessions`)
    }
  }, [user, isAdmin, authLoading, roleLoading, router, event.slug])

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      const token = getAccessToken()
      const authHeader = token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`

      try {
        const [sessionsRes, tracksRes, membersRes, votesRes, timeSlotsRes, venuesRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/sessions?event_id=eq.${event.id}&select=id,status,total_votes,track_id,venue_id,time_slot_id,format,created_at`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/tracks?event_id=eq.${event.id}&select=id,name,color`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/event_members?event_id=eq.${event.id}&select=id,role,joined_at`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/votes?event_id=eq.${event.id}&select=id,credits_spent,user_id`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/time_slots?event_id=eq.${event.id}&select=id,is_break,venue_id`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/venues?event_id=eq.${event.id}&select=id,name,capacity`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
        ])

        if (sessionsRes.ok) setSessions(await sessionsRes.json())
        if (tracksRes.ok) setTracks(await tracksRes.json())
        if (membersRes.ok) setMembers(await membersRes.json())
        if (votesRes.ok) setVotes(await votesRes.json())
        if (timeSlotsRes.ok) setTimeSlots(await timeSlotsRes.json())
        if (venuesRes.ok) setVenues(await venuesRes.json())
      } catch (err) {
        console.error('Error fetching analytics data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [event.id])

  // Calculate stats
  const stats = React.useMemo(() => {
    // Proposal stats
    const totalProposals = sessions.length
    const pendingCount = sessions.filter((s) => s.status === 'pending').length
    const approvedCount = sessions.filter((s) => s.status === 'approved').length
    const rejectedCount = sessions.filter((s) => s.status === 'rejected').length
    const scheduledCount = sessions.filter((s) => s.status === 'scheduled').length
    const approvalRate = totalProposals > 0
      ? Math.round(((approvedCount + scheduledCount) / totalProposals) * 100)
      : 0

    // Track breakdown
    const byTrack = tracks.map((track) => {
      const count = sessions.filter((s) => s.track_id === track.id).length
      return { ...track, count }
    }).sort((a, b) => b.count - a.count)

    const noTrackCount = sessions.filter((s) => !s.track_id).length

    // Format breakdown
    const formatCounts: Record<string, number> = {}
    sessions.forEach((s) => {
      formatCounts[s.format] = (formatCounts[s.format] || 0) + 1
    })
    const byFormat = Object.entries(formatCounts)
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => b.count - a.count)

    // Voting stats
    const totalVotes = votes.length
    const totalCreditsSpent = votes.reduce((sum, v) => sum + v.credits_spent, 0)
    const uniqueVoters = new Set(votes.map((v) => v.user_id)).size
    const participationRate = members.length > 0
      ? Math.round((uniqueVoters / members.length) * 100)
      : 0

    // Vote distribution (histogram buckets)
    const voteBuckets = [
      { label: '0', min: 0, max: 0, count: 0 },
      { label: '1-5', min: 1, max: 5, count: 0 },
      { label: '6-10', min: 6, max: 10, count: 0 },
      { label: '11-20', min: 11, max: 20, count: 0 },
      { label: '21-50', min: 21, max: 50, count: 0 },
      { label: '50+', min: 51, max: Infinity, count: 0 },
    ]
    sessions.forEach((s) => {
      const bucket = voteBuckets.find((b) => s.total_votes >= b.min && s.total_votes <= b.max)
      if (bucket) bucket.count++
    })

    // Top voted sessions
    const topVoted = [...sessions]
      .sort((a, b) => b.total_votes - a.total_votes)
      .slice(0, 5)

    // Member stats
    const totalMembers = members.length
    const byRole: Record<string, number> = {}
    members.forEach((m) => {
      byRole[m.role] = (byRole[m.role] || 0) + 1
    })

    // Schedule stats
    const availableSlots = timeSlots.filter((s) => !s.is_break)
    const scheduledSlots = sessions.filter((s) => s.time_slot_id).length
    const slotUtilization = availableSlots.length > 0
      ? Math.round((scheduledSlots / availableSlots.length) * 100)
      : 0

    // Venue utilization
    const venueStats = venues.map((venue) => {
      const venueSlots = availableSlots.filter((s) => s.venue_id === venue.id)
      const venueSessions = sessions.filter((s) => s.venue_id === venue.id)
      const utilization = venueSlots.length > 0
        ? Math.round((venueSessions.length / venueSlots.length) * 100)
        : 0
      return { ...venue, slots: venueSlots.length, sessions: venueSessions.length, utilization }
    })

    return {
      proposals: {
        total: totalProposals,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        scheduled: scheduledCount,
        approvalRate,
        byTrack,
        noTrackCount,
        byFormat,
      },
      voting: {
        totalVotes,
        totalCreditsSpent,
        uniqueVoters,
        participationRate,
        voteBuckets,
        topVoted,
      },
      members: {
        total: totalMembers,
        byRole,
      },
      schedule: {
        availableSlots: availableSlots.length,
        scheduledSlots,
        slotUtilization,
        venueStats,
      },
    }
  }, [sessions, tracks, members, votes, timeSlots, venues])

  if (authLoading || roleLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        eventSlug={event.slug}
        canManageSchedule={can('manageSchedule')}
        canManageVenues={can('manageVenues')}
      />

      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold">Analytics</h1>
            <p className="text-sm text-muted-foreground">
              Event insights and statistics
            </p>
          </div>

          {/* Overview Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Proposals"
              value={stats.proposals.total}
              icon={<FileText className="h-4 w-4" />}
              description={`${stats.proposals.approvalRate}% approval rate`}
            />
            <StatCard
              title="Total Votes"
              value={stats.voting.totalVotes}
              icon={<ThumbsUp className="h-4 w-4" />}
              description={`${stats.voting.totalCreditsSpent} credits spent`}
            />
            <StatCard
              title="Participants"
              value={stats.members.total}
              icon={<Users className="h-4 w-4" />}
              description={`${stats.voting.participationRate}% voted`}
            />
            <StatCard
              title="Schedule"
              value={`${stats.schedule.slotUtilization}%`}
              icon={<Calendar className="h-4 w-4" />}
              description={`${stats.schedule.scheduledSlots}/${stats.schedule.availableSlots} slots filled`}
            />
          </div>

          {/* Detailed Sections */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Proposal Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Proposal Status
                </CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <StatusBar
                    label="Scheduled"
                    count={stats.proposals.scheduled}
                    total={stats.proposals.total}
                    color="bg-green-500"
                  />
                  <StatusBar
                    label="Approved"
                    count={stats.proposals.approved}
                    total={stats.proposals.total}
                    color="bg-blue-500"
                  />
                  <StatusBar
                    label="Pending"
                    count={stats.proposals.pending}
                    total={stats.proposals.total}
                    color="bg-amber-500"
                  />
                  <StatusBar
                    label="Rejected"
                    count={stats.proposals.rejected}
                    total={stats.proposals.total}
                    color="bg-red-500"
                  />
                </div>
              </CardContent>
            </Card>

            {/* By Track */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  By Track
                </CardTitle>
                <CardDescription>Proposals per track</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.proposals.byTrack.map((track) => (
                    <StatusBar
                      key={track.id}
                      label={track.name}
                      count={track.count}
                      total={stats.proposals.total}
                      color={track.color ? `bg-[${track.color}]` : 'bg-primary'}
                      style={{ backgroundColor: track.color || undefined }}
                    />
                  ))}
                  {stats.proposals.noTrackCount > 0 && (
                    <StatusBar
                      label="No Track"
                      count={stats.proposals.noTrackCount}
                      total={stats.proposals.total}
                      color="bg-muted-foreground"
                    />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vote Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Vote className="h-5 w-5" />
                  Vote Distribution
                </CardTitle>
                <CardDescription>Sessions grouped by vote count</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-32">
                  {stats.voting.voteBuckets.map((bucket) => {
                    const maxCount = Math.max(...stats.voting.voteBuckets.map((b) => b.count))
                    const height = maxCount > 0 ? (bucket.count / maxCount) * 100 : 0
                    return (
                      <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full bg-primary rounded-t transition-all"
                          style={{ height: `${height}%`, minHeight: bucket.count > 0 ? '4px' : '0' }}
                        />
                        <span className="text-[10px] text-muted-foreground">{bucket.label}</span>
                        <span className="text-xs font-medium">{bucket.count}</span>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Voted */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Top Voted Sessions
                </CardTitle>
                <CardDescription>Most popular proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.voting.topVoted.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No sessions with votes yet
                    </p>
                  ) : (
                    stats.voting.topVoted.map((session, index) => (
                      <div key={session.id} className="flex items-center gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            Session #{session.id.slice(0, 8)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium">
                          <ThumbsUp className="h-3 w-3 text-primary" />
                          {session.total_votes}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* By Format */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  By Format
                </CardTitle>
                <CardDescription>Session types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.proposals.byFormat.map((item) => (
                    <StatusBar
                      key={item.format}
                      label={item.format}
                      count={item.count}
                      total={stats.proposals.total}
                      color="bg-primary"
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Venue Utilization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Venue Utilization
                </CardTitle>
                <CardDescription>Sessions per venue</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.schedule.venueStats.map((venue) => (
                    <div key={venue.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{venue.name}</span>
                        <span className="text-muted-foreground">
                          {venue.sessions}/{venue.slots} ({venue.utilization}%)
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            venue.utilization >= 80 ? 'bg-green-500' :
                            venue.utilization >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          )}
                          style={{ width: `${venue.utilization}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Member Roles */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants by Role
                </CardTitle>
                <CardDescription>Event membership breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-4">
                  {Object.entries(stats.members.byRole).map(([role, count]) => (
                    <div
                      key={role}
                      className="flex items-center gap-2 bg-muted rounded-lg px-4 py-2"
                    >
                      <span className="capitalize font-medium">{role}</span>
                      <span className="text-muted-foreground">{count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

// Stat Card Component
function StatCard({
  title,
  value,
  icon,
  description,
}: {
  title: string
  value: string | number
  icon: React.ReactNode
  description: string
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          </div>
          <div className="p-3 bg-primary/10 rounded-full">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Status Bar Component
function StatusBar({
  label,
  count,
  total,
  color,
  style,
}: {
  label: string
  count: number
  total: number
  color: string
  style?: React.CSSProperties
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="capitalize">{label}</span>
        <span className="text-muted-foreground">{count}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${percentage}%`, ...style }}
        />
      </div>
    </div>
  )
}
