/**
 * Notification Dispatch API
 *
 * Processes pending notifications and sends emails via Resend.
 * Can be called by:
 * - Cron job (e.g., Vercel cron)
 * - Supabase Edge Function webhook
 * - Manual trigger from admin
 *
 * Uses bearer token auth for security.
 */

import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createAdminClient } from '@/lib/supabase/server'
import {
  buildSessionApprovedEmail,
  buildSessionRejectedEmail,
  buildVoteMilestoneEmail,
  buildCohostInviteEmail,
  buildCohostResponseEmail,
  buildNewProposalEmail,
  buildAnnouncementEmail,
  buildVotingOpenEmail,
  buildSchedulePublishedEmail,
} from '@/lib/email/notification-emails'

const BATCH_SIZE = 50 // Process up to 50 notifications per request
const resend = new Resend(process.env.RESEND_API_KEY)

// Verify cron/webhook secret
function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.warn('CRON_SECRET not set, allowing request in development')
    return process.env.NODE_ENV === 'development'
  }

  return authHeader === `Bearer ${cronSecret}`
}

interface NotificationRow {
  id: string
  user_id: string
  event_id: string | null
  type: string
  title: string
  body: string | null
  data: Record<string, unknown> | null
  action_url: string | null
  created_at: string
  email_sent_at: string | null
}

interface EventRow {
  id: string
  slug: string
  name: string
  logo_url: string | null
  start_date: string | null
  end_date: string | null
  location_name: string | null
}

interface ProfileRow {
  id: string
  email: string
  display_name: string | null
}

export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminClient()
  const results = { processed: 0, sent: 0, skipped: 0, errors: [] as string[] }

  try {
    // Fetch pending notifications (not yet sent via email)
    const { data: notifications, error: fetchError } = await supabase
      .from('notifications')
      .select('*')
      .is('email_sent_at', null)
      .order('created_at', { ascending: true })
      .limit(BATCH_SIZE)

    if (fetchError) throw fetchError

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ message: 'No pending notifications', ...results })
    }

    // Process each notification
    for (const notification of notifications as NotificationRow[]) {
      results.processed++

      try {
        // Get user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, display_name')
          .eq('id', notification.user_id)
          .single()

        if (!profile?.email) {
          results.skipped++
          // Mark as sent to avoid reprocessing
          await markAsSent(supabase, notification.id)
          continue
        }

        // Check user preferences
        const shouldSend = await checkEmailPreference(supabase, notification)
        if (!shouldSend) {
          results.skipped++
          await markAsSent(supabase, notification.id)
          continue
        }

        // Get event info if applicable
        let event: EventRow | null = null
        if (notification.event_id) {
          const { data: eventData } = await supabase
            .from('events')
            .select('id, slug, name, logo_url, start_date, end_date, location_name')
            .eq('id', notification.event_id)
            .single()
          event = eventData
        }

        // Build email content based on notification type
        const email = await buildEmailForNotification(
          notification,
          profile as ProfileRow,
          event,
          supabase
        )

        if (!email) {
          results.skipped++
          await markAsSent(supabase, notification.id)
          continue
        }

        // Send email via Resend
        const fromEmail = process.env.RESEND_FROM_EMAIL || 'hello@schellingpoint.city'
        const fromName = event?.name || 'Schelling Point'

        const { error: sendError } = await resend.emails.send({
          from: `${fromName} <${fromEmail}>`,
          to: profile.email,
          subject: email.subject,
          html: email.html,
        })

        if (sendError) {
          results.errors.push(`${notification.id}: ${sendError.message}`)
          continue
        }

        // Mark as sent
        await markAsSent(supabase, notification.id)
        results.sent++
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.errors.push(`${notification.id}: ${message}`)
      }
    }

    return NextResponse.json({
      message: 'Dispatch complete',
      ...results,
    })
  } catch (err) {
    console.error('Notification dispatch error:', err)
    return NextResponse.json(
      { error: 'Dispatch failed', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// Mark notification as email sent
async function markAsSent(supabase: Awaited<ReturnType<typeof createAdminClient>>, notificationId: string) {
  await supabase
    .from('notifications')
    .update({ email_sent_at: new Date().toISOString() })
    .eq('id', notificationId)
}

// Check if user wants email for this notification type
async function checkEmailPreference(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  notification: NotificationRow
): Promise<boolean> {
  // Use database helper function
  const { data } = await supabase.rpc('should_send_notification', {
    p_user_id: notification.user_id,
    p_event_id: notification.event_id,
    p_type: notification.type,
    p_channel: 'email',
  })

  return data ?? true // Default to true if function fails
}

// Build email content for a notification
async function buildEmailForNotification(
  notification: NotificationRow,
  profile: ProfileRow,
  event: EventRow | null,
  supabase: Awaited<ReturnType<typeof createAdminClient>>
): Promise<{ subject: string; html: string } | null> {
  const recipientName = profile.display_name || 'there'
  const data = notification.data || {}

  // Build event info object
  const eventInfo = event
    ? {
        name: event.name,
        slug: event.slug,
        logoUrl: event.logo_url || undefined,
        dateRange: formatEventDateRange(event.start_date, event.end_date),
        location: event.location_name || undefined,
      }
    : {
        name: 'Schelling Point',
        slug: '',
        logoUrl: undefined,
        dateRange: undefined,
        location: undefined,
      }

  switch (notification.type) {
    case 'session_approved':
      return buildSessionApprovedEmail({
        event: eventInfo,
        hostName: recipientName,
        sessionTitle: (data.session_title as string) || notification.title,
        sessionId: data.session_id as string,
      })

    case 'session_rejected':
      return buildSessionRejectedEmail({
        event: eventInfo,
        hostName: recipientName,
        sessionTitle: (data.session_title as string) || notification.title,
        sessionId: data.session_id as string,
        reason: data.reason as string | undefined,
      })

    case 'vote_milestone':
      return buildVoteMilestoneEmail({
        event: eventInfo,
        hostName: recipientName,
        sessionTitle: (data.session_title as string) || notification.title,
        sessionId: data.session_id as string,
        milestone: (data.milestone as number) || 10,
        totalVotes: (data.total_votes as number) || 10,
      })

    case 'cohost_invited':
      // Need to get host name from session
      const sessionId = data.session_id as string
      const { data: session } = await supabase
        .from('sessions')
        .select('host_name')
        .eq('id', sessionId)
        .single()

      return buildCohostInviteEmail({
        event: eventInfo,
        inviteeName: recipientName,
        hostName: session?.host_name || 'Someone',
        sessionTitle: (data.session_title as string) || notification.title,
        inviteToken: data.invite_token as string,
      })

    case 'cohost_accepted':
    case 'cohost_declined':
      return buildCohostResponseEmail({
        event: eventInfo,
        hostName: recipientName,
        cohostName: (data.cohost_name as string) || 'Someone',
        sessionTitle: (data.session_title as string) || notification.title,
        sessionId: data.session_id as string,
        accepted: notification.type === 'cohost_accepted',
      })

    case 'new_proposal':
      return buildNewProposalEmail({
        event: eventInfo,
        adminName: recipientName,
        sessionTitle: (data.session_title as string) || notification.title,
        hostName: (data.host_name as string) || 'Someone',
        pendingCount: 1, // Could query for actual count
      })

    case 'voting_opened':
      return buildVotingOpenEmail({
        event: eventInfo,
        recipientName,
        votingEndsAt: data.voting_ends_at as string | undefined,
      })

    case 'schedule_published':
      return buildSchedulePublishedEmail({
        event: eventInfo,
        recipientName,
      })

    case 'admin_announcement':
      return buildAnnouncementEmail({
        event: eventInfo,
        recipientName,
        title: notification.title,
        message: notification.body || '',
        ctaUrl: notification.action_url || undefined,
        ctaText: data.cta_text as string | undefined,
      })

    default:
      // Generic notification - use announcement template
      return buildAnnouncementEmail({
        event: eventInfo,
        recipientName,
        title: notification.title,
        message: notification.body || '',
        ctaUrl: notification.action_url || undefined,
      })
  }
}

// Format event date range for email footer
function formatEventDateRange(startDate: string | null, endDate: string | null): string | undefined {
  if (!startDate || !endDate) return undefined

  const start = new Date(startDate)
  const end = new Date(endDate)
  const startMonth = start.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  const endMonth = end.toLocaleDateString('en-US', { month: 'long', timeZone: 'UTC' })
  const startDay = start.getUTCDate()
  const endDay = end.getUTCDate()
  const year = start.getUTCFullYear()

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}, ${year}`
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`
  }
}

// Also support GET for cron job verification
export async function GET() {
  return NextResponse.json({ status: 'ok', endpoint: 'notification-dispatch' })
}
