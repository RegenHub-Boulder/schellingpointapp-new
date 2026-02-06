'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Loader2,
  Check,
  X,
  Calendar,
  MapPin,
  Clock,
  ChevronDown,
  Settings,
  LayoutGrid,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
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

type SessionStatus = 'pending' | 'approved' | 'rejected' | 'scheduled'

interface Session {
  id: string
  title: string
  description: string | null
  format: string
  duration: number
  host_name: string | null
  topic_tags: string[] | null
  total_votes: number
  status: SessionStatus
  venue_id: string | null
  time_slot_id: string | null
  venue?: { id: string; name: string } | null
  time_slot?: { id: string; label: string; start_time: string } | null
}

interface Venue {
  id: string
  name: string
  capacity: number
}

interface TimeSlot {
  id: string
  label: string
  start_time: string
  end_time: string
}

export default function AdminPage() {
  const router = useRouter()
  const { user, profile, isLoading: authLoading } = useAuth()

  const [sessions, setSessions] = React.useState<Session[]>([])
  const [venues, setVenues] = React.useState<Venue[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState<'pending' | 'approved' | 'scheduled'>('pending')

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
        const [sessionsRes, venuesRes, timeSlotsRes] = await Promise.all([
          fetch(
            `${SUPABASE_URL}/rest/v1/sessions?select=*,venue:venues(id,name),time_slot:time_slots(id,label,start_time)&order=total_votes.desc`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': authHeader,
              },
            }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/venues?select=*&order=name`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': authHeader,
              },
            }
          ),
          fetch(
            `${SUPABASE_URL}/rest/v1/time_slots?select=*&order=start_time`,
            {
              headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': authHeader,
              },
            }
          ),
        ])

        if (sessionsRes.ok) {
          const data = await sessionsRes.json()
          setSessions(data)
        }
        if (venuesRes.ok) {
          const data = await venuesRes.json()
          setVenues(data)
        }
        if (timeSlotsRes.ok) {
          const data = await timeSlotsRes.json()
          setTimeSlots(data)
        }
      } catch (err) {
        console.error('Error fetching admin data:', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleApprove = async (sessionId: string) => {
    const token = getAccessToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'approved' }),
        }
      )

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'approved' as SessionStatus } : s))
      )
    } catch (err) {
      console.error('Error approving session:', err)
    }
  }

  const handleReject = async (sessionId: string) => {
    const token = getAccessToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'rejected' }),
        }
      )

      setSessions((prev) =>
        prev.map((s) => (s.id === sessionId ? { ...s, status: 'rejected' as SessionStatus } : s))
      )
    } catch (err) {
      console.error('Error rejecting session:', err)
    }
  }

  const handleSchedule = async (sessionId: string, venueId: string, timeSlotId: string) => {
    const token = getAccessToken()
    if (!token) return

    const venue = venues.find((v) => v.id === venueId)
    const timeSlot = timeSlots.find((t) => t.id === timeSlotId)

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`,
        {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'scheduled',
            venue_id: venueId,
            time_slot_id: timeSlotId,
          }),
        }
      )

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: 'scheduled' as SessionStatus,
                venue_id: venueId,
                time_slot_id: timeSlotId,
                venue: venue ? { id: venue.id, name: venue.name } : null,
                time_slot: timeSlot
                  ? { id: timeSlot.id, label: timeSlot.label, start_time: timeSlot.start_time }
                  : null,
              }
            : s
        )
      )
    } catch (err) {
      console.error('Error scheduling session:', err)
    }
  }

  const handleUnschedule = async (sessionId: string) => {
    const token = getAccessToken()
    if (!token) return

    try {
      await fetch(
        `${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}`,
        {
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
        }
      )

      setSessions((prev) =>
        prev.map((s) =>
          s.id === sessionId
            ? {
                ...s,
                status: 'approved' as SessionStatus,
                venue_id: null,
                time_slot_id: null,
                venue: null,
                time_slot: null,
              }
            : s
        )
      )
    } catch (err) {
      console.error('Error unscheduling session:', err)
    }
  }

  const pendingSessions = sessions.filter((s) => s.status === 'pending')
  const approvedSessions = sessions.filter((s) => s.status === 'approved')
  const scheduledSessions = sessions.filter((s) => s.status === 'scheduled')

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
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <Link
                href="/sessions"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
              <h1 className="font-bold text-lg">Admin Dashboard</h1>
            </div>
            <div className="flex gap-2">
              <Button asChild size="sm" className="flex-1 sm:flex-none">
                <Link href="/admin/schedule">
                  <LayoutGrid className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Schedule Builder</span>
                  <span className="sm:hidden">Schedule</span>
                </Link>
              </Button>
              <Button variant="outline" asChild size="sm" className="flex-1 sm:flex-none">
                <Link href="/admin/setup">
                  <Settings className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Event Setup</span>
                  <span className="sm:hidden">Setup</span>
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="space-y-6">
          {/* Tabs */}
          <div className="flex gap-1 sm:gap-2 border-b overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <button
              onClick={() => setActiveTab('pending')}
              className={cn(
                'px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === 'pending'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Pending ({pendingSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={cn(
                'px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === 'approved'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Approved ({approvedSessions.length})
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={cn(
                'px-3 sm:px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                activeTab === 'scheduled'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              Scheduled ({scheduledSessions.length})
            </button>
          </div>

          {/* Pending Sessions */}
          {activeTab === 'pending' && (
            <div className="space-y-4">
              {pendingSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No pending sessions to review.
                  </CardContent>
                </Card>
              ) : (
                pendingSessions.map((session) => (
                  <SessionAdminCard
                    key={session.id}
                    session={session}
                    onApprove={() => handleApprove(session.id)}
                    onReject={() => handleReject(session.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* Approved Sessions */}
          {activeTab === 'approved' && (
            <div className="space-y-4">
              {approvedSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No approved sessions ready for scheduling.
                  </CardContent>
                </Card>
              ) : (
                approvedSessions.map((session) => (
                  <SessionScheduleCard
                    key={session.id}
                    session={session}
                    venues={venues}
                    timeSlots={timeSlots}
                    onSchedule={(venueId, timeSlotId) =>
                      handleSchedule(session.id, venueId, timeSlotId)
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* Scheduled Sessions */}
          {activeTab === 'scheduled' && (
            <div className="space-y-4">
              {scheduledSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No sessions have been scheduled yet.
                  </CardContent>
                </Card>
              ) : (
                scheduledSessions.map((session) => (
                  <ScheduledSessionCard
                    key={session.id}
                    session={session}
                    onUnschedule={() => handleUnschedule(session.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

// Pending session card with approve/reject
function SessionAdminCard({
  session,
  onApprove,
  onReject,
}: {
  session: Session
  onApprove: () => void
  onReject: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {session.format}
              </Badge>
              <span className="text-sm text-muted-foreground">{session.duration} min</span>
            </div>
            <h3 className="font-semibold">{session.title}</h3>
            {session.host_name && (
              <p className="text-sm text-muted-foreground">by {session.host_name}</p>
            )}
            {session.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{session.description}</p>
            )}
            {session.topic_tags && session.topic_tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {session.topic_tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={onReject} className="flex-1 sm:flex-none">
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove} className="flex-1 sm:flex-none">
              <Check className="h-4 w-4 mr-1" />
              Approve
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Approved session card with scheduling
function SessionScheduleCard({
  session,
  venues,
  timeSlots,
  onSchedule,
}: {
  session: Session
  venues: Venue[]
  timeSlots: TimeSlot[]
  onSchedule: (venueId: string, timeSlotId: string) => void
}) {
  const [selectedVenue, setSelectedVenue] = React.useState('')
  const [selectedTimeSlot, setSelectedTimeSlot] = React.useState('')
  const [showScheduler, setShowScheduler] = React.useState(false)

  const handleSchedule = () => {
    if (selectedVenue && selectedTimeSlot) {
      onSchedule(selectedVenue, selectedTimeSlot)
      setShowScheduler(false)
      setSelectedVenue('')
      setSelectedTimeSlot('')
    }
  }

  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="secondary" className="capitalize">
                  {session.format}
                </Badge>
                <span className="text-sm text-muted-foreground">{session.duration} min</span>
                <span className="text-sm font-medium text-primary">
                  {session.total_votes} votes
                </span>
              </div>
              <h3 className="font-semibold">{session.title}</h3>
              {session.host_name && (
                <p className="text-sm text-muted-foreground">by {session.host_name}</p>
              )}
            </div>
            <Button
              size="sm"
              variant={showScheduler ? 'secondary' : 'default'}
              onClick={() => setShowScheduler(!showScheduler)}
              className="w-full sm:w-auto"
            >
              <Calendar className="h-4 w-4 mr-1" />
              Schedule
              <ChevronDown
                className={cn('h-4 w-4 ml-1 transition-transform', showScheduler && 'rotate-180')}
              />
            </Button>
          </div>

          {showScheduler && (
            <div className="pt-4 border-t space-y-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Venue
                  </label>
                  <select
                    value={selectedVenue}
                    onChange={(e) => setSelectedVenue(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2.5 text-sm min-h-[44px]"
                  >
                    <option value="">Select venue...</option>
                    {venues.map((venue) => (
                      <option key={venue.id} value={venue.id}>
                        {venue.name} (cap: {venue.capacity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Time Slot
                  </label>
                  <select
                    value={selectedTimeSlot}
                    onChange={(e) => setSelectedTimeSlot(e.target.value)}
                    className="w-full rounded-md border bg-background px-3 py-2.5 text-sm min-h-[44px]"
                  >
                    <option value="">Select time...</option>
                    {timeSlots.map((slot) => (
                      <option key={slot.id} value={slot.id}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <Button
                onClick={handleSchedule}
                disabled={!selectedVenue || !selectedTimeSlot}
                className="w-full"
              >
                Confirm Schedule
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Scheduled session card
function ScheduledSessionCard({
  session,
  onUnschedule,
}: {
  session: Session
  onUnschedule: () => void
}) {
  return (
    <Card>
      <CardContent className="p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="capitalize">
                {session.format}
              </Badge>
              <span className="text-sm text-muted-foreground">{session.duration} min</span>
              <span className="text-sm font-medium text-primary">{session.total_votes} votes</span>
            </div>
            <h3 className="font-semibold">{session.title}</h3>
            {session.host_name && (
              <p className="text-sm text-muted-foreground">by {session.host_name}</p>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm bg-muted/50 rounded-lg p-3">
              {session.venue && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{session.venue.name}</span>
                </div>
              )}
              {session.time_slot && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{session.time_slot.label}</span>
                </div>
              )}
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={onUnschedule} className="w-full sm:w-auto">
            Unschedule
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
