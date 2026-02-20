/**
 * Batch Session Operations API
 *
 * Allows admins to perform operations on multiple sessions at once:
 * - approve: Set status to 'approved'
 * - reject: Set status to 'rejected' (with optional reason)
 * - assign_track: Set track_id for selected sessions
 * - delete: Delete selected sessions
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { getUserFromRequest } from '@/lib/api/getUser'

type BatchAction = 'approve' | 'reject' | 'assign_track' | 'delete'

interface BatchRequestBody {
  action: BatchAction
  session_ids: string[]
  // For reject action
  reason?: string
  // For assign_track action
  track_id?: string | null
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // 1. Auth
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

  // 3. Check admin permission
  const { data: membership } = await supabase
    .from('event_members')
    .select('role')
    .eq('event_id', event.id)
    .eq('user_id', user.id)
    .single()

  if (!membership || !['owner', 'admin', 'moderator'].includes(membership.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // 4. Parse body
  let body: BatchRequestBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { action, session_ids, reason, track_id } = body

  // Validate
  if (!action || !['approve', 'reject', 'assign_track', 'delete'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  if (!session_ids || !Array.isArray(session_ids) || session_ids.length === 0) {
    return NextResponse.json({ error: 'session_ids must be a non-empty array' }, { status: 400 })
  }

  if (session_ids.length > 100) {
    return NextResponse.json({ error: 'Cannot operate on more than 100 sessions at once' }, { status: 400 })
  }

  // 5. Verify all sessions belong to this event
  const { data: sessions, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('event_id', event.id)
    .in('id', session_ids)

  if (sessionError) {
    console.error('Error verifying sessions:', sessionError)
    return NextResponse.json({ error: 'Failed to verify sessions' }, { status: 500 })
  }

  const validIds = new Set(sessions?.map((s) => s.id) || [])
  const invalidIds = session_ids.filter((id) => !validIds.has(id))

  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: 'Some sessions not found in this event', invalid_ids: invalidIds },
      { status: 400 }
    )
  }

  // 6. Execute action
  let result: { affected: number; error?: string }

  switch (action) {
    case 'approve': {
      const { error, count } = await supabase
        .from('sessions')
        .update({ status: 'approved' })
        .eq('event_id', event.id)
        .in('id', session_ids)
        .select()

      if (error) {
        console.error('Batch approve error:', error)
        return NextResponse.json({ error: 'Failed to approve sessions' }, { status: 500 })
      }

      result = { affected: count || session_ids.length }
      break
    }

    case 'reject': {
      // Store rejection reason in session if we add that field later
      // For now, just update status
      const { error, count } = await supabase
        .from('sessions')
        .update({ status: 'rejected' })
        .eq('event_id', event.id)
        .in('id', session_ids)
        .select()

      if (error) {
        console.error('Batch reject error:', error)
        return NextResponse.json({ error: 'Failed to reject sessions' }, { status: 500 })
      }

      // Create notifications for rejection (with reason if provided)
      // This will be handled by database triggers if they exist
      // Or we can create them explicitly here
      if (reason) {
        // Store reason in notifications created by trigger
        // The trigger creates notifications on status change
        console.log('Rejection reason:', reason, 'for sessions:', session_ids)
      }

      result = { affected: count || session_ids.length }
      break
    }

    case 'assign_track': {
      const updateData: { track_id: string | null } = {
        track_id: track_id || null,
      }

      // Verify track exists if provided
      if (track_id) {
        const { data: track } = await supabase
          .from('tracks')
          .select('id')
          .eq('id', track_id)
          .eq('event_id', event.id)
          .single()

        if (!track) {
          return NextResponse.json({ error: 'Track not found' }, { status: 400 })
        }
      }

      const { error, count } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('event_id', event.id)
        .in('id', session_ids)
        .select()

      if (error) {
        console.error('Batch assign track error:', error)
        return NextResponse.json({ error: 'Failed to assign track' }, { status: 500 })
      }

      result = { affected: count || session_ids.length }
      break
    }

    case 'delete': {
      // Only owners and admins can delete
      if (!['owner', 'admin'].includes(membership.role)) {
        return NextResponse.json({ error: 'Only owners and admins can delete sessions' }, { status: 403 })
      }

      const { error, count } = await supabase
        .from('sessions')
        .delete()
        .eq('event_id', event.id)
        .in('id', session_ids)
        .select()

      if (error) {
        console.error('Batch delete error:', error)
        return NextResponse.json({ error: 'Failed to delete sessions' }, { status: 500 })
      }

      result = { affected: count || session_ids.length }
      break
    }

    default:
      return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  }

  return NextResponse.json({
    success: true,
    action,
    affected: result.affected,
    message: `${action} completed for ${result.affected} session${result.affected !== 1 ? 's' : ''}`,
  })
}
