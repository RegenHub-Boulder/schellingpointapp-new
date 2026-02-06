'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Calendar, MapPin, Clock, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

interface TimeSlot {
  id: string
  label: string
  start_time: string
  end_time: string
}

interface Session {
  id: string
  title: string
  description: string | null
  format: string
  duration: number
  host_name: string | null
  venue: { name: string } | null
  time_slot: TimeSlot | null
}

// Format time from ISO string to readable format (e.g., "9:00 AM")
function formatTime(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

// Format date for tab display (e.g., "Thu, Feb 13")
function formatDayTab(isoString: string): string {
  const date = new Date(isoString)
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

// Get date string for grouping (YYYY-MM-DD)
function getDateKey(isoString: string): string {
  const date = new Date(isoString)
  return date.toISOString().split('T')[0]
}

export default function SchedulePage() {
  const { isLoading: authLoading } = useAuth()
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, timeSlotsRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/sessions?status=eq.scheduled&select=id,title,description,format,duration,host_name,venue:venues(name),time_slot:time_slots(id,label,start_time,end_time)`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
              },
            }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/time_slots?select=*&order=start_time`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
              },
            }
          ),
        ])

        if (sessionsRes.ok) {
          setSessions(await sessionsRes.json())
        }
        if (timeSlotsRes.ok) {
          const slots = await timeSlotsRes.json()
          setTimeSlots(slots)
          // Auto-select first day
          if (slots.length > 0) {
            setSelectedDay(getDateKey(slots[0].start_time))
          }
        }
      } catch (err) {
        console.error('Error fetching schedule:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Get unique days from time slots
  const days = React.useMemo(() => {
    const dayMap = new Map<string, string>()
    timeSlots.forEach((slot) => {
      const key = getDateKey(slot.start_time)
      if (!dayMap.has(key)) {
        dayMap.set(key, slot.start_time)
      }
    })
    return Array.from(dayMap.entries()).map(([key, time]) => ({
      key,
      label: formatDayTab(time),
    }))
  }, [timeSlots])

  // Filter time slots and sessions for selected day
  const filteredSlots = React.useMemo(() => {
    if (!selectedDay) return []
    return timeSlots.filter((slot) => getDateKey(slot.start_time) === selectedDay)
  }, [timeSlots, selectedDay])

  // Group sessions by time slot for the selected day
  const sessionsBySlot = React.useMemo(() => {
    const grouped: Record<string, Session[]> = {}
    sessions.forEach((session) => {
      if (session.time_slot) {
        const slotDate = getDateKey(session.time_slot.start_time)
        if (slotDate === selectedDay) {
          const slotId = session.time_slot.id
          if (!grouped[slotId]) {
            grouped[slotId] = []
          }
          grouped[slotId].push(session)
        }
      }
    })
    return grouped
  }, [sessions, selectedDay])

  if (authLoading || isLoading) {
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
        <div>
          <h1 className="text-2xl font-bold">Schedule</h1>
          <p className="text-muted-foreground mt-1">
            Browse sessions by day
          </p>
        </div>

        {sessions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h2 className="text-lg font-semibold mb-2">No sessions scheduled yet</h2>
              <p className="text-muted-foreground">
                Check back later once the schedule has been published.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Day Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
              {days.map((day) => (
                <Button
                  key={day.key}
                  variant={selectedDay === day.key ? 'default' : 'outline'}
                  onClick={() => setSelectedDay(day.key)}
                  className={cn(
                    'whitespace-nowrap',
                    selectedDay === day.key && 'btn-primary-glow'
                  )}
                >
                  {day.label}
                </Button>
              ))}
            </div>

            {/* Sessions for selected day */}
            <div className="space-y-6">
              {filteredSlots.map((slot) => {
                const slotSessions = sessionsBySlot[slot.id] || []
                if (slotSessions.length === 0) return null

                const startTime = formatTime(slot.start_time)
                const endTime = formatTime(slot.end_time)

                return (
                  <div key={slot.id}>
                    {/* Time header */}
                    <div className="sticky top-16 z-10 bg-background/95 backdrop-blur-sm py-2 -mx-4 px-4 sm:mx-0 sm:px-0 mb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-primary font-semibold">
                          <Clock className="h-4 w-4" />
                          <span>{startTime} - {endTime}</span>
                        </div>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    </div>

                    {/* Session cards */}
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {slotSessions.map((session) => (
                        <Link key={session.id} href={`/sessions/${session.id}`}>
                          <Card className="h-full card-hover border-border/50 hover:border-primary/30">
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                {/* Time and format row */}
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-1.5 text-sm font-medium text-primary">
                                    <Clock className="h-3.5 w-3.5" />
                                    <span>{startTime}</span>
                                  </div>
                                  <Badge variant="secondary" className="capitalize text-xs">
                                    {session.format}
                                  </Badge>
                                </div>

                                {/* Title */}
                                <h3 className="font-semibold leading-snug">{session.title}</h3>

                                {/* Host */}
                                {session.host_name && (
                                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                    <User className="h-3.5 w-3.5" />
                                    <span>{session.host_name}</span>
                                  </div>
                                )}

                                {/* Venue and duration */}
                                <div className="flex items-center justify-between text-sm">
                                  {session.venue && (
                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                      <MapPin className="h-3.5 w-3.5" />
                                      <span>{session.venue.name}</span>
                                    </div>
                                  )}
                                  <span className="text-xs text-muted-foreground">
                                    {session.duration} min
                                  </span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}

              {Object.keys(sessionsBySlot).length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      No sessions scheduled for this day yet.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
