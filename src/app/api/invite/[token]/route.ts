import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

// GET /api/invite/[token] — Public invite lookup (no auth required)
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  const admin = await createAdminClient()

  const { data: invite, error } = await admin
    .from('cohost_invites')
    .select(`
      id,
      status,
      expires_at,
      session:sessions(
        id,
        title,
        description,
        format,
        duration,
        host_name,
        host:profiles!host_id(id, display_name, avatar_url)
      )
    `)
    .eq('token', token)
    .single()

  if (error || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Check expiry
  const isExpired = new Date(invite.expires_at) < new Date()
  const effectiveStatus = invite.status === 'pending' && isExpired ? 'expired' : invite.status

  return NextResponse.json({
    status: effectiveStatus,
    session: invite.session,
  })
}
