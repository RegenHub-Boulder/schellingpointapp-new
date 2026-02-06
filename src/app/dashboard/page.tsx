'use client'

import * as React from 'react'
import Link from 'next/link'
import {
  TrendingUp,
  Clock,
  Users,
  Vote,
  Sparkles,
  Calendar,
  ArrowRight,
  Loader2,
  Heart,
  Zap,
  Mic,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { votesToCredits } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const TOTAL_CREDITS = 100

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

export default function DashboardPage() {
  const { user, profile } = useAuth()

  const [sessions, setSessions] = React.useState<any[]>([])
  const [userVotes, setUserVotes] = React.useState<Record<string, number>>({})
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(true)
  const [stats, setStats] = React.useState({
    totalSessions: 0,
    totalVotes: 0,
    totalVoters: 0,
    scheduledSessions: 0,
  })

  // Calculate credits spent
  const creditsSpent = React.useMemo(() => {
    return Object.values(userVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [userVotes])

  // Fetch data on mount
  React.useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all approved/scheduled sessions
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/sessions?status=in.(approved,scheduled)&select=*&order=created_at.desc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          setSessions(data)

          // Calculate stats
          const totalVotes = data.reduce((sum: number, s: any) => sum + (s.total_votes || 0), 0)
          const totalVoters = data.reduce((sum: number, s: any) => sum + (s.voter_count || 0), 0)
          const scheduled = data.filter((s: any) => s.status === 'scheduled').length

          setStats({
            totalSessions: data.length,
            totalVotes,
            totalVoters,
            scheduledSessions: scheduled,
          })
        }
      } catch (err) {
        console.error('Error fetching sessions:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Fetch user data
  React.useEffect(() => {
    if (!user) return

    const fetchUserData = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        // Fetch votes
        const votesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&select=session_id,vote_count`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (votesResponse.ok) {
          const votesData = await votesResponse.json()
          const votesMap: Record<string, number> = {}
          votesData.forEach((v: any) => {
            votesMap[v.session_id] = v.vote_count
          })
          setUserVotes(votesMap)
        }

        // Fetch favorites
        const favResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&select=session_id`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (favResponse.ok) {
          const favData = await favResponse.json()
          setFavorites(new Set(favData.map((f: any) => f.session_id)))
        }
      } catch (err) {
        console.error('Error fetching user data:', err)
      }
    }

    fetchUserData()
  }, [user])

  // Get top sessions by votes
  const topSessions = React.useMemo(() => {
    return [...sessions]
      .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
      .slice(0, 15)
  }, [sessions])

  // Get recently proposed sessions
  const recentSessions = React.useMemo(() => {
    return [...sessions]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 15)
  }, [sessions])

  // Get sessions user voted for
  const userVotedSessions = React.useMemo(() => {
    const votedIds = Object.keys(userVotes)
    return sessions
      .filter(s => votedIds.includes(s.id))
      .sort((a, b) => (userVotes[b.id] || 0) - (userVotes[a.id] || 0))
      .slice(0, 5)
  }, [sessions, userVotes])

  // Get sessions user proposed (hosted)
  const userProposedSessions = React.useMemo(() => {
    if (!user) return []
    return sessions
      .filter(s => s.host_id === user.id)
      .sort((a, b) => (b.total_votes || 0) - (a.total_votes || 0))
  }, [sessions, user])

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
      <div className="space-y-8">
        {/* Welcome Header */}
        <div>
          <h1 className="text-2xl font-bold">
            {user ? `Welcome back, ${profile?.display_name || user.email?.split('@')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Overview of the unconference voting activity
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-primary/10 w-fit">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalSessions}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Sessions</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-green-500/10 w-fit">
                  <Vote className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalVotes}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Votes</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-blue-500/10 w-fit">
                  <Users className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalVoters}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Voters</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 rounded-full bg-purple-500/10 w-fit">
                  <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold">{stats.scheduledSessions}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground">Scheduled</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Stats (if logged in) */}
        {user && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Your Voting Activity
                </h3>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/my-votes">View Details</Link>
                </Button>
              </div>
              <div className="grid gap-6 md:grid-cols-4">
                <div>
                  <p className="text-3xl font-bold text-primary">{Object.keys(userVotes).length}</p>
                  <p className="text-sm text-muted-foreground">Sessions Voted</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {Object.values(userVotes).reduce((sum, v) => sum + v, 0)}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Votes Cast</p>
                </div>
                <div>
                  <p className="text-3xl font-bold">{creditsSpent}</p>
                  <p className="text-sm text-muted-foreground">Credits Used</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-green-500">{TOTAL_CREDITS - creditsSpent}</p>
                  <p className="text-sm text-muted-foreground">Credits Remaining</p>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">Credit Usage</span>
                  <span className="font-medium">{creditsSpent}/{TOTAL_CREDITS}</span>
                </div>
                <Progress value={(creditsSpent / TOTAL_CREDITS) * 100} className="h-2" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Sessions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Top Sessions
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sessions?sort=votes" className="text-muted-foreground">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {topSessions.map((session, index) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className={`
                      w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                      ${index === 0 ? 'bg-yellow-500/20 text-yellow-600' : ''}
                      ${index === 1 ? 'bg-gray-300/20 text-gray-500' : ''}
                      ${index === 2 ? 'bg-orange-500/20 text-orange-600' : ''}
                      ${index > 2 ? 'bg-muted text-muted-foreground' : ''}
                    `}>
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {session.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.host_name || 'Anonymous'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{session.total_votes || 0}</p>
                      <p className="text-xs text-muted-foreground">votes</p>
                    </div>
                  </Link>
                ))}
                {topSessions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No sessions yet</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Sessions */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recently Proposed
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sessions?sort=recent" className="text-muted-foreground">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {recentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate group-hover:text-primary transition-colors">
                        {session.title}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{session.host_name || 'Anonymous'}</span>
                        <span>•</span>
                        <span>{new Date(session.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {session.format}
                    </Badge>
                  </Link>
                ))}
                {recentSessions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No sessions yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User's Proposed Sessions */}
        {user && userProposedSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Mic className="h-5 w-5 text-primary" />
                  My Sessions
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/sessions" className="text-muted-foreground">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {userProposedSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {session.title}
                      </p>
                      <Badge variant="secondary" className="capitalize text-xs flex-shrink-0">
                        {session.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total votes</span>
                      <span className="font-semibold text-primary">{session.total_votes || 0}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* User's Voted Sessions */}
        {user && userVotedSessions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-red-500" />
                  Sessions You're Supporting
                </CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/my-votes" className="text-muted-foreground">
                    View All <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {userVotedSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="font-medium line-clamp-2 group-hover:text-primary transition-colors">
                        {session.title}
                      </p>
                      {favorites.has(session.id) && (
                        <Heart className="h-4 w-4 text-red-500 fill-current flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Your votes</span>
                      <span className="font-semibold text-primary">{userVotes[session.id]}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA for non-logged in users */}
        {!user && (
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Join the Unconference</h3>
              <p className="text-muted-foreground mb-4">
                Sign in to vote on sessions and help shape the schedule
              </p>
              <Button asChild>
                <Link href="/login">Sign In to Vote</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
