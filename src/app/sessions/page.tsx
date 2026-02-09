'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Search, SlidersHorizontal, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SessionCard } from '@/components/SessionCard'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { votesToCredits, cn } from '@/lib/utils'

const TOTAL_CREDITS = 100
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const formats = ['all', 'talk', 'workshop', 'discussion', 'panel', 'demo']
const sortOptions = [
  { value: 'votes', label: 'Most Voted' },
  { value: 'recent', label: 'Recent' },
  { value: 'alpha', label: 'A-Z' },
]

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

export default function SessionsPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading, signOut } = useAuth()

  const [sessions, setSessions] = React.useState<any[]>([])
  const [userVotes, setUserVotes] = React.useState<Record<string, number>>({})
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('all')
  const [sort, setSort] = React.useState('votes')
  const [showFilters, setShowFilters] = React.useState(false)

  // Calculate credits spent
  const creditsSpent = React.useMemo(() => {
    return Object.values(userVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [userVotes])

  const creditsRemaining = TOTAL_CREDITS - creditsSpent

  // Fetch sessions on mount
  React.useEffect(() => {
    let mounted = true

    const fetchSessions = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/sessions?status=in.(approved,scheduled)&select=*,venue:venues(name),time_slot:time_slots(label,start_time)&order=total_votes.desc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok && mounted) {
          const data = await response.json()
          setSessions(data)
        }
      } catch (err) {
        console.error('Error fetching sessions:', err)
      } finally {
        if (mounted) {
          setIsLoading(false)
        }
      }
    }

    fetchSessions()

    return () => {
      mounted = false
    }
  }, [])

  // Fetch user votes and favorites when user changes
  React.useEffect(() => {
    if (!user) {
      setUserVotes({})
      setFavorites(new Set())
      return
    }

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

  // Refresh sessions
  const refreshSessions = async () => {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?status=in.(approved,scheduled)&select=*,venue:venues(name),time_slot:time_slots(label,start_time)&order=total_votes.desc`,
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
      }
    } catch (err) {
      console.error('Error refreshing sessions:', err)
    }
  }

  // Handle vote change
  const handleVote = async (sessionId: string, newVoteCount: number) => {
    if (!user) {
      router.push('/login')
      return
    }

    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    const oldVotes = userVotes[sessionId] || 0
    const oldCredits = votesToCredits(oldVotes)
    const newCredits = votesToCredits(newVoteCount)
    const creditDiff = newCredits - oldCredits
    const voteDiff = newVoteCount - oldVotes

    // Check if user has enough credits
    if (creditsSpent + creditDiff > TOTAL_CREDITS) {
      return
    }

    // Optimistic update for user votes
    setUserVotes((prev) => ({ ...prev, [sessionId]: newVoteCount }))

    // Optimistic update for session total_votes (in-place, no re-sort)
    setSessions((prev) =>
      prev.map((s) =>
        s.id === sessionId
          ? { ...s, total_votes: Math.max(0, (s.total_votes || 0) + voteDiff) }
          : s
      )
    )

    try {
      if (newVoteCount === 0) {
        // Delete vote
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&session_id=eq.${sessionId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )
        if (!response.ok) {
          throw new Error('Delete failed')
        }
      } else {
        // Upsert vote
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?on_conflict=user_id,session_id`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates',
            },
            body: JSON.stringify({
              user_id: user.id,
              session_id: sessionId,
              vote_count: newVoteCount,
              credits_spent: newCredits,
            }),
          }
        )
        if (!response.ok) {
          throw new Error('Upsert failed')
        }
      }
      // Note: We no longer call refreshSessions() here to avoid re-sorting
      // Sessions will refresh on page load or manual refresh
    } catch (err) {
      console.error('Error voting:', err)
      // Revert both on error
      setUserVotes((prev) => ({ ...prev, [sessionId]: oldVotes }))
      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, total_votes: Math.max(0, (s.total_votes || 0) - voteDiff) }
            : s
        )
      )
    }
  }

  // Handle favorite toggle
  const handleToggleFavorite = async (sessionId: string) => {
    if (!user) {
      router.push('/login')
      return
    }

    const token = getAccessToken()
    if (!token) {
      router.push('/login')
      return
    }

    const isFavorited = favorites.has(sessionId)

    // Optimistic update
    setFavorites((prev) => {
      const next = new Set(prev)
      if (isFavorited) {
        next.delete(sessionId)
      } else {
        next.add(sessionId)
      }
      return next
    })

    try {
      if (isFavorited) {
        // Delete favorite
        await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&session_id=eq.${sessionId}`,
          {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )
      } else {
        // Add favorite
        await fetch(
          `${SUPABASE_URL}/rest/v1/favorites`,
          {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              user_id: user.id,
              session_id: sessionId,
            }),
          }
        )
      }
    } catch (err) {
      console.error('Error toggling favorite:', err)
      // Revert on error
      setFavorites((prev) => {
        const next = new Set(prev)
        if (isFavorited) {
          next.add(sessionId)
        } else {
          next.delete(sessionId)
        }
        return next
      })
    }
  }

  // Filter and sort sessions
  const filteredSessions = React.useMemo(() => {
    let filtered = sessions

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(searchLower) ||
          s.description?.toLowerCase().includes(searchLower) ||
          s.host_name?.toLowerCase().includes(searchLower)
      )
    }

    // Format filter
    if (format !== 'all') {
      filtered = filtered.filter((s) => s.format === format)
    }

    // Sort
    if (sort === 'votes') {
      filtered = [...filtered].sort((a, b) => b.total_votes - a.total_votes)
    } else if (sort === 'recent') {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else if (sort === 'alpha') {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title))
    }

    return filtered
  }, [sessions, search, format, sort])

  const favoriteCount = favorites.size

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
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold">Sessions</h1>
          <p className="text-muted-foreground mt-1">
            Vote on sessions to help determine the schedule
          </p>
        </div>

        {/* Search and Filters */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className={cn(showFilters && 'bg-accent')}
            >
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Filters
            </Button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-muted/30">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Format</label>
                <div className="flex flex-wrap gap-1.5">
                  {formats.map((f) => (
                    <button
                      key={f}
                      onClick={() => setFormat(f)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md transition-colors capitalize',
                        format === f
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border hover:bg-accent'
                      )}
                    >
                      {f === 'all' ? 'All' : f}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Sort by</label>
                <div className="flex gap-1.5">
                  {sortOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setSort(s.value)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md transition-colors',
                        sort === s.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border hover:bg-accent'
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sessions Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              userVotes={userVotes[session.id] || 0}
              isFavorited={favorites.has(session.id)}
              remainingCredits={creditsRemaining}
              onVote={handleVote}
              onToggleFavorite={handleToggleFavorite}
              showVoting={true}
              isLoggedIn={!!user}
            />
          ))}
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No sessions found.</p>
            {user && (
              <Button asChild className="mt-4">
                <Link href="/propose">Propose a Session</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
