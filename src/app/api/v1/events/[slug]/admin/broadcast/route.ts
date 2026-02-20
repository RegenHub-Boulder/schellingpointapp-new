/**
 * Admin Broadcast API
 *
 * Allows event admins to send announcements to all event members.
 * Creates notifications for each member, which are then dispatched via email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // 1. Auth: verify user
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // 2. Get event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id, name')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // 3. Verify user is admin/owner of this event
  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Parse request body
  let body: { title: string; message: string; ctaUrl?: string; ctaText?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!body.title || typeof body.title !== 'string' || !body.title.trim()) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }

  if (!body.message || typeof body.message !== 'string' || !body.message.trim()) {
    return NextResponse.json({ error: 'Message is required' }, { status: 400 })
  }

  // 5. Get all event members (excluding the sender)
  const { data: members, error: membersError } = await supabase
    .from('event_members')
    .select('user_id')
    .eq('event_id', event.id)
    .neq('user_id', user.id)

  if (membersError) {
    console.error('Error fetching members:', membersError)
    return NextResponse.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  if (!members || members.length === 0) {
    return NextResponse.json({ message: 'No members to notify', sent: 0 })
  }

  // 6. Create notifications for all members
  const notifications = members.map((member) => ({
    user_id: member.user_id,
    event_id: event.id,
    type: 'admin_announcement',
    title: body.title.trim(),
    body: body.message.trim(),
    action_url: body.ctaUrl || `/e/${slug}`,
    data: {
      cta_text: body.ctaText,
      sent_by: user.id,
    },
  }))

  const { error: insertError } = await supabase
    .from('notifications')
    .insert(notifications)

  if (insertError) {
    console.error('Error creating notifications:', insertError)
    return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    sent: members.length,
    message: `Announcement sent to ${members.length} member${members.length !== 1 ? 's' : ''}`,
  })
}

// Get recent broadcasts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // 1. Auth: verify user
  const user = await getUserFromRequest(request)
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()

  // 2. Get event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .select('id')
    .eq('slug', slug)
    .single()

  if (eventError || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 })
  }

  // 3. Verify user is admin/owner
  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Get recent admin announcements (deduplicated by title + created_at minute)
  const { data: broadcasts, error: broadcastsError } = await supabase
    .from('notifications')
    .select('title, body, action_url, data, created_at')
    .eq('event_id', event.id)
    .eq('type', 'admin_announcement')
    .order('created_at', { ascending: false })
    .limit(100)

  if (broadcastsError) {
    console.error('Error fetching broadcasts:', broadcastsError)
    return NextResponse.json({ error: 'Failed to fetch broadcasts' }, { status: 500 })
  }

  // Deduplicate by title + minute
  const seen = new Set<string>()
  const uniqueBroadcasts = (broadcasts || []).filter((b) => {
    const minute = new Date(b.created_at).toISOString().slice(0, 16)
    const key = `${b.title}-${minute}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })

  return NextResponse.json({ broadcasts: uniqueBroadcasts.slice(0, 10) })
}
