'use client'

import * as React from 'react'
import Link from 'next/link'
import { Loader2, Calendar, MapPin, Clock, User, Search } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DashboardLayout } from '@/components/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useTracks } from '@/hooks/useTracks'
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
  is_self_hosted?: boolean
  custom_location?: string | null
  self_hosted_start_time?: string | null
  self_hosted_end_time?: string | null
  venue: { name: string } | null
  time_slot: TimeSlot | null
  track: { id: string; name: string; color: string | null } | null
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

// Get date string for grouping (YYYY-MM-DD in local timezone)
function getDateKey(isoString: string): string {
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export default function SchedulePage() {
  const { isLoading: authLoading } = useAuth()
  const { tracks } = useTracks()
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedDay, setSelectedDay] = React.useState<string | null>(null)
  const [trackFilter, setTrackFilter] = React.useState<string>('all')
  const [sortBy, setSortBy] = React.useState<'time' | 'venue'>('time')
  const [showSelfHosted, setShowSelfHosted] = React.useState(true)
  const [search, setSearch] = React.useState('')

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const [sessionsRes, timeSlotsRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/sessions?status=eq.scheduled&select=id,title,description,format,duration,host_name,is_self_hosted,custom_location,self_hosted_start_time,self_hosted_end_time,venue:venues(name),time_slot:time_slots(id,label,start_time,end_time),track:tracks(id,name,color)`,
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

  // Filter sessions by selected day, track, and search
  const filteredSessions = React.useMemo(() => {
    let filtered = sessions.filter((session) => {
      if (session.is_self_hosted) {
        if (!showSelfHosted) return false
        if (!session.self_hosted_start_time) return false
        const slotDate = getDateKey(session.self_hosted_start_time)
        if (slotDate !== selectedDay) return false
      } else {
        if (!session.time_slot) return false
        const slotDate = getDateKey(session.time_slot.start_time)
        if (slotDate !== selectedDay) return false
      }
      if (trackFilter !== 'all' && session.track?.id !== trackFilter) return false
      return true
    })
    if (search) {
      const searchLower = search.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(searchLower) ||
          s.description?.toLowerCase().includes(searchLower) ||
          s.host_name?.toLowerCase().includes(searchLower)
      )
    }
    return filtered
  }, [sessions, selectedDay, trackFilter, showSelfHosted, search])

  // Group sessions by time slot for the selected day
  const sessionsBySlot = React.useMemo(() => {
    const grouped: Record<string, Session[]> = {}
    filteredSessions.forEach((session) => {
      if (session.is_self_hosted) {
        const key = 'self-hosted'
        if (!grouped[key]) grouped[key] = []
        grouped[key].push(session)
      } else if (session.time_slot) {
        const slotId = session.time_slot.id
        if (!grouped[slotId]) grouped[slotId] = []
        grouped[slotId].push(session)
      }
    })
    return grouped
  }, [filteredSessions])

  // Group sessions by venue for venue sort mode
  const sessionsByVenue = React.useMemo(() => {
    if (sortBy !== 'venue') return null
    const grouped: Record<string, Session[]> = {}
    filteredSessions.forEach((session) => {
      const venueName = session.is_self_hosted ? 'Self-Hosted' : (session.venue?.name || 'Unassigned')
      if (!grouped[venueName]) {
        grouped[venueName] = []
      }
      grouped[venueName].push(session)
    })
    // Sort sessions within each venue by start time
    Object.values(grouped).forEach((arr) => {
      arr.sort((a, b) => {
        const aTime = a.time_slot?.start_time || ''
        const bTime = b.time_slot?.start_time || ''
        return aTime.localeCompare(bTime)
      })
    })
    return grouped
  }, [filteredSessions, sortBy])

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
            {/* Day Tabs and Controls */}
            <div className="space-y-3">
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

              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search sessions..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Track filter and sort toggle */}
              <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-wrap sm:items-center sm:gap-4">
                {/* Sort toggle */}
                <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg p-1">
                  <button
                    onClick={() => setSortBy('time')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 min-h-[36px]',
                      sortBy === 'time'
                        ? 'bg-background shadow-sm'
                        : 'hover:bg-background/50'
                    )}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    By Time
                  </button>
                  <button
                    onClick={() => setSortBy('venue')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 min-h-[36px]',
                      sortBy === 'venue'
                        ? 'bg-background shadow-sm'
                        : 'hover:bg-background/50'
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5" />
                    By Venue
                  </button>
                </div>

                <button
                  onClick={() => setShowSelfHosted(!showSelfHosted)}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 min-h-[36px] border',
                    showSelfHosted
                      ? 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-400'
                      : 'border-border text-muted-foreground hover:bg-muted'
                  )}
                >
                  <MapPin className="h-3.5 w-3.5" />
                  Self-Hosted
                </button>

                {/* Track filter */}
                {tracks.length > 0 && (
                  <div className="w-full sm:w-auto overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
                    <div className="flex items-center gap-1.5 sm:gap-2 pb-2 sm:pb-0 sm:flex-wrap">
                      <span className="text-xs text-muted-foreground mr-1 whitespace-nowrap">Track:</span>
                      <button
                        onClick={() => setTrackFilter('all')}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-md transition-colors whitespace-nowrap min-h-[32px]',
                          trackFilter === 'all'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        )}
                      >
                        All
                      </button>
                      {tracks.map((t) => (
                        <button
                          key={t.id}
                          onClick={() => setTrackFilter(t.id)}
                          className={cn(
                            'px-3 py-1.5 text-xs rounded-md transition-colors flex items-center gap-1.5 whitespace-nowrap min-h-[32px]',
                            trackFilter === t.id
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted hover:bg-muted/80'
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
                )}
              </div>
            </div>

            {/* Sessions for selected day */}
            <div className="space-y-4">
              {sortBy === 'time' ? (
                // Group by time slot
                <>
                  {filteredSlots.map((slot) => {
                    const slotSessions = sessionsBySlot[slot.id] || []
                    if (slotSessions.length === 0) return null

                    const startTime = formatTime(slot.start_time)
                    const endTime = formatTime(slot.end_time)

                    return (
                      <div key={slot.id}>
                        {/* Time header - more compact */}
                        <div className="sticky top-[104px] z-10 bg-background/95 backdrop-blur-sm py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
                              <Clock className="h-3.5 w-3.5" />
                              <span>{startTime} - {endTime}</span>
                            </div>
                            <div className="flex-1 h-px bg-border" />
                          </div>
                        </div>

                        {/* Session cards - compact layout */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {slotSessions.map((session) => (
                            <Link key={session.id} href={`/sessions/${session.id}`}>
                              <Card className="h-full card-hover border-border/50 hover:border-primary/30">
                                <CardContent className="p-3">
                                  <div className="space-y-1.5">
                                    {/* Title and format on same row */}
                                    <div className="flex items-start justify-between gap-2">
                                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{session.title}</h3>
                                      <Badge variant="secondary" className="capitalize text-[10px] flex-shrink-0">
                                        {session.format}
                                      </Badge>
                                    </div>

                                    {/* Host and venue inline */}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {session.host_name && (
                                        <div className="flex items-center gap-1 truncate">
                                          <User className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{session.host_name}</span>
                                        </div>
                                      )}
                                      {session.venue && (
                                        <div className="flex items-center gap-1 truncate">
                                          <MapPin className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{session.venue.name}</span>
                                        </div>
                                      )}
                                      {session.track && (
                                        <div className="flex items-center gap-1 truncate">
                                          {session.track.color && (
                                            <span
                                              className="w-2 h-2 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: session.track.color }}
                                            />
                                          )}
                                          <span className="truncate">{session.track.name}</span>
                                        </div>
                                      )}
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

                  {/* Self-hosted sessions */}
                  {sessionsBySlot['self-hosted'] && sessionsBySlot['self-hosted'].length > 0 && (
                    <div>
                      <div className="sticky top-[104px] z-10 bg-background/95 backdrop-blur-sm py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold text-sm">
                            <MapPin className="h-3.5 w-3.5" />
                            <span>Self-Hosted</span>
                          </div>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {sessionsBySlot['self-hosted'].map((session) => (
                          <Link key={session.id} href={`/sessions/${session.id}`}>
                            <Card className="h-full card-hover border-orange-500/30 hover:border-orange-500/50">
                              <CardContent className="p-3">
                                <div className="space-y-1.5">
                                  <div className="flex items-start justify-between gap-2">
                                    <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{session.title}</h3>
                                    <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 flex-shrink-0">
                                      Self-Hosted
                                    </Badge>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    {session.self_hosted_start_time && (
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3 flex-shrink-0" />
                                        <span>{formatTime(session.self_hosted_start_time)}</span>
                                      </div>
                                    )}
                                    {session.host_name && (
                                      <div className="flex items-center gap-1 truncate">
                                        <User className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{session.host_name}</span>
                                      </div>
                                    )}
                                    {session.custom_location && (
                                      <div className="flex items-center gap-1 truncate">
                                        <MapPin className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">{session.custom_location}</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Group by venue
                <>
                  {sessionsByVenue && Object.entries(sessionsByVenue)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([venueName, venueSessions]) => (
                      <div key={venueName}>
                        {/* Venue header */}
                        <div className="sticky top-[104px] z-10 bg-background/95 backdrop-blur-sm py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 text-primary font-semibold text-sm">
                              <MapPin className="h-3.5 w-3.5" />
                              <span>{venueName}</span>
                            </div>
                            <div className="flex-1 h-px bg-border" />
                            <span className="text-xs text-muted-foreground">{venueSessions.length} sessions</span>
                          </div>
                        </div>

                        {/* Session cards - compact layout */}
                        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                          {venueSessions.map((session) => (
                            <Link key={session.id} href={`/sessions/${session.id}`}>
                              <Card className="h-full card-hover border-border/50 hover:border-primary/30">
                                <CardContent className="p-3">
                                  <div className="space-y-1.5">
                                    {/* Title and format on same row */}
                                    <div className="flex items-start justify-between gap-2">
                                      <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{session.title}</h3>
                                      <Badge variant="secondary" className="capitalize text-[10px] flex-shrink-0">
                                        {session.format}
                                      </Badge>
                                    </div>

                                    {/* Host and time inline */}
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                      {session.time_slot && (
                                        <div className="flex items-center gap-1">
                                          <Clock className="h-3 w-3 flex-shrink-0" />
                                          <span>{formatTime(session.time_slot.start_time)}</span>
                                        </div>
                                      )}
                                      {session.host_name && (
                                        <div className="flex items-center gap-1 truncate">
                                          <User className="h-3 w-3 flex-shrink-0" />
                                          <span className="truncate">{session.host_name}</span>
                                        </div>
                                      )}
                                      {session.track && (
                                        <div className="flex items-center gap-1 truncate">
                                          {session.track.color && (
                                            <span
                                              className="w-2 h-2 rounded-full flex-shrink-0"
                                              style={{ backgroundColor: session.track.color }}
                                            />
                                          )}
                                          <span className="truncate">{session.track.name}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                </>
              )}

              {filteredSessions.length === 0 && (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground">
                      {search
                        ? 'No sessions match your search.'
                        : trackFilter !== 'all'
                        ? 'No sessions match the selected track.'
                        : 'No sessions scheduled for this day yet.'}
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
