import { createAdminClient } from '@/lib/supabase/server'
import { apiSuccess, badRequest, methodNotAllowed } from '@/lib/api/response'

const PROFILE_FIELDS = 'id,email,display_name,bio,avatar_url,affiliation,building,telegram,ens,interests,is_admin,created_at'

export async function GET() {
  const supabase = await createAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_FIELDS)
    .order('display_name')

  if (error) {
    return badRequest(error.message)
  }

  return apiSuccess(data, data?.length ?? 0)
}

export async function POST() { return methodNotAllowed() }
export async function PUT() { return methodNotAllowed() }
export async function PATCH() { return methodNotAllowed() }
export async function DELETE() { return methodNotAllowed() }
