'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Loader2, Calendar, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'

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

export default function MySchedulePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()

  const [favorites, setFavorites] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

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

  // Group scheduled by time slot
  const groupedByTime: Record<string, any[]> = {}
  scheduledSessions.forEach((session) => {
    const key = session.time_slot.label
    if (!groupedByTime[key]) {
      groupedByTime[key] = []
    }
    groupedByTime[key].push(session)
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
          <div className="space-y-8">
            {/* Scheduled sessions by time */}
            {Object.entries(groupedByTime).map(([timeLabel, sessions]) => (
              <div key={timeLabel}>
                <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  {timeLabel}
                </h2>
                <div className="grid gap-4 md:grid-cols-2">
                  {sessions.map((session) => (
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
                              <p className="text-sm text-primary mt-1">
                                📍 {session.venue.name}
                              </p>
                            )}
                          </Link>
                          <button
                            onClick={() => handleRemoveFavorite(session.id)}
                            className="p-2 rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20"
                          >
                            <Heart className="h-4 w-4 fill-current" />
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ))}

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
                            className="p-2 rounded-full text-red-500 bg-red-500/10 hover:bg-red-500/20"
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
