import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import {
  apiSuccess,
  unauthorized,
  badRequest,
  notFound,
  methodNotAllowed,
  isValidUUID,
} from '@/lib/api/response'

const SESSION_DETAIL_SELECT = [
  'id,title,description,format,duration,host_name,topic_tags,status,is_self_hosted,custom_location,session_type,is_votable,total_votes,total_credits,voter_count,host_id,venue_id,time_slot_id,track_id,created_at,updated_at',
  'host:profiles!host_id(id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)',
  'track:tracks(id,name,slug,description,color)',
  'venue:venues(id,name,slug,capacity,features,style,address,notes,is_primary)',
  'time_slot:time_slots(id,start_time,end_time,label,is_break,day_date,slot_type)',
].join(',')

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorized()

  const { id } = await params
  if (!isValidUUID(id)) {
    return badRequest('Invalid session ID format. Expected a UUID.')
  }

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('sessions')
    .select(SESSION_DETAIL_SELECT)
    .eq('id', id)
    .single()

  if (error || !data) {
    return notFound('Session')
  }

  return apiSuccess(data)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
