import { EventStatus } from '@/types/event';

/**
 * Event Lifecycle State Machine
 *
 * Events progress through these phases:
 * draft -> published -> proposals_open -> voting_open -> scheduling -> live -> completed -> archived
 *
 * Each phase enables/disables certain features:
 * - draft: Event being configured, not visible
 * - published: Event visible, but proposals/voting not open yet
 * - proposals_open: Attendees can submit session proposals
 * - voting_open: Attendees can vote on proposals
 * - scheduling: Admin is finalizing the schedule
 * - live: Event is happening
 * - completed: Event has ended
 * - archived: Event is no longer relevant
 */

/**
 * Valid state transitions map.
 * Each key is a status, and the value is an array of valid next statuses.
 */
export const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  draft: ['published'],
  published: ['proposals_open', 'draft'],
  proposals_open: ['voting_open', 'published'],
  voting_open: ['scheduling', 'proposals_open'],
  scheduling: ['live', 'voting_open'],
  live: ['completed'], // No going back from live
  completed: ['archived'],
  archived: [], // Terminal state
};

/**
 * Ordered list of statuses in the lifecycle (forward direction only)
 */
const STATUS_ORDER: EventStatus[] = [
  'draft',
  'published',
  'proposals_open',
  'voting_open',
  'scheduling',
  'live',
  'completed',
  'archived',
];

/**
 * Check if a transition from one status to another is valid.
 */
export function isValidTransition(from: EventStatus, to: EventStatus): boolean {
  const validNextStatuses = STATUS_TRANSITIONS[from];
  return validNextStatuses.includes(to);
}

/**
 * Get list of valid next statuses from current status.
 */
export function getNextValidStatuses(current: EventStatus): EventStatus[] {
  return STATUS_TRANSITIONS[current];
}

/**
 * Get the previous status in the lifecycle (for reverting).
 * Returns null if there is no previous status (draft is the first).
 */
export function getPreviousStatus(current: EventStatus): EventStatus | null {
  const currentIndex = STATUS_ORDER.indexOf(current);
  if (currentIndex <= 0) {
    return null;
  }
  return STATUS_ORDER[currentIndex - 1];
}

/**
 * Check if proposals can be submitted in the given status.
 * Proposals can only be submitted when the event is in proposals_open status.
 */
export function canSubmitProposals(status: EventStatus): boolean {
  return status === 'proposals_open';
}

/**
 * Check if voting is allowed in the given status.
 * Voting can only happen when the event is in voting_open status.
 */
export function canVote(status: EventStatus): boolean {
  return status === 'voting_open';
}

/**
 * Check if scheduling is allowed in the given status.
 * Scheduling can happen during the scheduling phase.
 */
export function canSchedule(status: EventStatus): boolean {
  return status === 'scheduling';
}

/**
 * Check if the event is considered active (visible and operational).
 * Events are active from published through completed.
 */
export function isEventActive(status: EventStatus): boolean {
  const activeStatuses: EventStatus[] = [
    'published',
    'proposals_open',
    'voting_open',
    'scheduling',
    'live',
    'completed',
  ];
  return activeStatuses.includes(status);
}

/**
 * Check if the event is publicly visible.
 * Events are visible from published onwards (except archived).
 */
export function isEventVisible(status: EventStatus): boolean {
  return status !== 'draft' && status !== 'archived';
}

/**
 * Check if the event is in a phase where content can be modified.
 * Content can be modified in draft, published, proposals_open, voting_open, and scheduling.
 */
export function canModifyContent(status: EventStatus): boolean {
  const modifiableStatuses: EventStatus[] = [
    'draft',
    'published',
    'proposals_open',
    'voting_open',
    'scheduling',
  ];
  return modifiableStatuses.includes(status);
}

/**
 * Status metadata for UI display
 */
export interface StatusInfo {
  label: string;
  description: string;
  color: string; // Tailwind color class
}

/**
 * Status information for UI display.
 * Includes human-readable labels, descriptions, and Tailwind color classes.
 */
export const STATUS_INFO: Record<EventStatus, StatusInfo> = {
  draft: {
    label: 'Draft',
    description: 'Event is being configured and is not visible to attendees',
    color: 'bg-gray-500',
  },
  published: {
    label: 'Published',
    description: 'Event is visible but proposals and voting are not yet open',
    color: 'bg-blue-500',
  },
  proposals_open: {
    label: 'Proposals Open',
    description: 'Attendees can submit session proposals',
    color: 'bg-purple-500',
  },
  voting_open: {
    label: 'Voting Open',
    description: 'Attendees can vote on submitted proposals',
    color: 'bg-amber-500',
  },
  scheduling: {
    label: 'Scheduling',
    description: 'Admin is finalizing the event schedule',
    color: 'bg-orange-500',
  },
  live: {
    label: 'Live',
    description: 'Event is currently happening',
    color: 'bg-green-500',
  },
  completed: {
    label: 'Completed',
    description: 'Event has ended',
    color: 'bg-teal-500',
  },
  archived: {
    label: 'Archived',
    description: 'Event is no longer relevant and hidden from listings',
    color: 'bg-slate-500',
  },
};

/**
 * Get the index of a status in the lifecycle order.
 * Useful for comparing status progression.
 */
export function getStatusIndex(status: EventStatus): number {
  return STATUS_ORDER.indexOf(status);
}

/**
 * Check if one status comes before another in the lifecycle.
 */
export function isStatusBefore(
  status: EventStatus,
  comparedTo: EventStatus
): boolean {
  return getStatusIndex(status) < getStatusIndex(comparedTo);
}

/**
 * Check if one status comes after another in the lifecycle.
 */
export function isStatusAfter(
  status: EventStatus,
  comparedTo: EventStatus
): boolean {
  return getStatusIndex(status) > getStatusIndex(comparedTo);
}

/**
 * Get all statuses between two statuses (exclusive).
 */
export function getStatusesBetween(
  from: EventStatus,
  to: EventStatus
): EventStatus[] {
  const fromIndex = getStatusIndex(from);
  const toIndex = getStatusIndex(to);

  if (fromIndex >= toIndex) {
    return [];
  }

  return STATUS_ORDER.slice(fromIndex + 1, toIndex);
}
