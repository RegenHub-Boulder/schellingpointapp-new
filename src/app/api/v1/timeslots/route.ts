import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import {
  apiSuccess,
  unauthorized,
  badRequest,
  methodNotAllowed,
  parseIncludes,
} from '@/lib/api/response'

const TIMESLOT_FIELDS = 'id,start_time,end_time,label,is_break,day_date,slot_type,venue_id,created_at'
const VALID_INCLUDES = ['venue']

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/

export async function GET(request: Request) {
  if (!validateApiKey(request)) return unauthorized()

  const result = parseIncludes(request, VALID_INCLUDES)
  if ('error' in result) return result.error

  const url = new URL(request.url)
  const dayParam = url.searchParams.get('day')

  if (dayParam && !DATE_REGEX.test(dayParam)) {
    return badRequest('Invalid day format. Expected YYYY-MM-DD.')
  }

  const supabase = await createAdminClient()

  let selectQuery = TIMESLOT_FIELDS
  if (result.includes.includes('venue')) {
    selectQuery += ',venue:venues(id,name,slug)'
  }

  let query = supabase
    .from('time_slots')
    .select(selectQuery)
    .order('start_time')

  if (dayParam) {
    query = query.eq('day_date', dayParam)
  }

  const { data, error } = await query

  if (error) {
    return badRequest(error.message)
  }

  return apiSuccess(data, data?.length ?? 0)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
