import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  methodNotAllowed,
  isValidUUID,
  parseIncludes,
} from '@/lib/api/response'

const VENUE_FIELDS = 'id,name,slug,capacity,features,style,address,notes,is_primary,created_at'
const VALID_INCLUDES = ['timeslots']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorized()

  const { id } = await params
  if (!isValidUUID(id)) {
    return badRequest('Invalid venue ID format. Expected a UUID.')
  }

  const result = parseIncludes(request, VALID_INCLUDES)
  if ('error' in result) return result.error

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('venues')
    .select(VENUE_FIELDS)
    .eq('id', id)
    .single()

  if (error || !data) {
    return notFound('Venue')
  }

  if (result.includes.includes('timeslots')) {
    const { data: timeslots } = await supabase
      .from('time_slots')
      .select('id,start_time,end_time,label,is_break,day_date,slot_type,created_at')
      .eq('venue_id', id)
      .order('start_time')

    return apiSuccess({ ...data, timeslots: timeslots ?? [] })
  }

  return apiSuccess(data)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
