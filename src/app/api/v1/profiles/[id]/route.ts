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

const PROFILE_FIELDS = 'id,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests,is_admin,created_at'
const VALID_INCLUDES = ['sessions']

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!validateApiKey(request)) return unauthorized()

  const { id } = await params
  if (!isValidUUID(id)) {
    return badRequest('Invalid profile ID format. Expected a UUID.')
  }

  const result = parseIncludes(request, VALID_INCLUDES)
  if ('error' in result) return result.error

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .eq('id', id)
    .single()

  if (error || !data) {
    return notFound('Profile')
  }

  if (result.includes.includes('sessions')) {
    const { data: sessions } = await supabase
      .from('sessions')
      .select('id,title,description,format,duration,status,session_type,topic_tags,total_votes,created_at')
      .eq('host_id', id)
      .in('status', ['approved', 'scheduled'])
      .order('total_votes', { ascending: false })

    return apiSuccess({ ...data, sessions: sessions ?? [] })
  }

  return apiSuccess(data)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
