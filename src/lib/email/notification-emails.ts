/**
 * Email templates for all notification types
 * Uses the base template for consistent styling
 */

import { buildBaseEmail, type BaseEmailParams } from './base-template'

// Common event info interface
interface EventInfo {
  name: string
  slug: string
  logoUrl?: string
  dateRange?: string
  location?: string
}

// Build app URL for links
const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://schellingpoint.city'

// =============================================================================
// SESSION STATUS EMAILS
// =============================================================================

interface SessionStatusEmailParams {
  event: EventInfo
  hostName: string
  sessionTitle: string
  sessionId: string
}

export function buildSessionApprovedEmail(params: SessionStatusEmailParams) {
  const { event, hostName, sessionTitle, sessionId } = params

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: `Your session "${sessionTitle}" has been approved!`,
    heading: 'Session Approved!',
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${hostName},</p>
      <p style="margin: 0 0 16px 0;">Great news! Your session has been approved and is now visible to attendees:</p>
      <p style="margin: 0 0 16px 0; font-weight: 600; font-size: 17px; color: #ffffff;">"${sessionTitle}"</p>
      <p style="margin: 0;">Your session is now eligible for voting. Share it with others to gather support!</p>
    `,
    ctaUrl: `${appUrl}/e/${event.slug}/sessions/${sessionId}`,
    ctaText: 'View Your Session',
    footerNote: 'You can edit your session details or invite co-hosts from the session page.',
  }

  return {
    subject: `Your session "${sessionTitle}" has been approved! — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

export function buildSessionRejectedEmail(params: SessionStatusEmailParams & { reason?: string }) {
  const { event, hostName, sessionTitle, reason } = params

  const reasonHtml = reason
    ? `<p style="margin: 16px 0; padding: 12px 16px; background-color: #161b22; border-radius: 8px; border-left: 3px solid #8b949e; font-size: 14px; color: #8b949e;">${reason}</p>`
    : ''

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: `Update on your session "${sessionTitle}"`,
    heading: 'Session Update',
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${hostName},</p>
      <p style="margin: 0 0 16px 0;">Thank you for submitting a session proposal for ${event.name}.</p>
      <p style="margin: 0 0 8px 0;">Unfortunately, we weren't able to include your session in the program:</p>
      <p style="margin: 0 0 16px 0; font-weight: 500; color: #ffffff;">"${sessionTitle}"</p>
      ${reasonHtml}
      <p style="margin: 0;">We received many great submissions and had to make difficult choices. We hope to see you at the event!</p>
    `,
    footerNote: 'Feel free to reach out to the organizers if you have questions.',
  }

  return {
    subject: `Update on your session submission — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

// =============================================================================
// VOTE MILESTONE EMAIL
// =============================================================================

interface VoteMilestoneEmailParams {
  event: EventInfo
  hostName: string
  sessionTitle: string
  sessionId: string
  milestone: number
  totalVotes: number
}

export function buildVoteMilestoneEmail(params: VoteMilestoneEmailParams) {
  const { event, hostName, sessionTitle, sessionId, milestone, totalVotes } = params

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: `Your session reached ${milestone} votes!`,
    heading: `${milestone} Votes!`,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${hostName},</p>
      <p style="margin: 0 0 16px 0;">Your session is gaining traction!</p>
      <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 17px; color: #ffffff;">"${sessionTitle}"</p>
      <p style="margin: 0 0 16px 0;">Has now received <strong style="color: #B2FF00;">${totalVotes} votes</strong> from attendees.</p>
      <p style="margin: 0;">Keep sharing to boost your chances of being scheduled!</p>
    `,
    ctaUrl: `${appUrl}/e/${event.slug}/sessions/${sessionId}`,
    ctaText: 'View Your Session',
  }

  return {
    subject: `Your session reached ${milestone} votes! — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

// =============================================================================
// CO-HOST EMAILS
// =============================================================================

interface CohostInviteEmailParams {
  event: EventInfo
  inviteeName: string
  hostName: string
  sessionTitle: string
  inviteToken: string
}

export function buildCohostInviteEmail(params: CohostInviteEmailParams) {
  const { event, inviteeName, hostName, sessionTitle, inviteToken } = params

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: `${hostName} invited you to co-host "${sessionTitle}"`,
    heading: 'Co-host Invitation',
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${inviteeName},</p>
      <p style="margin: 0 0 16px 0;"><strong style="color: #ffffff;">${hostName}</strong> has invited you to co-host a session at ${event.name}:</p>
      <p style="margin: 0 0 16px 0; font-weight: 600; font-size: 17px; color: #ffffff;">"${sessionTitle}"</p>
      <p style="margin: 0;">Click below to view the session and accept the invitation.</p>
    `,
    ctaUrl: `${appUrl}/invite/${inviteToken}`,
    ctaText: 'View Invitation',
    footerNote: 'This invitation will expire in 7 days.',
  }

  return {
    subject: `${hostName} invited you to co-host a session — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

interface CohostResponseEmailParams {
  event: EventInfo
  hostName: string
  cohostName: string
  sessionTitle: string
  sessionId: string
  accepted: boolean
}

export function buildCohostResponseEmail(params: CohostResponseEmailParams) {
  const { event, hostName, cohostName, sessionTitle, sessionId, accepted } = params

  const heading = accepted ? 'Co-host Accepted!' : 'Co-host Declined'
  const message = accepted
    ? `<strong style="color: #ffffff;">${cohostName}</strong> accepted your invitation to co-host this session.`
    : `<strong style="color: #ffffff;">${cohostName}</strong> declined your invitation to co-host.`

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: `${cohostName} ${accepted ? 'accepted' : 'declined'} your co-host invitation`,
    heading,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${hostName},</p>
      <p style="margin: 0 0 16px 0;">${message}</p>
      <p style="margin: 0 0 16px 0; font-weight: 500; color: #ffffff;">"${sessionTitle}"</p>
    `,
    ctaUrl: `${appUrl}/e/${event.slug}/sessions/${sessionId}`,
    ctaText: 'View Session',
  }

  return {
    subject: `${cohostName} ${accepted ? 'accepted' : 'declined'} your co-host invitation — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

// =============================================================================
// ADMIN EMAILS
// =============================================================================

interface NewProposalEmailParams {
  event: EventInfo
  adminName: string
  sessionTitle: string
  hostName: string
  pendingCount: number
}

export function buildNewProposalEmail(params: NewProposalEmailParams) {
  const { event, adminName, sessionTitle, hostName, pendingCount } = params

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: `New session proposal: "${sessionTitle}" by ${hostName}`,
    heading: 'New Session Proposal',
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${adminName},</p>
      <p style="margin: 0 0 16px 0;">A new session has been proposed for ${event.name}:</p>
      <p style="margin: 0 0 8px 0; font-weight: 600; font-size: 17px; color: #ffffff;">"${sessionTitle}"</p>
      <p style="margin: 0 0 16px 0; color: #8b949e;">by ${hostName}</p>
      ${pendingCount > 1 ? `<p style="margin: 0;">You have <strong>${pendingCount} proposals</strong> waiting for review.</p>` : ''}
    `,
    ctaUrl: `${appUrl}/e/${event.slug}/admin/proposals`,
    ctaText: 'Review Proposals',
  }

  return {
    subject: `New proposal: "${sessionTitle}" — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

// =============================================================================
// EVENT ANNOUNCEMENT EMAILS
// =============================================================================

interface AnnouncementEmailParams {
  event: EventInfo
  recipientName: string
  title: string
  message: string
  ctaUrl?: string
  ctaText?: string
}

export function buildAnnouncementEmail(params: AnnouncementEmailParams) {
  const { event, recipientName, title, message, ctaUrl, ctaText } = params

  const baseParams: BaseEmailParams = {
    eventName: event.name,
    eventLogoUrl: event.logoUrl,
    eventDateRange: event.dateRange,
    eventLocation: event.location,
    previewText: title,
    heading: title,
    bodyHtml: `
      <p style="margin: 0 0 16px 0;">Hey ${recipientName},</p>
      <div style="margin: 0;">${message}</div>
    `,
    ctaUrl,
    ctaText,
  }

  return {
    subject: `${title} — ${event.name}`,
    html: buildBaseEmail(baseParams),
  }
}

export function buildVotingOpenEmail(params: { event: EventInfo; recipientName: string; votingEndsAt?: string }) {
  const { event, recipientName, votingEndsAt } = params

  const endsText = votingEndsAt
    ? `Voting is open until ${votingEndsAt}.`
    : 'Get your votes in before voting closes!'

  return buildAnnouncementEmail({
    event,
    recipientName,
    title: 'Voting is Now Open!',
    message: `
      <p style="margin: 0 0 16px 0;">It's time to vote for the sessions you want to see at ${event.name}!</p>
      <p style="margin: 0 0 16px 0;">Browse the session proposals and use your vote credits to support the topics that interest you most.</p>
      <p style="margin: 0;">${endsText}</p>
    `,
    ctaUrl: `${appUrl}/e/${event.slug}/sessions`,
    ctaText: 'Start Voting',
  })
}

export function buildSchedulePublishedEmail(params: { event: EventInfo; recipientName: string }) {
  const { event, recipientName } = params

  return buildAnnouncementEmail({
    event,
    recipientName,
    title: 'The Schedule is Live!',
    message: `
      <p style="margin: 0 0 16px 0;">The official schedule for ${event.name} has been published!</p>
      <p style="margin: 0;">Check out all the sessions, plan your day, and add your favorites to your personal schedule.</p>
    `,
    ctaUrl: `${appUrl}/e/${event.slug}/schedule`,
    ctaText: 'View Schedule',
  })
}
