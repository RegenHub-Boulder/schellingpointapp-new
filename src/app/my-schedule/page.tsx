'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, Heart, Clock, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Get date key using local timezone (prevents duplicate days from UTC conversion)
function getDateKey(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatDayLabel(dateKey: string): string {
  const date = new Date(dateKey + 'T12:00:00')
  return date.toLocaleDateString([], {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })
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

export default function MySchedulePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [favorites, setFavorites] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)

  // Redirect if not logged in
  React.useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
    }
  }, [user, authLoading, router])

  // Fetch favorites
  React.useEffect(() => {
    if (!user) return

    const fetchFavorites = async () => {
      const token = getAccessToken()
      if (!token) return

      try {
        const response = await fetch(
          `${SUPABASE_URL}/rest/v1/favorites?user_id=eq.${user.id}&select=session_id,session:sessions(id,title,description,format,duration,host_name,status,venue:venues(name),time_slot:time_slots(label,start_time,end_time))`,
          {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${token}`,
            },
          }
        )

        if (response.ok) {
          const data = await response.json()
          // Filter out any null sessions and sort by time slot
          const validFavorites = data
            .filter((f: any) => f.session)
            .map((f: any) => f.session)
            .sort((a: any, b: any) => {
              if (!a.time_slot && !b.time_slot) return 0
              if (!a.time_slot) return 1
              if (!b.time_slot) return -1
              return new Date(a.time_slot.start_time).getTime() - new Date(b.time_slot.start_time).getTime()
            })
          setFavorites(validFavorites)
        }
      } catch (err) {
        console.error('Error fetching favorites:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchFavorites()
  }, [user])

  const handleRemoveFavorite = async (sessionId: string) => {
    if (!user) return

    const token = getAccessToken()
    if (!token) return

    // Optimistic update
    setFavorites((prev) => prev.filter((s) => s.id !== sessionId))

    try {
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
    } catch (err) {
      console.error('Error removing favorite:', err)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    )
  }

  // Group by time slot
  const scheduledSessions = favorites.filter((s) => s.time_slot)
  const unscheduledSessions = favorites.filter((s) => !s.time_slot)

  // Get unique days from scheduled sessions
  const days = React.useMemo(() => {
    const daySet = new Map<string, Date>()
    scheduledSessions.forEach((session) => {
      if (session.time_slot?.start_time) {
        const dateKey = getDateKey(session.time_slot.start_time)
        if (!daySet.has(dateKey)) {
          daySet.set(dateKey, new Date(session.time_slot.start_time))
        }
      }
    })
    return Array.from(daySet.entries())
      .sort((a, b) => a[1].getTime() - b[1].getTime())
      .map(([key]) => ({
        key,
        label: formatDayLabel(key),
      }))
  }, [scheduledSessions])

  // Auto-select first day if none selected
  React.useEffect(() => {
    if (days.length > 0 && !selectedDay) {
      setSelectedDay(days[0].key)
    }
  }, [days, selectedDay])

  // Filter sessions by selected day
  const filteredScheduledSessions = React.useMemo(() => {
    if (!selectedDay) return scheduledSessions
    return scheduledSessions.filter((session) => {
      if (!session.time_slot?.start_time) return false
      return getDateKey(session.time_slot.start_time) === selectedDay
    })
  }, [scheduledSessions, selectedDay])

  // Group filtered sessions by time
  const groupedByTime: Record<string, any[]> = {}
  filteredScheduledSessions.forEach((session) => {
    const startTime = formatTime(session.time_slot.start_time)
    if (!groupedByTime[startTime]) {
      groupedByTime[startTime] = []
    }
    groupedByTime[startTime].push(session)
  })

  // Sort time slots
  const sortedTimeSlots = Object.keys(groupedByTime).sort((a, b) => {
    const sessionA = groupedByTime[a][0]
    const sessionB = groupedByTime[b][0]
    return new Date(sessionA.time_slot.start_time).getTime() - new Date(sessionB.time_slot.start_time).getTime()
  })

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Sessions you've saved to attend
          </p>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-12">
            <div className="rounded-full bg-muted w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Calendar className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">No sessions saved</h2>
            <p className="text-muted-foreground mb-4">
              Browse sessions and click the heart icon to add them to your schedule.
            </p>
            <Button asChild>
              <Link href="/sessions">Browse Sessions</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Day Tabs */}
            {days.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {days.map((day) => (
                  <Button
                    key={day.key}
                    variant={selectedDay === day.key ? 'default' : 'outline'}
                    onClick={() => setSelectedDay(day.key)}
                    className="whitespace-nowrap"
                  >
                    {day.label}
                  </Button>
                ))}
              </div>
            )}

            {/* Scheduled sessions by time */}
            {sortedTimeSlots.length > 0 ? (
              <div className="space-y-6">
                {sortedTimeSlots.map((timeLabel) => {
                  const sessions = groupedByTime[timeLabel]
                  const firstSession = sessions[0]
                  const endTime = firstSession.time_slot.end_time
                    ? formatTime(firstSession.time_slot.end_time)
                    : null

                  return (
                    <div key={timeLabel}>
                      <div className="sticky top-[120px] z-10 bg-background/95 backdrop-blur py-2 mb-3 border-b">
                        <h2 className="font-semibold text-lg flex items-center gap-2">
                          <Clock className="h-5 w-5 text-primary" />
                          {timeLabel}
                          {endTime && (
                            <span className="text-muted-foreground font-normal">
                              – {endTime}
                            </span>
                          )}
                        </h2>
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        {sessions.map((session: any) => (
                          <Card key={session.id} className="hover:border-primary/50 hover:shadow-md transition-all">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between gap-4">
                                <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0 cursor-pointer">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="secondary" className="text-xs capitalize">
                                      {session.format}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {session.duration} min
                                    </span>
                                  </div>
                                  <h3 className="font-medium">{session.title}</h3>
                                  {session.host_name && (
                                    <p className="text-sm text-muted-foreground">
                                      by {session.host_name}
                                    </p>
                                  )}
                                  {session.venue && (
                                    <p className="text-sm text-primary mt-2 flex items-center gap-1">
                                      <MapPin className="h-3.5 w-3.5" />
                                      {session.venue.name}
                                    </p>
                                  )}
                                </Link>
                                <button
                                  onClick={() => handleRemoveFavorite(session.id)}
                                  className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20"
                                >
                                  <Heart className="h-4 w-4 fill-current" />
                                </button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : selectedDay && scheduledSessions.length > 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No sessions saved for this day.</p>
              </div>
            ) : null}

            {/* Unscheduled favorites */}
            {unscheduledSessions.length > 0 && (
              <div>
                <h2 className="font-semibold text-lg mb-4 text-muted-foreground">
                  Not Yet Scheduled
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {unscheduledSessions.map((session) => (
                    <Card key={session.id} className="border-dashed hover:border-primary/50 hover:shadow-md transition-all">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <Link href={`/sessions/${session.id}`} className="flex-1 min-w-0 cursor-pointer">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="text-xs capitalize">
                                {session.format}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {session.duration} min
                              </span>
                            </div>
                            <h3 className="font-medium">{session.title}</h3>
                            {session.host_name && (
                              <p className="text-sm text-muted-foreground">
                                by {session.host_name}
                              </p>
                            )}
                          </Link>
                          <button
                            onClick={() => handleRemoveFavorite(session.id)}
                            className="p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
