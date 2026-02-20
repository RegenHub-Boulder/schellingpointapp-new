'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Loader2,
  GripVertical,
  Calendar,
  X,
  PanelLeftClose,
  PanelLeft,
  AlertTriangle,
  Clock,
  Wand2,
  Undo2,
  Redo2,
  RotateCcw,
  Send,
  CheckCircle,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AdminNav } from '@/components/admin/AdminNav'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/useAuth'
import { useEvent, useEventRole } from '@/contexts/EventContext'
import { getEventDays, getEventDayLabel } from '@/lib/events/dates'
import { formatInEventTimezone } from '@/lib/events/timezone'
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
  time_preferences: string[] | null
  track?: Track | null
}

// History action for undo/redo
interface HistoryAction {
  type: 'schedule' | 'unschedule'
  sessionId: string
  fromSlotId: string | null
  fromVenueId: string | null
  toSlotId: string | null
  toVenueId: string | null
}

// Generate day-to-preferences mapping dynamically based on event dates
function generateDayToPreferences(eventDays: string[]): Record<string, string[]> {
  const mapping: Record<string, string[]> = {}

  eventDays.forEach((dateStr) => {
    const date = new Date(dateStr + 'T12:00:00')
    const dayOfWeek = date.getDay()
    const prefs: string[] = []

    switch (dayOfWeek) {
      case 0: prefs.push('sunday_am', 'sunday_pm'); break
      case 1: prefs.push('monday_am', 'monday_pm'); break
      case 2: prefs.push('tuesday_am', 'tuesday_pm'); break
      case 3: prefs.push('wednesday_am', 'wednesday_pm'); break
      case 4: prefs.push('thursday_am', 'thursday_pm'); break
      case 5: prefs.push('friday_am', 'friday_pm'); break
      case 6: prefs.push('saturday_am', 'saturday_pm'); break
    }

    mapping[dateStr] = prefs
  })

  return mapping
}

const PREF_LABELS: Record<string, string> = {
  friday_am: 'Fri AM', friday_pm: 'Fri PM',
  saturday_am: 'Sat AM', saturday_pm: 'Sat PM',
  sunday_am: 'Sun AM', sunday_pm: 'Sun PM',
  monday_am: 'Mon AM', monday_pm: 'Mon PM',
  tuesday_am: 'Tue AM', tuesday_pm: 'Tue PM',
  wednesday_am: 'Wed AM', wednesday_pm: 'Wed PM',
  thursday_am: 'Thu AM', thursday_pm: 'Thu PM',
}

// Calculate slot duration in minutes
function getSlotDuration(slot: TimeSlot): number {
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

export default function AdminSchedulePage() {
  const router = useRouter()
  const { user, isLoading: authLoading } = useAuth()
  const event = useEvent()
  const { isAdmin, isLoading: roleLoading, can } = useEventRole()

  // Generate event days dynamically from event dates
  const eventDays = React.useMemo(() => {
    return getEventDays(event.startDate, event.endDate)
  }, [event.startDate, event.endDate])

  // Generate day-to-preferences mapping
  const dayToPreferences = React.useMemo(() => {
    return generateDayToPreferences(eventDays)
  }, [eventDays])

  const [venues, setVenues] = React.useState<Venue[]>([])
  const [timeSlots, setTimeSlots] = React.useState<TimeSlot[]>([])
  const [sessions, setSessions] = React.useState<Session[]>([])
  const [tracks, setTracks] = React.useState<Track[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [selectedDay, setSelectedDay] = React.useState(eventDays[0] || '')
  const [draggedSession, setDraggedSession] = React.useState<Session | null>(null)
  const [showSidebar, setShowSidebar] = React.useState(true)

  // Undo/Redo history
  const [history, setHistory] = React.useState<HistoryAction[]>([])
  const [historyIndex, setHistoryIndex] = React.useState(-1)

  // Conflict state
  const [showConflictWarning, setShowConflictWarning] = React.useState(false)
  const [conflictSlotId, setConflictSlotId] = React.useState<string | null>(null)
  const [pendingDrop, setPendingDrop] = React.useState<{ slotId: string; venueId: string } | null>(null)

  // Auto-schedule state
  const [showAutoSchedule, setShowAutoSchedule] = React.useState(false)
  const [autoScheduleLoading, setAutoScheduleLoading] = React.useState(false)
  const [autoScheduleResult, setAutoScheduleResult] = React.useState<{
    assignments: Array<{
      sessionId: string
      sessionTitle: string
      slotId: string
      venueId: string
      score: number
      warnings: string[]
    }>
    unassigned: Array<{ sessionId: string; sessionTitle: string; reason: string }>
    stats: { totalSessions: number; assigned: number; unassigned: number; averageScore: number }
  } | null>(null)

  // Publish workflow state
  const [showPublishModal, setShowPublishModal] = React.useState(false)
  const [publishStatus, setPublishStatus] = React.useState<{
    schedulePublishedAt: string | null
    lastScheduleChangeAt: string | null
    hasUnpublishedChanges: boolean
    scheduledSessions: number
  } | null>(null)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [publishSuccess, setPublishSuccess] = React.useState(false)

  // Build slot occupancy map
  const slotOccupancy = React.useMemo(() => {
    const map = new Map<string, Session>()
    sessions.forEach((s) => {
      if (s.time_slot_id) {
        map.set(s.time_slot_id, s)
      }
    })
    return map
  }, [sessions])

  // Update selected day when event days change
  React.useEffect(() => {
    if (eventDays.length > 0 && !eventDays.includes(selectedDay)) {
      setSelectedDay(eventDays[0])
    }
  }, [eventDays, selectedDay])

  // Redirect if not admin
  React.useEffect(() => {
    if (!authLoading && !roleLoading && (!user || !isAdmin)) {
      router.push(`/e/${event.slug}/sessions`)
    }
  }, [user, isAdmin, authLoading, roleLoading, router, event.slug])

  // Fetch data
  React.useEffect(() => {
    const fetchData = async () => {
      const token = getAccessToken()
      const authHeader = token ? `Bearer ${token}` : `Bearer ${SUPABASE_KEY}`

      try {
        const [venuesRes, timeSlotsRes, sessionsRes, tracksRes] = await Promise.all([
          fetch(`${SUPABASE_URL}/rest/v1/venues?event_id=eq.${event.id}&select=*&order=is_primary.desc,name`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/time_slots?event_id=eq.${event.id}&select=*&order=start_time`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/sessions?event_id=eq.${event.id}&select=*,track:tracks(id,name,slug,color)&order=total_votes.desc`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': authHeader },
          }),
          fetch(`${SUPABASE_URL}/rest/v1/tracks?event_id=eq.${event.id}&select=*&order=name`, {
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
  }, [event.id])

  // Fetch publish status
  const fetchPublishStatus = React.useCallback(async () => {
    const token = getAccessToken()
    if (!token) return

    try {
      const response = await fetch(`/api/v1/events/${event.slug}/admin/publish-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.ok) {
        const data = await response.json()
        setPublishStatus(data)
      }
    } catch (err) {
      console.error('Error fetching publish status:', err)
    }
  }, [event.slug])

  React.useEffect(() => {
    fetchPublishStatus()
  }, [fetchPublishStatus])

  // Publish schedule handler
  const handlePublishSchedule = async () => {
    const token = getAccessToken()
    if (!token) return

    setIsPublishing(true)
    setPublishSuccess(false)

    try {
      const response = await fetch(`/api/v1/events/${event.slug}/admin/publish-schedule`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (response.ok) {
        setPublishSuccess(true)
        await fetchPublishStatus()
        setTimeout(() => {
          setShowPublishModal(false)
          setPublishSuccess(false)
        }, 2000)
      }
    } catch (err) {
      console.error('Error publishing schedule:', err)
    } finally {
      setIsPublishing(false)
    }
  }

  // Get time slots for a specific venue and day
  const getSlotsForVenueAndDay = (venueId: string, dayDate: string) => {
    return timeSlots.filter(
      (slot) => slot.venue_id === venueId && slot.day_date === dayDate
    ).sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime())
  }

  // Get session assigned to a specific time slot
  const getSessionForSlot = (slotId: string) => {
    return slotOccupancy.get(slotId)
  }

  // Unscheduled sessions (approved but not assigned to a slot)
  const unscheduledSessions = sessions.filter(
    (s) => (s.status === 'approved' || s.status === 'scheduled') && !s.time_slot_id
  )

  // Add action to history
  const addToHistory = (action: HistoryAction) => {
    // Remove any actions after current index (for redo)
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(action)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Handle drop on slot
  const handleDropOnSlot = async (slotId: string, venueId: string, force = false) => {
    if (!draggedSession) return

    // Check for conflict
    const existingSession = slotOccupancy.get(slotId)
    if (existingSession && existingSession.id !== draggedSession.id && !force) {
      setConflictSlotId(slotId)
      setPendingDrop({ slotId, venueId })
      setShowConflictWarning(true)
      return
    }

    const token = getAccessToken()
    if (!token) return

    // Save for undo
    const action: HistoryAction = {
      type: 'schedule',
      sessionId: draggedSession.id,
      fromSlotId: draggedSession.time_slot_id,
      fromVenueId: draggedSession.venue_id,
      toSlotId: slotId,
      toVenueId: venueId,
    }

    try {
      // If replacing, unschedule the existing session first
      if (existingSession && existingSession.id !== draggedSession.id) {
        await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${existingSession.id}&event_id=eq.${event.id}`, {
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
            s.id === existingSession.id
              ? { ...s, status: 'approved', venue_id: null, time_slot_id: null }
              : s
          )
        )
      }

      await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${draggedSession.id}&event_id=eq.${event.id}`, {
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

      addToHistory(action)

      // Fire-and-forget: notify host via email
      fetch(`/api/sessions/${draggedSession.id}/notify-host`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch((err) => console.error('Notify host error:', err))
    } catch (err) {
      console.error('Error scheduling session:', err)
    }

    setDraggedSession(null)
    setShowConflictWarning(false)
    setConflictSlotId(null)
    setPendingDrop(null)
  }

  // Handle conflict confirmation
  const handleConfirmReplace = () => {
    if (pendingDrop) {
      handleDropOnSlot(pendingDrop.slotId, pendingDrop.venueId, true)
    }
  }

  const handleCancelReplace = () => {
    setShowConflictWarning(false)
    setConflictSlotId(null)
    setPendingDrop(null)
    setDraggedSession(null)
  }

  // Remove session from slot
  const handleRemoveFromSlot = async (sessionId: string) => {
    const token = getAccessToken()
    if (!token) return

    const session = sessions.find((s) => s.id === sessionId)
    if (!session) return

    // Save for undo
    const action: HistoryAction = {
      type: 'unschedule',
      sessionId,
      fromSlotId: session.time_slot_id,
      fromVenueId: session.venue_id,
      toSlotId: null,
      toVenueId: null,
    }

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${sessionId}&event_id=eq.${event.id}`, {
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

      addToHistory(action)
    } catch (err) {
      console.error('Error removing session:', err)
    }
  }

  // Undo last action
  const handleUndo = async () => {
    if (historyIndex < 0) return

    const action = history[historyIndex]
    const token = getAccessToken()
    if (!token) return

    try {
      if (action.type === 'schedule') {
        // Reverse a schedule: put session back to original position
        await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${action.sessionId}&event_id=eq.${event.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: action.fromSlotId ? 'scheduled' : 'approved',
            venue_id: action.fromVenueId,
            time_slot_id: action.fromSlotId,
          }),
        })

        setSessions((prev) =>
          prev.map((s) =>
            s.id === action.sessionId
              ? {
                  ...s,
                  status: action.fromSlotId ? 'scheduled' : 'approved',
                  venue_id: action.fromVenueId,
                  time_slot_id: action.fromSlotId,
                }
              : s
          )
        )
      } else if (action.type === 'unschedule') {
        // Reverse an unschedule: put session back in slot
        await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${action.sessionId}&event_id=eq.${event.id}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status: 'scheduled',
            venue_id: action.fromVenueId,
            time_slot_id: action.fromSlotId,
          }),
        })

        setSessions((prev) =>
          prev.map((s) =>
            s.id === action.sessionId
              ? {
                  ...s,
                  status: 'scheduled',
                  venue_id: action.fromVenueId,
                  time_slot_id: action.fromSlotId,
                }
              : s
          )
        )
      }

      setHistoryIndex(historyIndex - 1)
    } catch (err) {
      console.error('Undo error:', err)
    }
  }

  // Redo last undone action
  const handleRedo = async () => {
    if (historyIndex >= history.length - 1) return

    const action = history[historyIndex + 1]
    const token = getAccessToken()
    if (!token) return

    try {
      await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${action.sessionId}&event_id=eq.${event.id}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: action.toSlotId ? 'scheduled' : 'approved',
          venue_id: action.toVenueId,
          time_slot_id: action.toSlotId,
        }),
      })

      setSessions((prev) =>
        prev.map((s) =>
          s.id === action.sessionId
            ? {
                ...s,
                status: action.toSlotId ? 'scheduled' : 'approved',
                venue_id: action.toVenueId,
                time_slot_id: action.toSlotId,
              }
            : s
        )
      )

      setHistoryIndex(historyIndex + 1)
    } catch (err) {
      console.error('Redo error:', err)
    }
  }

  // Reset day (unschedule all sessions for selected day)
  const handleResetDay = async () => {
    if (!confirm(`Clear all scheduled sessions for this day? This cannot be undone.`)) return

    const token = getAccessToken()
    if (!token) return

    const daySlotIds = new Set(
      timeSlots.filter((s) => s.day_date === selectedDay).map((s) => s.id)
    )
    const sessionsToReset = sessions.filter(
      (s) => s.time_slot_id && daySlotIds.has(s.time_slot_id)
    )

    for (const session of sessionsToReset) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/sessions?id=eq.${session.id}&event_id=eq.${event.id}`, {
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
      } catch (err) {
        console.error('Error resetting session:', err)
      }
    }

    setSessions((prev) =>
      prev.map((s) =>
        sessionsToReset.find((r) => r.id === s.id)
          ? { ...s, status: 'approved', venue_id: null, time_slot_id: null }
          : s
      )
    )

    // Clear history after reset
    setHistory([])
    setHistoryIndex(-1)
  }

  // Auto-schedule: fetch preview
  const handleAutoSchedulePreview = async () => {
    const token = getAccessToken()
    if (!token) return

    setAutoScheduleLoading(true)
    setShowAutoSchedule(true)

    try {
      const response = await fetch(`/api/v1/events/${event.slug}/admin/auto-schedule`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to generate auto-schedule')
        setShowAutoSchedule(false)
        return
      }

      const result = await response.json()
      setAutoScheduleResult(result)
    } catch (err) {
      console.error('Auto-schedule error:', err)
      alert('Failed to generate auto-schedule')
      setShowAutoSchedule(false)
    } finally {
      setAutoScheduleLoading(false)
    }
  }

  // Auto-schedule: apply
  const handleAutoScheduleApply = async () => {
    if (!autoScheduleResult) return

    const token = getAccessToken()
    if (!token) return

    setAutoScheduleLoading(true)

    try {
      const response = await fetch(`/api/v1/events/${event.slug}/admin/auto-schedule`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          assignments: autoScheduleResult.assignments,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        alert(data.error || 'Failed to apply auto-schedule')
        return
      }

      const data = await response.json()

      // Update local state with new assignments
      const assignmentMap = new Map(
        autoScheduleResult.assignments.map((a) => [a.sessionId, { slotId: a.slotId, venueId: a.venueId }])
      )

      setSessions((prev) =>
        prev.map((s) => {
          const assignment = assignmentMap.get(s.id)
          if (assignment) {
            return {
              ...s,
              status: 'scheduled',
              venue_id: assignment.venueId,
              time_slot_id: assignment.slotId,
            }
          }
          return s
        })
      )

      // Clear history after auto-schedule
      setHistory([])
      setHistoryIndex(-1)

      setShowAutoSchedule(false)
      setAutoScheduleResult(null)

      alert(`Applied ${data.applied} assignments successfully!`)
    } catch (err) {
      console.error('Apply auto-schedule error:', err)
      alert('Failed to apply auto-schedule')
    } finally {
      setAutoScheduleLoading(false)
    }
  }

  // Format time for display using event timezone
  const formatTime = (dateStr: string) => {
    return formatInEventTimezone(new Date(dateStr), event.timezone, 'time')
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

  // Keyboard shortcuts for undo/redo
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        if (e.shiftKey) {
          handleRedo()
        } else {
          handleUndo()
        }
        e.preventDefault()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [historyIndex, history])

  if (authLoading || roleLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!isAdmin) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <AdminNav
        eventSlug={event.slug}
        canManageSchedule={can('manageSchedule')}
        canManageVenues={can('manageVenues')}
      />

      <div className="flex h-[calc(100vh-57px)]">
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
                  selectedDay={selectedDay}
                  dayToPreferences={dayToPreferences}
                  onDragStart={() => setDraggedSession(session)}
                  onDragEnd={() => setDraggedSession(null)}
                />
              ))
            )}
          </div>
        </div>

        {/* Main Schedule Grid */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Day Tabs and Actions */}
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
            {eventDays.map((dayDate) => {
              const dayLabel = getEventDayLabel(dayDate, event.timezone)
              return (
                <Button
                  key={dayDate}
                  variant={selectedDay === dayDate ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedDay(dayDate)}
                  className="whitespace-nowrap flex-shrink-0"
                >
                  <span className="hidden sm:inline">{dayLabel}</span>
                  <span className="sm:hidden">{dayLabel.split(' ')[0]}</span>
                </Button>
              )
            })}

            {/* Action buttons */}
            <div className="ml-auto flex items-center gap-1">
              {unscheduledSessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAutoSchedulePreview}
                  disabled={autoScheduleLoading}
                  className="gap-1.5"
                >
                  <Wand2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Auto-schedule</span>
                </Button>
              )}
              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                disabled={historyIndex < 0}
                title="Undo (Ctrl+Z)"
              >
                <Undo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo (Ctrl+Shift+Z)"
              >
                <Redo2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetDay}
                title="Reset Day"
                className="text-destructive hover:text-destructive"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
              {/* Draft indicator */}
              {publishStatus?.hasUnpublishedChanges && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                  <FileText className="h-3 w-3 mr-1" />
                  Draft
                </Badge>
              )}
              {/* Publish button */}
              <Button
                variant={publishStatus?.hasUnpublishedChanges ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowPublishModal(true)}
                className="gap-1.5"
              >
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {publishStatus?.schedulePublishedAt ? 'Update' : 'Publish'}
                </span>
              </Button>
            </div>
          </div>

          {/* Mobile hint */}
          <div className="sm:hidden px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 text-xs text-amber-700 dark:text-amber-400">
            Scroll horizontally to view full schedule. Best viewed on desktop.
          </div>

          {/* Grid */}
          <div className="flex-1 overflow-auto p-4">
            {timeRows.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  No time slots configured for this day.
                  <br />
                  <Link href={`/e/${event.slug}/admin/setup`} className="text-primary hover:underline">
                    Configure time slots in Event Setup
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: `80px repeat(${venues.length}, minmax(130px, 1fr))` }}
              >
                {/* Header Row - Venues */}
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

                {/* Time Rows */}
                {timeRows.map((timeRow) => (
                  <React.Fragment key={`${timeRow.start}-${timeRow.end}`}>
                    {/* Time Label */}
                    <div className="flex flex-col justify-center text-xs text-muted-foreground pr-2 text-right h-20">
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
                        return (
                          <div
                            key={venue.id}
                            className="h-20 rounded-lg bg-muted/20 border border-dashed border-muted-foreground/20"
                          />
                        )
                      }

                      if (slot.is_break) {
                        return (
                          <div
                            key={venue.id}
                            className="h-20 rounded-lg bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center overflow-hidden"
                          >
                            <span className="text-xs text-amber-700 dark:text-amber-400 font-medium truncate px-2">
                              {slot.label || 'Break'}
                            </span>
                          </div>
                        )
                      }

                      if (scheduledSession) {
                        const slotDuration = getSlotDuration(slot)
                        const hasDurationMismatch = scheduledSession.duration !== slotDuration

                        return (
                          <ScheduledSlot
                            key={venue.id}
                            session={scheduledSession}
                            slot={slot}
                            venue={venue}
                            hasDurationMismatch={hasDurationMismatch}
                            slotDuration={slotDuration}
                            onRemove={() => handleRemoveFromSlot(scheduledSession.id)}
                          />
                        )
                      }

                      // Check if this is a conflict slot
                      const isConflict = conflictSlotId === slot.id

                      return (
                        <DropZone
                          key={venue.id}
                          slot={slot}
                          venue={venue}
                          isDragging={!!draggedSession}
                          draggedSession={draggedSession}
                          isConflict={isConflict}
                          onDrop={() => handleDropOnSlot(slot.id, venue.id)}
                        />
                      )
                    })}
                  </React.Fragment>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Conflict Warning Modal */}
      {showConflictWarning && pendingDrop && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={handleCancelReplace}
        >
          <div
            className="w-full max-w-md bg-card border rounded-xl shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-full bg-amber-500/10">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className="font-semibold">Slot Already Occupied</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This time slot already has a session scheduled. Would you like to replace it?
                </p>
              </div>
            </div>

            {conflictSlotId && slotOccupancy.get(conflictSlotId) && (
              <div className="bg-muted rounded-lg p-3 mb-4">
                <p className="text-xs text-muted-foreground mb-1">Current session:</p>
                <p className="font-medium text-sm">{slotOccupancy.get(conflictSlotId)?.title}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancelReplace}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleConfirmReplace}
              >
                Replace Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Auto-Schedule Modal */}
      {showAutoSchedule && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
          onClick={() => !autoScheduleLoading && setShowAutoSchedule(false)}
        >
          <div
            className="w-full max-w-2xl max-h-[80vh] bg-card border rounded-xl shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5 border-b flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Wand2 className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Auto-Schedule Preview</h3>
                  <p className="text-sm text-muted-foreground">
                    Review proposed assignments before applying
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAutoSchedule(false)}
                disabled={autoScheduleLoading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {autoScheduleLoading && !autoScheduleResult ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : autoScheduleResult ? (
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{autoScheduleResult.stats.assigned}</div>
                      <div className="text-xs text-muted-foreground">Assigned</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{autoScheduleResult.stats.unassigned}</div>
                      <div className="text-xs text-muted-foreground">Unassigned</div>
                    </div>
                    <div className="bg-muted rounded-lg p-3 text-center">
                      <div className="text-2xl font-bold">{autoScheduleResult.stats.averageScore}</div>
                      <div className="text-xs text-muted-foreground">Avg Score</div>
                    </div>
                  </div>

                  {/* Assignments */}
                  {autoScheduleResult.assignments.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Proposed Assignments ({autoScheduleResult.assignments.length})</h4>
                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {autoScheduleResult.assignments.map((a) => {
                          const slot = timeSlots.find((s) => s.id === a.slotId)
                          const venue = venues.find((v) => v.id === a.venueId)
                          return (
                            <div
                              key={a.sessionId}
                              className={cn(
                                'p-3 rounded-lg border text-sm',
                                a.warnings.length > 0 ? 'bg-amber-500/5 border-amber-500/30' : 'bg-green-500/5 border-green-500/30'
                              )}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-medium truncate">{a.sessionTitle}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {venue?.name} · {slot ? formatTime(slot.start_time) : 'Unknown'}
                                  </p>
                                </div>
                                <Badge variant="outline" className="text-xs shrink-0">
                                  Score: {a.score}
                                </Badge>
                              </div>
                              {a.warnings.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {a.warnings.map((w, i) => (
                                    <span key={i} className="text-[10px] text-amber-600 dark:text-amber-400">
                                      ⚠️ {w}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Unassigned */}
                  {autoScheduleResult.unassigned.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2 text-amber-600 dark:text-amber-400">
                        Could Not Assign ({autoScheduleResult.unassigned.length})
                      </h4>
                      <div className="space-y-2">
                        {autoScheduleResult.unassigned.map((u) => (
                          <div key={u.sessionId} className="p-3 rounded-lg bg-muted text-sm">
                            <p className="font-medium">{u.sessionTitle}</p>
                            <p className="text-xs text-muted-foreground">{u.reason}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No results available
                </div>
              )}
            </div>

            {autoScheduleResult && autoScheduleResult.assignments.length > 0 && (
              <div className="p-5 border-t flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowAutoSchedule(false)
                    setAutoScheduleResult(null)
                  }}
                  disabled={autoScheduleLoading}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAutoScheduleApply}
                  disabled={autoScheduleLoading}
                >
                  {autoScheduleLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Applying...
                    </>
                  ) : (
                    <>Apply {autoScheduleResult.assignments.length} Assignments</>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish Schedule Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="font-semibold">
                {publishSuccess ? 'Schedule Published!' : 'Publish Schedule'}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowPublishModal(false)
                  setPublishSuccess(false)
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-5">
              {publishSuccess ? (
                <div className="text-center py-4">
                  <div className="rounded-full bg-green-500/10 p-4 w-fit mx-auto mb-4">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                  </div>
                  <p className="font-medium">Schedule published successfully!</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Attendees can now see the schedule.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-4">
                    {/* Status summary */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Scheduled sessions:</span>
                        <span className="font-medium">{publishStatus?.scheduledSessions || 0}</span>
                      </div>
                      {publishStatus?.schedulePublishedAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Last published:</span>
                          <span className="font-medium">
                            {new Date(publishStatus.schedulePublishedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Info message */}
                    <div className="p-3 bg-muted rounded-lg text-sm">
                      {publishStatus?.schedulePublishedAt ? (
                        <p>
                          This will update the public schedule with your latest changes.
                          Attendees will be notified of the update.
                        </p>
                      ) : (
                        <p>
                          Publishing will make the schedule visible to all attendees.
                          You can update it again anytime after publishing.
                        </p>
                      )}
                    </div>

                    {/* Warning if no sessions scheduled */}
                    {publishStatus?.scheduledSessions === 0 && (
                      <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-400 flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        <p>No sessions are currently scheduled. Consider scheduling some sessions first.</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 mt-6">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowPublishModal(false)}
                      disabled={isPublishing}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handlePublishSchedule}
                      disabled={isPublishing}
                    >
                      {isPublishing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4 mr-2" />
                          {publishStatus?.schedulePublishedAt ? 'Update Schedule' : 'Publish Schedule'}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Session item in the tray
function SessionTrayItem({
  session,
  selectedDay,
  dayToPreferences,
  onDragStart,
  onDragEnd,
}: {
  session: Session
  selectedDay: string
  dayToPreferences: Record<string, string[]>
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const prefs = session.time_preferences || []
  const dayPrefs = dayToPreferences[selectedDay] || []
  const matchesDay = prefs.length > 0 && prefs.some((p) => dayPrefs.includes(p))

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'p-3 bg-background rounded-lg border shadow-sm cursor-move hover:shadow-md transition-shadow group',
        matchesDay && 'ring-2 ring-green-500/50 border-green-500/30'
      )}
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
          <div className="flex flex-wrap items-center gap-1 mt-2">
            {session.track && (
              <Badge
                variant="secondary"
                className="text-xs"
                style={{ backgroundColor: session.track.color || undefined }}
              >
                {session.track.name}
              </Badge>
            )}
            {prefs.map((pref) => (
              <Badge
                key={pref}
                variant="outline"
                className={cn(
                  'text-[10px]',
                  dayPrefs.includes(pref)
                    ? 'border-green-500 text-green-700 dark:text-green-400 bg-green-500/10'
                    : 'text-muted-foreground'
                )}
              >
                {PREF_LABELS[pref] || pref}
              </Badge>
            ))}
          </div>
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
  draggedSession,
  isConflict,
  onDrop,
}: {
  slot: TimeSlot
  venue: Venue
  isDragging: boolean
  draggedSession: Session | null
  isConflict: boolean
  onDrop: () => void
}) {
  const [isOver, setIsOver] = React.useState(false)

  // Check for duration mismatch
  const slotDuration = getSlotDuration(slot)
  const hasDurationWarning = draggedSession && draggedSession.duration !== slotDuration

  // Check for capacity warning
  const hasCapacityWarning = draggedSession && venue.capacity && draggedSession.total_votes > venue.capacity

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
        'h-20 rounded-lg border-2 border-dashed transition-colors flex flex-col items-center justify-center overflow-hidden gap-1',
        isConflict && 'border-red-500 bg-red-500/10',
        !isConflict && isDragging && 'border-primary/50 bg-primary/5',
        !isConflict && isOver && !hasDurationWarning && 'border-primary bg-primary/10',
        !isConflict && isOver && hasDurationWarning && 'border-amber-500 bg-amber-500/10',
        !isDragging && !isConflict && 'border-muted-foreground/20 bg-muted/10'
      )}
    >
      <span className="text-xs text-muted-foreground">
        {slot.label || (slot.slot_type === 'unconference' ? 'Open Slot' : `${slotDuration}min`)}
      </span>

      {/* Duration warning when hovering */}
      {isOver && hasDurationWarning && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <Clock className="h-3 w-3" />
          Session is {draggedSession.duration}min
        </div>
      )}

      {/* Capacity warning when hovering */}
      {isOver && hasCapacityWarning && (
        <div className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-3 w-3" />
          {draggedSession.total_votes} votes &gt; {venue.capacity} cap
        </div>
      )}
    </div>
  )
}

// Scheduled session in a slot
function ScheduledSlot({
  session,
  slot,
  venue,
  hasDurationMismatch,
  slotDuration,
  onRemove,
}: {
  session: Session
  slot: TimeSlot
  venue: Venue
  hasDurationMismatch: boolean
  slotDuration: number
  onRemove: () => void
}) {
  // Capacity warning
  const hasCapacityWarning = venue.capacity && session.total_votes > venue.capacity

  return (
    <div
      className={cn(
        'h-20 rounded-lg border p-2 relative group overflow-hidden',
        hasDurationMismatch || hasCapacityWarning
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-primary/10 border-primary/30'
      )}
    >
      <button
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded bg-background/80 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground z-10"
      >
        <X className="h-3 w-3" />
      </button>

      {/* Warning indicators */}
      <div className="absolute top-1 left-1 flex gap-1">
        {hasDurationMismatch && (
          <div
            className="p-0.5 rounded bg-amber-500/20"
            title={`Session duration (${session.duration}min) doesn't match slot (${slotDuration}min)`}
          >
            <Clock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
        )}
        {hasCapacityWarning && (
          <div
            className="p-0.5 rounded bg-amber-500/20"
            title={`Expected attendance (${session.total_votes}) exceeds venue capacity (${venue.capacity})`}
          >
            <AlertTriangle className="h-3 w-3 text-amber-600 dark:text-amber-400" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-1 mt-3">
        <Badge variant="outline" className="text-[10px] capitalize shrink-0">
          {session.format}
        </Badge>
        <span className="text-[10px] text-muted-foreground">{session.duration}m</span>
      </div>
      <h4 className="text-xs font-medium line-clamp-2 mt-0.5">{session.title}</h4>
      {session.host_name && (
        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{session.host_name}</p>
      )}
    </div>
  )
}
