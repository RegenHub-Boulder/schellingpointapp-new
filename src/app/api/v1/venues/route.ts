import { createAdminClient } from '@/lib/supabase/server'
import { validateApiKey } from '@/lib/api/auth'
import { apiSuccess, unauthorized, badRequest, methodNotAllowed } from '@/lib/api/response'

const VENUE_FIELDS = 'id,name,slug,capacity,features,style,address,notes,is_primary,created_at'

export async function GET(request: Request) {
  if (!validateApiKey(request)) return unauthorized()

  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('venues')
    .select(VENUE_FIELDS)
    .order('is_primary', { ascending: false })
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
