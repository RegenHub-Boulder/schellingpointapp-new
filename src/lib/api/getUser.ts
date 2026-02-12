import { createAdminClient } from '@/lib/supabase/server'

/**
 * Extract authenticated user from the Authorization header.
 * This app uses localStorage-based auth with explicit Bearer tokens,
 * not cookie-based auth, so we verify the token via the admin client.
 */
export async function getUserFromRequest(request: Request) {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.slice(7)
  const admin = await createAdminClient()
  const { data: { user }, error } = await admin.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}
