import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'

// POST /api/invite/[token]/accept — Accept a co-host invite
export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  if (!token || token.length !== 64) {
    return NextResponse.json({ error: 'Invalid invite token' }, { status: 400 })
  }

  // Require authentication
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'You must be signed in to accept an invite' }, { status: 401 })
  }

  const admin = await createAdminClient()

  // Fetch the invite
  const { data: invite, error: fetchError } = await admin
    .from('cohost_invites')
    .select('id, session_id, status, expires_at')
    .eq('token', token)
    .single()

  if (fetchError || !invite) {
    return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
  }

  // Validate status
  if (invite.status !== 'pending') {
    return NextResponse.json({ error: `Invite is ${invite.status}` }, { status: 400 })
  }

  // Check expiry
  if (new Date(invite.expires_at) < new Date()) {
    await admin.from('cohost_invites').update({ status: 'expired' }).eq('id', invite.id)
    return NextResponse.json({ error: 'Invite has expired' }, { status: 400 })
  }

  // Check if user is already the primary host
  const { data: session } = await admin
    .from('sessions')
    .select('host_id')
    .eq('id', invite.session_id)
    .single()

  if (session?.host_id === user.id) {
    return NextResponse.json({ error: 'You are already the primary host of this session' }, { status: 400 })
  }

  // Check if already a co-host
  const { data: existing } = await admin
    .from('session_cohosts')
    .select('id')
    .eq('session_id', invite.session_id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({
      error: 'You are already a co-host of this session',
      session_id: invite.session_id,
    }, { status: 409 })
  }

  // Add as co-host
  const { error: insertError } = await admin
    .from('session_cohosts')
    .insert({
      session_id: invite.session_id,
      user_id: user.id,
    })

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  // Mark invite as accepted
  await admin
    .from('cohost_invites')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
    })
    .eq('id', invite.id)

  return NextResponse.json({ session_id: invite.session_id })
}
