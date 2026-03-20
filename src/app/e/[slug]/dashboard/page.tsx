'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  Presentation,
  Calendar,
  Vote,
  Heart,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { votesToCredits } from '@/lib/utils'

import { createClient } from '@/lib/supabase/client'

interface DashboardStats {
  totalSessions: number
  scheduledSessions: number
  pendingSessions: number
  totalVotes: number
  totalParticipants: number
}

export default function DashboardPage() {
  const { user } = useAuth()
  const event = useEvent()
  const { voteCredits, isMember, isAdmin } = useEventRole()
  const supabase = React.useMemo(() => createClient(), [])

  const [stats, setStats] = React.useState<DashboardStats | null>(null)
  const [userVotes, setUserVotes] = React.useState<Record<string, number>>({})
  const [userFavorites, setUserFavorites] = React.useState<number>(0)
  const [recentSessions, setRecentSessions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  // Calculate user's credits spent
  const creditsSpent = React.useMemo(() => {
    return Object.values(userVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [userVotes])

  const creditsRemaining = voteCredits - creditsSpent

  // Fetch dashboard data
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch stats
        const [{ data: sessions }, { count: participantsCount }] = await Promise.all([
          supabase
            .from('sessions')
            .select('id,status,total_votes')
            .eq('event_id', event.id),
          supabase
            .from('event_members')
            .select('id', { count: 'exact', head: true })
            .eq('event_id', event.id)
        ])

        if (sessions) {
          const scheduled = sessions.filter((s: any) => s.status === 'scheduled').length
          const pending = sessions.filter((s: any) => s.status === 'pending').length
          const totalVotes = sessions.reduce((sum: number, s: any) => sum + (s.total_votes || 0), 0)

          setStats({
            totalSessions: sessions.length,
            scheduledSessions: scheduled,
            pendingSessions: pending,
            totalVotes,
            totalParticipants: participantsCount || 0,
          })
        }

        // Fetch recent sessions
        const { data: recent } = await supabase
          .from('sessions')
          .select('id,title,host_name,total_votes,status,track:tracks(name,color)')
          .eq('event_id', event.id)
          .in('status', ['approved', 'scheduled'])
          .order('created_at', { ascending: false })
          .limit(5)

        if (recent) {
          setRecentSessions(recent)
        }

        // Fetch user-specific data if logged in
        if (user) {
          const [{ data: votes }, { count: favsCount }] = await Promise.all([
            supabase
              .from('votes')
              .select('session_id,vote_count')
              .eq('user_id', user.id)
              .eq('event_id', event.id),
            supabase
              .from('favorites')
              .select('id', { count: 'exact', head: true })
              .eq('user_id', user.id)
              .eq('event_id', event.id)
          ])

          if (votes) {
            const votesMap: Record<string, number> = {}
            votes.forEach((v: any) => {
              votesMap[v.session_id] = v.vote_count
            })
            setUserVotes(votesMap)
          }

          if (favsCount !== null) {
            setUserFavorites(favsCount)
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [event.id, user, supabase])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Overview of {event.name}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
              <Presentation className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalSessions || 0}</div>
              <p className="text-xs text-muted-foreground">
                {stats?.scheduledSessions || 0} scheduled
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Votes</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalVotes || 0}</div>
              <p className="text-xs text-muted-foreground">
                Across all sessions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Participants</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.totalParticipants || 0}</div>
              <p className="text-xs text-muted-foreground">
                Registered attendees
              </p>
            </CardContent>
          </Card>

          {user && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Your Credits</CardTitle>
                <Vote className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{creditsRemaining}</div>
                <p className="text-xs text-muted-foreground">
                  {creditsSpent} of {voteCredits} spent
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        {user && isMember && (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="hover:bg-muted/50 transition-colors">
              <Link href={`/e/${event.slug}/sessions`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Vote className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Vote on Sessions</h3>
                      <p className="text-sm text-muted-foreground">
                        {creditsRemaining} credits remaining
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors">
              <Link href={`/e/${event.slug}/my-schedule`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">My Schedule</h3>
                      <p className="text-sm text-muted-foreground">
                        {userFavorites} sessions saved
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:bg-muted/50 transition-colors">
              <Link href={`/e/${event.slug}/propose`}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <Presentation className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Propose Session</h3>
                      <p className="text-sm text-muted-foreground">
                        Share your knowledge
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          </div>
        )}

        {/* Admin Quick Stats */}
        {isAdmin && stats?.pendingSessions && stats.pendingSessions > 0 && (
          <Card className="border-orange-500/30 bg-orange-500/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-orange-500/10">
                    <Clock className="h-6 w-6 text-orange-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Pending Approval</h3>
                    <p className="text-sm text-muted-foreground">
                      {stats.pendingSessions} sessions awaiting review
                    </p>
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/e/${event.slug}/admin`}>Review</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Sessions */}
        {recentSessions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/e/${event.slug}/sessions/${session.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {session.status === 'scheduled' ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : (
                        <Vote className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="font-medium truncate">{session.title}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          by {session.host_name}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {session.track && (
                        <Badge variant="outline" className="hidden sm:inline-flex">
                          {session.track.name}
                        </Badge>
                      )}
                      <span className="text-sm font-medium">
                        {session.total_votes} votes
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full" asChild>
                  <Link href={`/e/${event.slug}/sessions`}>View All Sessions</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
