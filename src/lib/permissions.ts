import type { EventRoleName } from '@/types/event';

// All available permissions in the system
export type Permission =
  | 'deleteEvent'
  | 'editEventSettings'
  | 'manageVenues'
  | 'manageSchedule'
  | 'approveProposals'
  | 'sendCommunications'
  | 'manageTracks'
  | 'manageTrackSessions'
  | 'checkInAttendees'
  | 'viewAnalytics'
  | 'proposeSessions'
  | 'vote'
  | 'favorite';

// Role hierarchy (higher index = more permissions)
const ROLE_HIERARCHY: EventRoleName[] = [
  'attendee',
  'volunteer',
  'track_lead',
  'moderator',
  'admin',
  'owner',
];

// Permission matrix: which roles can perform each action
const PERMISSION_ROLES: Record<Permission, EventRoleName[]> = {
  deleteEvent: ['owner'],
  editEventSettings: ['owner', 'admin'],
  manageVenues: ['owner', 'admin'],
  manageSchedule: ['owner', 'admin'],
  approveProposals: ['owner', 'admin', 'moderator'],
  sendCommunications: ['owner', 'admin', 'moderator'],
  manageTracks: ['owner', 'admin'],
  manageTrackSessions: ['owner', 'admin', 'track_lead'],
  checkInAttendees: ['owner', 'admin', 'moderator', 'volunteer'],
  viewAnalytics: ['owner', 'admin', 'moderator', 'track_lead'],
  proposeSessions: ['owner', 'admin', 'moderator', 'track_lead', 'volunteer', 'attendee'],
  vote: ['owner', 'admin', 'moderator', 'track_lead', 'volunteer', 'attendee'],
  favorite: ['owner', 'admin', 'moderator', 'track_lead', 'volunteer', 'attendee'],
};

/**
 * Check if a role can perform a specific permission
 */
export function canRolePerform(role: EventRoleName, permission: Permission): boolean {
  return PERMISSION_ROLES[permission].includes(role);
}

/**
 * Get all permissions for a role
 */
export function getPermissionsForRole(role: EventRoleName): Permission[] {
  return (Object.keys(PERMISSION_ROLES) as Permission[]).filter((permission) =>
    PERMISSION_ROLES[permission].includes(role)
  );
}

/**
 * Check if one role is higher than another in the hierarchy
 */
export function isRoleHigherThan(role: EventRoleName, other: EventRoleName): boolean {
  return ROLE_HIERARCHY.indexOf(role) > ROLE_HIERARCHY.indexOf(other);
}

/**
 * Check if a role is at least admin level (owner or admin)
 */
export function isAdminRole(role: EventRoleName): boolean {
  return role === 'owner' || role === 'admin';
}

/**
 * Get a human-readable label for a role
 */
export function getRoleLabel(role: EventRoleName): string {
  const labels: Record<EventRoleName, string> = {
    owner: 'Owner',
    admin: 'Admin',
    moderator: 'Moderator',
    track_lead: 'Track Lead',
    volunteer: 'Volunteer',
    attendee: 'Attendee',
  };
  return labels[role];
}
