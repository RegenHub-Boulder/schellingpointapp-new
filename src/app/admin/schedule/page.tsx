'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  GripVertical,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  PanelLeftClose,
  PanelLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
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

// Extended interfaces with new schema fields
interface Venue {
  id: string
  name: string
  slug: string | null
  capacity: number | null
  style: string | null
  is_primary: boolean
}

interface TimeSlot {
  id: string
  label: string | null
  start_time: string
  end_time: string
  is_break: boolean
  venue_id: string | null
  day_date: string | null
  slot_type: string | null
}

interface Track {
  id: string
  name: string
  slug: string
  color: string | null
}

interface Session {
  id: string
  title: string
  description: string | null
  format: string
  duration: number
  host_name: string | null
  topic_tags: string[] | null
  total_votes: number
  status: 'pending' | 'approved' | 'rejected' | 'scheduled'
  venue_id: string | null
  time_slot_id: string | null
  track_id: string | null
  session_type: string | null
  is_votable: boolean
  track?: Track | null
}

// Event days for EthBoulder
const EVENT_DAYS = [
  { date: '2026-02-13', label: 'Day 1 - Fri Feb 13' },
  { date: '2026-02-14', label: 'Day 2 - Sat Feb 14' },
  { date: '2026-02-15', label: 'Day 3 - Sun Feb 15' },
]

export default function AdminSchedulePage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()

  const [venues, setVenues] = React.useState<Venue[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedDay, setSelectedDay] = React.useState(EVENT_DAYS[0].date)
  const [draggedSession, setDraggedSession] = React.useState<Session | null>(null)
  const [showSidebar, setShowSidebar] = React.useState(true)

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && (!user || !profile?.is_admin)) {
      router.push('/sessions')
    }
  }, [user, profile, authLoading, router])

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      const token = getAccessToken()
      const authHeader = token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`

      try {
        const [venuesRes, timeSlotsRes, sessionsRes, tracksRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/venues?select=*&order=is_primary.desc,name`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/time_slots?select=*&order=start_time`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/sessions?select=*,track:tracks(id,name,slug,color)&order=total_votes.desc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/tracks?select=*&order=name`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
        ])

        if (venuesRes.ok) setVenues(await venuesRes.json())
        if (timeSlotsRes.ok) setTimeSlots(await timeSlotsRes.json())
        if (sessionsRes.ok) setSessions(await sessionsRes.json())
        if (tracksRes.ok) setTracks(await tracksRes.json())
      } catch (err) {
        console.error('Error fetching data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  // Get time slots for a specific venue and day
  const getSlotsForVenueAndDay = (venueId: string, dayDate: string) => {
    return timeSlots.filter(
      (slot) => slot.venue_id === venueId && slot.day_date === dayDate
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  // Get session assigned to a specific time slot
  const getSessionForSlot = (slotId: string) => {
    return sessions.find((s) => s.time_slot_id === slotId)
  }

  // Unscheduled sessions (approved but not assigned to a slot)
  const unscheduledSessions = sessions.filter(
    (s) => (s.status === 'approved' || s.status === 'scheduled') && !s.time_slot_id
  )

  // Handle drop on slot
  const handleDropOnSlot = async (slotId: string, venueId: string) => {
    if (!draggedSession) return
    const token = getAccessToken()
    if (!token) return

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${draggedSession.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'scheduled',
          venue_id: venueId,
          time_slot_id: slotId,
        }),
      })

      setSessions((prev) =>
        prev.map((s) =>
          s.id === draggedSession.id
            ? { ...s, status: 'scheduled', venue_id: venueId, time_slot_id: slotId }
            : s
        )
      )
    } catch (err) {
      console.error('Error scheduling session:', err)
    }

    setDraggedSession(null)
  }

  // Remove session from slot
  const handleRemoveFromSlot = async (sessionId: string) => {
    const token = getAccessToken()
    if (!token) return

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'approved',
          venue_id: null,
          time_slot_id: null,
        }),
      })

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? { ...s, status: 'approved', venue_id: null, time_slot_id: null }
            : s
        )
      )
    } catch (err) {
      console.error('Error removing session:', err)
    }
  }

  // Format time for display
  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  }

  // Get unique time rows for the selected day (merge all venue slots)
  const getTimeRowsForDay = (dayDate: string) => {
    const daySlots = timeSlots.filter((slot) => slot.day_date === dayDate)
    const uniqueTimes = new Map<string, { start: string; end: string; startTime: Date }>()

    daySlots.forEach((slot) => {
      const key = `${slot.start_time}-${slot.end_time}`
      if (!uniqueTimes.has(key)) {
        uniqueTimes.set(key, {
          start: slot.start_time,
          end: slot.end_time,
          startTime: new Date(slot.start_time),
        })
      }
    })

    return Array.from(uniqueTimes.values()).sort(
      (a, b) => a.startTime.getTime() - b.startTime.getTime()
    )
  }

  const timeRows = getTimeRowsForDay(selectedDay)

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!profile?.is_admin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b sticky top-0 bg-background z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/admin"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Admin
              </Link>
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Schedule Builder
              </h1>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Session Tray - Left Sidebar */}
        <div className={cn(
          "border-r bg-muted/30 flex flex-col transition-all duration-200",
          showSidebar ? "w-72 sm:w-80" : "w-0 overflow-hidden"
        )}>
          <div className="p-3 sm:p-4 border-b bg-background flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-semibold text-sm">Unscheduled</h2>
              <p className="text-xs text-muted-foreground mt-0.5 hidden sm:block">
                Drag sessions to schedule
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0"
              onClick={() => setShowSidebar(false)}
            >
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {unscheduledSessions.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                All approved sessions have been scheduled
              </p>
            ) : (
              unscheduledSessions.map((session) => (
                <SessionTrayItem
                  key={session.id}
                  session={session}
                  onDragStart={() => setDraggedSession(session)}
                  onDragEnd={() => setDraggedSession(null)}
                />
              ))
            )}
          </div>
        </div>

        {/* Main Schedule Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day Tabs */}
          <div className="flex items-center gap-2 p-3 sm:p-4 border-b bg-background overflow-x-auto">
            {!showSidebar && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSidebar(true)}
                className="flex-shrink-0"
              >
                <PanelLeft className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Sessions</span>
                <Badge variant="secondary" className="ml-1 text-xs">
                  {unscheduledSessions.length}
                </Badge>
              </Button>
            )}
            {EVENT_DAYS.map((day) => (
              <Button
                key={day.date}
                variant={selectedDay === day.date ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedDay(day.date)}
                className="whitespace-nowrap flex-shrink-0"
              >
                <span className="hidden sm:inline">{day.label}</span>
                <span className="sm:hidden">{day.label.split(' ')[0]}</span>
              </Button>
            ))}
          </div>

          {/* Mobile hint */}
          <div className="sm:hidden px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
            Scroll horizontally to view full schedule. Best viewed on desktop.
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto p-4">
            <div className="min-w-[800px]">
              {/* Header Row - Venues */}
              <div className="grid gap-2" style={{ gridTemplateColumns: `80px repeat(${venues.length}, 1fr)` }}>
                <div className="h-12" /> {/* Time column header */}
                {venues.map((venue) => (
                  <div
                    key={venue.id}
                    className={cn(
                      'h-12 rounded-lg flex items-center justify-center px-2 text-center',
                      venue.is_primary ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    )}
                  >
                    <div>
                      <div className="font-semibold text-sm truncate">{venue.name}</div>
                      {venue.capacity && (
                        <div className="text-xs opacity-80">{venue.capacity} cap</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time Rows */}
              <div className="mt-2 space-y-2">
                {timeRows.map((timeRow, rowIdx) => (
                  <div
                    key={`${timeRow.start}-${timeRow.end}`}
                    className="grid gap-2"
                    style={{ gridTemplateColumns: `80px repeat(${venues.length}, 1fr)` }}
                  >
                    {/* Time Label */}
                    <div className="flex flex-col justify-center text-xs text-muted-foreground pr-2 text-right">
                      <div className="font-medium">{formatTime(timeRow.start)}</div>
                      <div>{formatTime(timeRow.end)}</div>
                    </div>

                    {/* Venue Cells */}
                    {venues.map((venue) => {
                      const slot = timeSlots.find(
                        (s) =>
                          s.venue_id === venue.id &&
                          s.start_time === timeRow.start &&
                          s.end_time === timeRow.end
                      )
                      const scheduledSession = slot ? getSessionForSlot(slot.id) : null

                      if (!slot) {
                        // No slot for this venue at this time
                        return (
                          <div
                            key={venue.id}
                            className="min-h-[80px] rounded-lg bg-muted/20 border border-dashed border-muted-foreground/20"
                          />
                        )
                      }

                      if (slot.is_break) {
                        return (
                          <div
                            key={venue.id}
                            className="min-h-[80px] rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center"
                          >
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                              {slot.label || 'Break'}
                            </span>
                          </div>
                        )
                      }

                      if (scheduledSession) {
                        return (
                          <ScheduledSlot
                            key={venue.id}
                            session={scheduledSession}
                            slot={slot}
                            onRemove={() => handleRemoveFromSlot(scheduledSession.id)}
                          />
                        )
                      }

                      return (
                        <DropZone
                          key={venue.id}
                          slot={slot}
                          venue={venue}
                          isDragging={!!draggedSession}
                          onDrop={() => handleDropOnSlot(slot.id, venue.id)}
                        />
                      )
                    })}
                  </div>
                ))}

                {timeRows.length === 0 && (
                  <Card>
                    <CardContent className="py-12 text-center text-muted-foreground">
                      No time slots configured for this day.
                      <br />
                      <Link href="/admin/setup" className="text-primary hover:underline">
                        Configure time slots in Event Setup
                      </Link>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Session item in the tray
function SessionTrayItem({
  session,
  onDragStart,
  onDragEnd,
}: {
  session: Session
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="p-3 bg-background rounded-lg border shadow-sm cursor-move hover:shadow-md transition-shadow group"
    >
      <div className="flex items-start gap-2">
        <GripVertical className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0 opacity-50 group-hover:opacity-100" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-xs capitalize shrink-0">
              {session.format}
            </Badge>
            <span className="text-xs text-muted-foreground">{session.duration}min</span>
            <span className="text-xs font-medium text-primary ml-auto">
              {session.total_votes}v
            </span>
          </div>
          <h4 className="text-sm font-medium line-clamp-2">{session.title}</h4>
          {session.host_name && (
            <p className="text-xs text-muted-foreground mt-1">{session.host_name}</p>
          )}
          {session.track && (
            <Badge
              variant="secondary"
              className="text-xs mt-2"
              style={{ backgroundColor: session.track.color || undefined }}
            >
              {session.track.name}
            </Badge>
          )}
        </div>
      </div>
    </div>
  )
}

// Drop zone for empty slots
function DropZone({
  slot,
  venue,
  isDragging,
  onDrop,
}: {
  slot: TimeSlot
  venue: Venue
  isDragging: boolean
  onDrop: () => void
}) {
  const [isOver, setIsOver] = React.useState(false)

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsOver(true)
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsOver(false)
        onDrop()
      }}
      className={cn(
        'min-h-[80px] rounded-lg border-2 border-dashed transition-colors flex items-center justify-center',
        isDragging && 'border-primary/50 bg-primary/5',
        isOver && 'border-primary bg-primary/10',
        !isDragging && 'border-muted-foreground/20 bg-muted/10'
      )}
    >
      <span className="text-xs text-muted-foreground">
        {slot.label || (slot.slot_type === 'unconference' ? 'Open Slot' : 'Available')}
      </span>
    </div>
  )
}

// Scheduled session in a slot
function ScheduledSlot({
  session,
  slot,
  onRemove,
}: {
  session: Session
  slot: TimeSlot
  onRemove: () => void
}) {
  return (
    <div className="min-h-[80px] rounded-lg bg-primary/10 border border-primary/30 p-2 relative group">
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
      >
        <X className="h-3 w-3" />
      </button>
      <div className="flex items-start gap-1">
        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
          {session.format}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{session.duration}m</span>
      </div>
      <h4 className="text-xs font-medium line-clamp-2 mt-1">{session.title}</h4>
      {session.host_name && (
        <p className="text-[10px] text-muted-foreground mt-0.5">{session.host_name}</p>
      )}
    </div>
  )
}
