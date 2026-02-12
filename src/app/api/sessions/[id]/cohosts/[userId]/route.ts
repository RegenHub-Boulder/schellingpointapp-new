import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'

// DELETE /api/sessions/[id]/cohosts/[userId] — Remove a co-host
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { id: sessionId, userId } = await params

  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = await createAdminClient()

  // Fetch session to check ownership
  const { data: session } = await admin
    .from('sessions')
    .select('id, host_id')
    .eq('id', sessionId)
    .single()

  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 })
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  // Allow: primary host, admin, or the co-host removing themselves
  const isPrimaryHost = session.host_id === user.id
  const isAdmin = profile?.is_admin
  const isSelf = userId === user.id

  if (!isPrimaryHost && !isAdmin && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await admin
    .from('session_cohosts')
    .delete()
    .eq('session_id', sessionId)
    .eq('user_id', userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
