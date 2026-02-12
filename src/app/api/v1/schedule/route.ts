import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import { apiSuccess, unauthorized, badRequest, methodNotAllowed } from '@/lib/api/response'

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

/* eslint-disable @typescript-eslint/no-explicit-any */
type SlotRow = Record<string, any>
type SessionRow = Record<string, any>

export async function GET(request: Request) {
  if (!validateApiKey(request)) return unauthorized()

  const url = new URL(request.url)
  const dayParam = url.searchParams.get('day')

  if (dayParam && !DATE_REGEX.test(dayParam)) {
    return badRequest('Invalid day format. Expected YYYY-MM-DD.')
  }

  const supabase = await createAdminClient()

  // Fetch time slots with venue
  let slotsQuery = supabase
    .from('time_slots')
    .select('id,start_time,end_time,label,is_break,day_date,slot_type,venue:venues(id,name,slug)')
    .order('start_time')

  if (dayParam) {
    slotsQuery = slotsQuery.eq('day_date', dayParam)
  }

  // Fetch scheduled sessions with track
  let sessionsQuery = supabase
    .from('sessions')
    .select('id,title,description,format,duration,host_name,status,session_type,total_votes,time_slot_id,track:tracks(id,name,color)')
    .eq('status', 'scheduled')
    .not('time_slot_id', 'is', null)

  const [slotsResult, sessionsResult] = await Promise.all([
    slotsQuery,
    sessionsQuery,
  ])

  if (slotsResult.error) return badRequest(slotsResult.error.message)
  if (sessionsResult.error) return badRequest(sessionsResult.error.message)

  const slots: SlotRow[] = slotsResult.data ?? []
  const sessions: SessionRow[] = sessionsResult.data ?? []

  // Index sessions by time_slot_id
  const sessionsBySlot = new Map<string, SessionRow[]>()
  for (const session of sessions) {
    if (!session.time_slot_id) continue
    const existing = sessionsBySlot.get(session.time_slot_id) ?? []
    existing.push(session)
    sessionsBySlot.set(session.time_slot_id, existing)
  }

  // Group slots by day
  const dayMap = new Map<string, SlotRow[]>()

  for (const slot of slots) {
    const day = slot.day_date ?? slot.start_time.split('T')[0]
    const slotSessions = sessionsBySlot.get(slot.id) ?? []

    const entry = {
      id: slot.id,
      start_time: slot.start_time,
      end_time: slot.end_time,
      label: slot.label,
      is_break: slot.is_break,
      slot_type: slot.slot_type,
      venue: slot.venue,
      sessions: slotSessions,
    }

    const existing = dayMap.get(day) ?? []
    existing.push(entry)
    dayMap.set(day, existing)
  }

  // Convert to sorted array
  const data = Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, daySlots]) => ({ day, slots: daySlots }))

  return apiSuccess(data)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
