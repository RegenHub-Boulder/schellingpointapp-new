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
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { votesToCredits, cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const formats = ['all', 'talk', 'workshop', 'discussion', 'panel', 'demo']
const statusOptions = [
  { value: 'all', label: 'All' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'proposed', label: 'Proposed' },
]
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

interface Track {
  id: string
  name: string
  color: string | null
}

export default function EventSessionsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const event = useEvent()
  const { voteCredits } = useEventRole()

  // Use event's vote credits per user
  const totalCredits = voteCredits

  const [tracks, setTracks] = React.useState<Track[]>([])
  const [sessions, setSessions] = React.useState<any[]>([])
  const [userVotes, setUserVotes] = React.useState<Record<string, number>>({})
  const [favorites, setFavorites] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(true)
  const [search, setSearch] = React.useState('')
  const [format, setFormat] = React.useState('all')
  const [track, setTrack] = React.useState<string>('all')
  const [status, setStatus] = React.useState('all')
  const [sort, setSort] = React.useState('votes')
  const [showFilters, setShowFilters] = React.useState(false)

  // Stable sort positions — captures server order on load, prevents jumps during voting
  const stableVoteOrderRef = React.useRef<Record<string, number>>({})

  // Calculate credits spent
  const creditsSpent = React.useMemo(() => {
    return Object.values(userVotes).reduce((sum, votes) => sum + votesToCredits(votes), 0)
  }, [userVotes])

  const creditsRemaining = totalCredits - creditsSpent

  // Fetch tracks for this event on mount
  React.useEffect(() => {
    let mounted = true

    const fetchTracks = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/tracks?event_id=eq.${event.id}&is_active=eq.true&select=id,name,color&order=name`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok && mounted) {
          const data = await response.json()
          setTracks(data)
        }
      } catch (err) {
        console.error('Error fetching tracks:', err)
      }
    }

    fetchTracks()

    return () => {
      mounted = false
    }
  }, [event.id])

  // Fetch sessions on mount
  React.useEffect(() => {
    let mounted = true

    const fetchSessions = async () => {
      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/sessions?event_id=eq.${event.id}&status=in.(approved,scheduled)&select=*,venue:venues(name),time_slot:time_slots(label,start_time),track:tracks(id,name,color),cohosts:session_cohosts(profile:profiles(display_name))&order=total_votes.desc`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
            },
          }
        )

        if (response.ok && mounted) {
          const data = await response.json()
          const order: Record<string, number> = {}
          data.forEach((s: any, i: number) => { order[s.id] = i })
          stableVoteOrderRef.current = order
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
  }, [event.id])

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
        // Fetch votes for this event's sessions
        const votesResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/votes?user_id=eq.${user.id}&event_id=eq.${event.id}&select=session_id,vote_count`,
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

        // Fetch favorites for this event's sessions
        const favResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&event_id=eq.${event.id}&select=session_id`,
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
  }, [user, event.id])

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
    if (creditsSpent + creditDiff > totalCredits) {
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
              event_id: event.id,
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
              event_id: event.id,
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

    // Track filter
    if (track !== 'all') {
      filtered = filtered.filter((s) => s.track?.id === track)
    }

    // Status filter (scheduled vs proposed/approved)
    if (status === 'scheduled') {
      filtered = filtered.filter((s) => s.status === 'scheduled')
    } else if (status === 'proposed') {
      filtered = filtered.filter((s) => s.status === 'approved')
    }

    // Sort
    if (sort === 'votes') {
      // Use stable positions from last server fetch — prevents jumping during voting
      const order = stableVoteOrderRef.current
      filtered = [...filtered].sort((a, b) =>
        (order[a.id] ?? Infinity) - (order[b.id] ?? Infinity)
      )
    } else if (sort === 'recent') {
      filtered = [...filtered].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
    } else if (sort === 'alpha') {
      filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title))
    }

    return filtered
  }, [sessions, search, format, track, status, sort])

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

              <div className="space-y-1.5 w-full sm:w-auto">
                <label className="text-xs font-medium text-muted-foreground">Track</label>
                <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                  <div className="flex gap-1.5 pb-2 sm:pb-0 sm:flex-wrap">
                    <button
                      onClick={() => setTrack('all')}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap min-h-[36px]',
                        track === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border hover:bg-accent'
                      )}
                    >
                      All
                    </button>
                    {tracks.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setTrack(t.id)}
                        className={cn(
                          'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[36px]',
                          track === t.id
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-background border hover:bg-accent'
                        )}
                      >
                        {t.color && (
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ backgroundColor: t.color }}
                          />
                        )}
                        {t.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Status</label>
                <div className="flex gap-1.5">
                  {statusOptions.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => setStatus(s.value)}
                      className={cn(
                        'px-3 py-1.5 text-sm rounded-md transition-colors',
                        status === s.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-background border hover:bg-accent'
                      )}
                    >
                      {s.label}
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
                <Link href={`/e/${event.slug}/propose`}>Propose a Session</Link>
              </Button>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
