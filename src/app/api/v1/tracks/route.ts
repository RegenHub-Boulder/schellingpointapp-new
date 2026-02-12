import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import { apiSuccess, unauthorized, badRequest, methodNotAllowed } from '@/lib/api/response'

const TRACK_FIELDS = 'id,name,slug,description,color,lead_name,is_active,created_at'

export async function GET(request: Request) {
  if (!validateApiKey(request)) return unauthorized()

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('tracks')
    .select(TRACK_FIELDS)
    .order('name')

  if (error) {
    return badRequest(error.message)
  }

  return apiSuccess(data, data?.length ?? 0)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
