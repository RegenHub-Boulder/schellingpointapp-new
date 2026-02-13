import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import {
  apiSuccess,
  unauthorized,
  badRequest,
  methodNotAllowed,
  parseIncludes,
} from '@/lib/api/response'

const SESSION_FIELDS = 'id,title,description,format,duration,host_name,topic_tags,status,is_self_hosted,custom_location,self_hosted_start_time,self_hosted_end_time,session_type,is_votable,total_votes,total_credits,voter_count,host_id,venue_id,time_slot_id,track_id,created_at,updated_at'

const VALID_INCLUDES = ['host', 'track', 'venue', 'timeslot', 'cohosts']
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'scheduled']

function buildSelect(includes: string[]): string {
  const parts = [SESSION_FIELDS]
  if (includes.includes('host')) {
    parts.push('host:profiles!host_id(id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests)')
  }
  if (includes.includes('track')) {
    parts.push('track:tracks(id,name,slug,color)')
  }
  if (includes.includes('venue')) {
    parts.push('venue:venues(id,name,slug)')
  }
  if (includes.includes('timeslot')) {
    parts.push('time_slot:time_slots(id,start_time,end_time,label,is_break,day_date,slot_type)')
  }
  if (includes.includes('cohosts')) {
    parts.push('cohosts:session_cohosts(user_id,display_order,profile:profiles(id,display_name,bio,avatar_url,affiliation))')
  }
  return parts.join(',')
}

export async function GET(request: Request) {
  if (!validateApiKey(request)) return unauthorized()

  const result = parseIncludes(request, VALID_INCLUDES)
  if ('error' in result) return result.error

  const url = new URL(request.url)
  const statusParam = url.searchParams.get('status')
  let statuses = ['approved', 'scheduled']

  if (statusParam) {
    const requested = statusParam.split(',').map(s => s.trim())
    const invalid = requested.filter(s => !VALID_STATUSES.includes(s))
    if (invalid.length > 0) {
      return badRequest(
        `Invalid status(es): ${invalid.join(', ')}. Valid options: ${VALID_STATUSES.join(', ')}`
      )
    }
    statuses = requested
  }

  const supabase = await createAdminClient()
  const selectQuery = buildSelect(result.includes)

  const { data, error } = await supabase
    .from('sessions')
    .select(selectQuery)
    .in('status', statuses)
    .order('total_votes', { ascending: false })

  if (error) {
    return badRequest(error.message)
  }

  return apiSuccess(data, data?.length ?? 0)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
