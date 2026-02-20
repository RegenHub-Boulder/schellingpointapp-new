/**
 * Auto-Scheduling Algorithm
 *
 * A greedy algorithm that places sessions in optimal time slots.
 * Sessions are processed by vote count (highest first), and each
 * session is assigned to its highest-scoring available slot.
 *
 * Scoring criteria:
 * - Time preference match: +10
 * - Duration match: +8
 * - Capacity fit: +5
 * - Track spread: +3 (avoid same track in same time)
 */

export interface Session {
  id: string
  title: string
  duration: number
  total_votes: number
  status: 'pending' | 'approved' | 'rejected' | 'scheduled'
  time_slot_id: string | null
  venue_id: string | null
  track_id: string | null
  time_preferences: string[] | null
}

export interface TimeSlot {
  id: string
  start_time: string
  end_time: string
  is_break: boolean
  venue_id: string | null
  day_date: string | null
  slot_type: string | null
}

export interface Venue {
  id: string
  name: string
  capacity: number | null
  is_primary: boolean
}

export interface ScheduleAssignment {
  sessionId: string
  sessionTitle: string
  slotId: string
  venueId: string
  score: number
  warnings: string[]
}

export interface AutoScheduleResult {
  assignments: ScheduleAssignment[]
  unassigned: { sessionId: string; sessionTitle: string; reason: string }[]
  stats: {
    totalSessions: number
    assigned: number
    unassigned: number
    averageScore: number
  }
}

// Calculate slot duration in minutes
function getSlotDuration(slot: TimeSlot): number {
  const start = new Date(slot.start_time)
  const end = new Date(slot.end_time)
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60))
}

// Get time preferences that match a day (e.g., "2024-02-20" -> ["tuesday_am", "tuesday_pm"])
function getDayPreferences(dayDate: string): string[] {
  const date = new Date(dayDate + 'T12:00:00')
  const dayOfWeek = date.getDay()
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayName = dayNames[dayOfWeek]
  return [`${dayName}_am`, `${dayName}_pm`]
}

// Determine if a time is AM or PM
function isAM(dateStr: string): boolean {
  const date = new Date(dateStr)
  return date.getUTCHours() < 12
}

// Score a slot for a given session
function scoreSlot(
  session: Session,
  slot: TimeSlot,
  venue: Venue,
  occupiedSlots: Set<string>,
  trackAssignmentsInTimeRange: Map<string, Set<string>> // timeRange -> trackIds
): { score: number; warnings: string[] } {
  // Skip if slot is already occupied
  if (occupiedSlots.has(slot.id)) {
    return { score: -1, warnings: [] }
  }

  // Skip if slot is a break
  if (slot.is_break) {
    return { score: -1, warnings: [] }
  }

  let score = 0
  const warnings: string[] = []

  // 1. Duration match (+8)
  const slotDuration = getSlotDuration(slot)
  if (session.duration === slotDuration) {
    score += 8
  } else if (Math.abs(session.duration - slotDuration) <= 15) {
    score += 4 // Partial credit for close match
    warnings.push(`Duration mismatch: session is ${session.duration}min, slot is ${slotDuration}min`)
  } else {
    score += 1 // Minimal credit
    warnings.push(`Duration mismatch: session is ${session.duration}min, slot is ${slotDuration}min`)
  }

  // 2. Time preference match (+10)
  if (session.time_preferences && session.time_preferences.length > 0 && slot.day_date) {
    const dayPrefs = getDayPreferences(slot.day_date)
    const timeOfDay = isAM(slot.start_time) ? '_am' : '_pm'

    const matchingPrefs = session.time_preferences.filter((pref) => {
      // Check if day matches
      const prefDay = pref.replace('_am', '').replace('_pm', '')
      const slotDayName = dayPrefs[0].replace('_am', '').replace('_pm', '')

      if (prefDay !== slotDayName) return false

      // Check if time of day matches
      return pref.endsWith(timeOfDay)
    })

    if (matchingPrefs.length > 0) {
      score += 10
    } else {
      // Partial credit if day matches but time doesn't
      const dayMatches = session.time_preferences.some((pref) =>
        dayPrefs.some((dp) => pref.replace('_am', '').replace('_pm', '') === dp.replace('_am', '').replace('_pm', ''))
      )
      if (dayMatches) {
        score += 3
      }
    }
  }

  // 3. Capacity fit (+5)
  if (venue.capacity) {
    const estimatedAttendance = session.total_votes // Could apply a multiplier
    if (estimatedAttendance <= venue.capacity * 0.7) {
      score += 5 // Comfortable fit
    } else if (estimatedAttendance <= venue.capacity) {
      score += 3 // Tight fit
    } else {
      score += 0 // Over capacity
      warnings.push(`Capacity warning: ${session.total_votes} expected, ${venue.capacity} capacity`)
    }
  } else {
    score += 2 // Unknown capacity, neutral score
  }

  // 4. Track spread (+3)
  // Avoid scheduling same track in overlapping time slots
  if (session.track_id) {
    const timeRangeKey = `${slot.start_time}-${slot.end_time}`
    const tracksInRange = trackAssignmentsInTimeRange.get(timeRangeKey)

    if (!tracksInRange || !tracksInRange.has(session.track_id)) {
      score += 3 // Good - different track
    } else {
      warnings.push('Track conflict: same track scheduled at same time')
    }
  } else {
    score += 1 // No track, neutral
  }

  // 5. Primary venue bonus (+2)
  if (venue.is_primary && session.total_votes > 20) {
    score += 2 // Popular sessions in main venue
  }

  return { score, warnings }
}

/**
 * Auto-schedule approved sessions into available time slots.
 */
export function autoSchedule(
  sessions: Session[],
  timeSlots: TimeSlot[],
  venues: Venue[]
): AutoScheduleResult {
  // Filter to only approved/unscheduled sessions
  const sessionsToSchedule = sessions
    .filter((s) => s.status === 'approved' && !s.time_slot_id)
    .sort((a, b) => b.total_votes - a.total_votes) // Highest votes first

  // Build venue lookup
  const venueMap = new Map<string, Venue>()
  venues.forEach((v) => venueMap.set(v.id, v))

  // Available slots (non-break, with valid venue)
  const availableSlots = timeSlots.filter(
    (s) => !s.is_break && s.venue_id && venueMap.has(s.venue_id)
  )

  // Track assignments
  const occupiedSlots = new Set<string>()
  const trackAssignmentsInTimeRange = new Map<string, Set<string>>()
  const assignments: ScheduleAssignment[] = []
  const unassigned: { sessionId: string; sessionTitle: string; reason: string }[] = []

  // Process each session
  for (const session of sessionsToSchedule) {
    let bestSlot: TimeSlot | null = null
    let bestVenue: Venue | null = null
    let bestScore = -1
    let bestWarnings: string[] = []

    // Score all available slots
    for (const slot of availableSlots) {
      if (occupiedSlots.has(slot.id)) continue

      const venue = venueMap.get(slot.venue_id!)
      if (!venue) continue

      const { score, warnings } = scoreSlot(
        session,
        slot,
        venue,
        occupiedSlots,
        trackAssignmentsInTimeRange
      )

      if (score > bestScore) {
        bestScore = score
        bestSlot = slot
        bestVenue = venue
        bestWarnings = warnings
      }
    }

    // Assign to best slot or mark as unassigned
    if (bestSlot && bestVenue && bestScore >= 0) {
      occupiedSlots.add(bestSlot.id)

      // Track assignment for track spread calculation
      if (session.track_id) {
        const timeRangeKey = `${bestSlot.start_time}-${bestSlot.end_time}`
        if (!trackAssignmentsInTimeRange.has(timeRangeKey)) {
          trackAssignmentsInTimeRange.set(timeRangeKey, new Set())
        }
        trackAssignmentsInTimeRange.get(timeRangeKey)!.add(session.track_id)
      }

      assignments.push({
        sessionId: session.id,
        sessionTitle: session.title,
        slotId: bestSlot.id,
        venueId: bestVenue.id,
        score: bestScore,
        warnings: bestWarnings,
      })
    } else {
      unassigned.push({
        sessionId: session.id,
        sessionTitle: session.title,
        reason: 'No available slots match session requirements',
      })
    }
  }

  // Calculate stats
  const averageScore =
    assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.score, 0) / assignments.length
      : 0

  return {
    assignments,
    unassigned,
    stats: {
      totalSessions: sessionsToSchedule.length,
      assigned: assignments.length,
      unassigned: unassigned.length,
      averageScore: Math.round(averageScore * 100) / 100,
    },
  }
}
