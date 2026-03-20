/**
 * Debug auto-schedule to see what slots are being suggested
 * Run with: npx tsx scripts/debug-auto-schedule.ts
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { autoSchedule } from '../src/lib/scheduling/auto-scheduler'

function loadEnvFile(path: string) {
  try {
    const content = readFileSync(path, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (trimmed && !trimmed.startsWith('#')) {
        const [key, ...valueParts] = trimmed.split('=')
        const value = valueParts.join('=')
        if (key && value) {
          process.env[key] = value
        }
      }
    }
  } catch (e) {}
}

loadEnvFile(join(process.cwd(), '.env.local'))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
})

async function debug() {
  const eventSlug = process.argv[2] || 'fresh-test-2026'

  const { data: event } = await supabase
    .from('events')
    .select('id, name')
    .eq('slug', eventSlug)
    .single()

  if (!event) {
    console.log('Event not found:', eventSlug)
    return
  }

  console.log(`\n=== Debugging Auto-Schedule for: ${event.name} ===\n`)

  // Fetch all data
  const [sessionsRes, timeSlotsRes, venuesRes, votesRes] = await Promise.all([
    supabase
      .from('sessions')
      .select('id, title, duration, total_votes, expected_attendance, status, time_slot_id, venue_id, track_id, time_preferences')
      .eq('event_id', event.id),
    supabase
      .from('time_slots')
      .select('id, start_time, end_time, is_break, venue_id, day_date, slot_type')
      .eq('event_id', event.id)
      .order('start_time'),
    supabase
      .from('venues')
      .select('id, name, capacity, is_primary')
      .eq('event_id', event.id),
    supabase
      .from('votes')
      .select('session_id, user_id, vote_count')
  ])

  const sessions = sessionsRes.data || []
  const timeSlots = timeSlotsRes.data || []
  const venues = venuesRes.data || []

  // Get votes for this event's sessions
  const sessionIds = new Set(sessions.map(s => s.id))
  const votes = (votesRes.data || []).filter(v => sessionIds.has(v.session_id))

  console.log('=== INPUT DATA ===')
  console.log(`Sessions: ${sessions.length}`)
  sessions.forEach(s => {
    console.log(`  - [${s.status}] ${s.title} (votes: ${s.total_votes}, duration: ${s.duration}min)`)
  })

  console.log(`\nTime Slots: ${timeSlots.length}`)
  const slotsByDay = new Map<string, typeof timeSlots>()
  timeSlots.forEach(slot => {
    const day = slot.day_date || 'unknown'
    if (!slotsByDay.has(day)) slotsByDay.set(day, [])
    slotsByDay.get(day)!.push(slot)
  })

  for (const [day, slots] of Array.from(slotsByDay.entries())) {
    console.log(`  ${day}: ${slots.length} slots`)
    slots.forEach((slot: any) => {
      const venue = venues.find(v => v.id === slot.venue_id)
      const start = new Date(slot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const end = new Date(slot.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      console.log(`    - ${start}-${end} @ ${venue?.name || 'No venue'} ${slot.is_break ? '[BREAK]' : ''} (id: ${slot.id.substring(0, 8)}...)`)
    })
  }

  console.log(`\nVenues: ${venues.length}`)
  venues.forEach(v => {
    console.log(`  - ${v.name} (capacity: ${v.capacity}, primary: ${v.is_primary})`)
  })

  console.log(`\nVotes: ${votes.length}`)

  // Add required_features as null since column may not exist
  const sessionsWithFeatures = sessions.map(s => ({
    ...s,
    required_features: null as string[] | null,
  }))
  const venuesWithFeatures = venues.map(v => ({
    ...v,
    features: null as string[] | null,
  }))

  // Run auto-schedule
  console.log('\n=== RUNNING AUTO-SCHEDULE ===\n')
  const result = autoSchedule(sessionsWithFeatures, timeSlots, venuesWithFeatures, votes)

  console.log('=== RESULTS ===')
  console.log(`Assigned: ${result.stats.assigned}`)
  console.log(`Unassigned: ${result.stats.unassigned}`)
  console.log(`Average Score: ${result.stats.averageScore}`)

  console.log('\n=== ASSIGNMENTS ===')
  result.assignments.forEach(a => {
    const slot = timeSlots.find(s => s.id === a.slotId)
    const venue = venues.find(v => v.id === a.venueId)

    if (slot) {
      const start = new Date(slot.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      const day = slot.day_date || new Date(slot.start_time).toISOString().split('T')[0]
      console.log(`  ✓ "${a.sessionTitle}"`)
      console.log(`    → ${day} ${start} @ ${venue?.name || 'Unknown venue'}`)
      console.log(`    → Score: ${a.score}, Slot ID: ${a.slotId.substring(0, 8)}...`)
      if (a.warnings.length > 0) {
        console.log(`    → Warnings: ${a.warnings.join(', ')}`)
      }
    } else {
      console.log(`  ⚠️ "${a.sessionTitle}"`)
      console.log(`    → INVALID SLOT ID: ${a.slotId}`)
    }
  })

  if (result.unassigned.length > 0) {
    console.log('\n=== UNASSIGNED ===')
    result.unassigned.forEach(u => {
      console.log(`  ✗ "${u.sessionTitle}": ${u.reason}`)
    })
  }

  // Check for slots that don't exist in our list
  const validSlotIds = new Set(timeSlots.map(s => s.id))
  const invalidAssignments = result.assignments.filter(a => !validSlotIds.has(a.slotId))

  if (invalidAssignments.length > 0) {
    console.log('\n⚠️ INVALID SLOT ASSIGNMENTS (slot ID not in database):')
    invalidAssignments.forEach(a => {
      console.log(`  - ${a.sessionTitle} → ${a.slotId}`)
    })
  }
}

debug().catch(console.error)
