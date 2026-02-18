# Phase 1: Multi-Tenant Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Establish multi-tenant data model with event-scoped routing while maintaining EthBoulder functionality.

**Architecture:** Database-first migration adding `events` table as core tenant entity, `event_members` for role-based access, and `event_id` foreign keys on all data tables. New `/e/[slug]/*` routes replace global routes.

**Tech Stack:** Supabase (PostgreSQL + RLS), Next.js App Router, React Context, TypeScript

---

## Task 1: Create Events Table Migration

**Files:**
- Create: `supabase/migrations/20260217000001_create_events_table.sql`

**Step 1: Write the migration file**

```sql
-- Create events table (core tenant entity)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,

  -- Dates & Location
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Denver',
  location_name TEXT,
  location_address TEXT,
  location_geo POINT,

  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'voting', 'scheduling', 'live', 'completed', 'archived'
  )),

  -- Voting Configuration
  vote_credits_per_user INTEGER DEFAULT 100,
  voting_opens_at TIMESTAMPTZ,
  voting_closes_at TIMESTAMPTZ,
  proposals_open_at TIMESTAMPTZ,
  proposals_close_at TIMESTAMPTZ,

  -- Proposal Configuration
  allowed_formats TEXT[] DEFAULT ARRAY['talk','workshop','discussion','panel','demo'],
  allowed_durations INTEGER[] DEFAULT ARRAY[15,30,60,90],
  max_proposals_per_user INTEGER DEFAULT 5,
  require_proposal_approval BOOLEAN DEFAULT TRUE,

  -- Capacity
  max_attendees INTEGER,

  -- Branding
  theme JSONB DEFAULT '{}',
  logo_url TEXT,
  banner_url TEXT,
  favicon_url TEXT,

  -- Owner
  created_by UUID REFERENCES profiles(id),

  -- Metadata
  is_featured BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can view public/unlisted events
CREATE POLICY "Anyone can view public events" ON events FOR SELECT
  USING (visibility IN ('public', 'unlisted'));

-- Event creation requires authentication
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed EthBoulder 2026 event
INSERT INTO events (
  slug, name, tagline, description,
  start_date, end_date, timezone,
  location_name,
  status, vote_credits_per_user,
  allowed_formats, allowed_durations,
  max_proposals_per_user, require_proposal_approval
) VALUES (
  'ethboulder-2026',
  'EthBoulder 2026',
  'Fork The Frontier',
  'An unconference for Ethereum builders in Boulder, Colorado',
  '2026-02-27',
  '2026-03-01',
  'America/Denver',
  'Boulder, CO',
  'completed',
  100,
  ARRAY['talk','workshop','discussion','panel','demo'],
  ARRAY[15,30,60,90],
  5,
  TRUE
);
```

**Step 2: Verify migration file exists**

Run: `ls -la supabase/migrations/20260217000001_create_events_table.sql`
Expected: File exists with correct content

**Step 3: Commit**

```bash
git add supabase/migrations/20260217000001_create_events_table.sql
git commit -m "feat(db): create events table with EthBoulder seed data"
```

---

## Task 2: Add event_id Columns to Existing Tables

**Files:**
- Create: `supabase/migrations/20260217000002_add_event_id_columns.sql`

**Step 1: Write the migration file**

```sql
-- Add nullable event_id columns to all tables
-- They will be backfilled and made NOT NULL in the next migration

-- Sessions
ALTER TABLE sessions ADD COLUMN event_id UUID REFERENCES events(id);

-- Votes
ALTER TABLE votes ADD COLUMN event_id UUID REFERENCES events(id);

-- Venues
ALTER TABLE venues ADD COLUMN event_id UUID REFERENCES events(id);

-- Time slots
ALTER TABLE time_slots ADD COLUMN event_id UUID REFERENCES events(id);

-- Tracks (also add the enhanced columns from strategy)
ALTER TABLE tracks ADD COLUMN event_id UUID REFERENCES events(id);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lead_user_id UUID REFERENCES profiles(id);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS max_sessions INTEGER;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Favorites
ALTER TABLE favorites ADD COLUMN event_id UUID REFERENCES events(id);

-- Session cohosts
ALTER TABLE session_cohosts ADD COLUMN event_id UUID REFERENCES events(id);

-- Cohost invites
ALTER TABLE cohost_invites ADD COLUMN event_id UUID REFERENCES events(id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260217000002_add_event_id_columns.sql
git commit -m "feat(db): add nullable event_id columns to all tables"
```

---

## Task 3: Backfill event_id and Add Constraints

**Files:**
- Create: `supabase/migrations/20260217000003_backfill_event_ids.sql`

**Step 1: Write the migration file**

```sql
-- Backfill all existing data with EthBoulder event ID
DO $$
DECLARE
  ethboulder_id UUID;
BEGIN
  SELECT id INTO ethboulder_id FROM events WHERE slug = 'ethboulder-2026';

  -- Backfill each table
  UPDATE sessions SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE votes SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE venues SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE time_slots SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE tracks SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE favorites SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE session_cohosts SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE cohost_invites SET event_id = ethboulder_id WHERE event_id IS NULL;
END $$;

-- Add NOT NULL constraints
ALTER TABLE sessions ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE votes ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE venues ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE time_slots ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE favorites ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE session_cohosts ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE cohost_invites ALTER COLUMN event_id SET NOT NULL;

-- Add ON DELETE CASCADE
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_event_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_event_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_event_id_fkey;
ALTER TABLE venues ADD CONSTRAINT venues_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_event_id_fkey;
ALTER TABLE time_slots ADD CONSTRAINT time_slots_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_event_id_fkey;
ALTER TABLE tracks ADD CONSTRAINT tracks_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_event_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE session_cohosts DROP CONSTRAINT IF EXISTS session_cohosts_event_id_fkey;
ALTER TABLE session_cohosts ADD CONSTRAINT session_cohosts_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE cohost_invites DROP CONSTRAINT IF EXISTS cohost_invites_event_id_fkey;
ALTER TABLE cohost_invites ADD CONSTRAINT cohost_invites_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Add indexes for query performance
CREATE INDEX idx_sessions_event_status ON sessions(event_id, status);
CREATE INDEX idx_sessions_event_votes ON sessions(event_id, total_votes DESC);
CREATE INDEX idx_votes_event_user ON votes(event_id, user_id);
CREATE INDEX idx_venues_event ON venues(event_id);
CREATE INDEX idx_time_slots_event ON time_slots(event_id);
CREATE INDEX idx_tracks_event ON tracks(event_id);
CREATE INDEX idx_favorites_event ON favorites(event_id);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260217000003_backfill_event_ids.sql
git commit -m "feat(db): backfill event_ids and add NOT NULL constraints"
```

---

## Task 4: Create event_members Table

**Files:**
- Create: `supabase/migrations/20260217000004_create_event_members.sql`

**Step 1: Write the migration file**

```sql
-- Create event_members table (replaces is_admin)
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN (
    'owner', 'admin', 'moderator', 'track_lead', 'volunteer', 'attendee'
  )),
  vote_credits INTEGER,  -- overrides event default if set
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);
CREATE INDEX idx_event_members_role ON event_members(event_id, role);

-- RLS
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members of events they belong to
CREATE POLICY "Event members can view membership" ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
    )
  );

-- Users can leave events (delete own membership)
CREATE POLICY "Users can leave events" ON event_members FOR DELETE
  USING (user_id = auth.uid());

-- Owners/admins can manage members
CREATE POLICY "Event admins can manage members" ON event_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
    )
  );

-- Users can join public events as attendees
CREATE POLICY "Users can join public events" ON event_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'attendee'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
      AND e.visibility = 'public'
    )
  );

-- Migrate existing admins to event_members
INSERT INTO event_members (event_id, user_id, role)
SELECT
  (SELECT id FROM events WHERE slug = 'ethboulder-2026'),
  id,
  'admin'
FROM profiles WHERE is_admin = true
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Set the first admin as owner
UPDATE event_members
SET role = 'owner'
WHERE id = (
  SELECT em.id FROM event_members em
  JOIN profiles p ON em.user_id = p.id
  WHERE em.event_id = (SELECT id FROM events WHERE slug = 'ethboulder-2026')
  AND p.is_admin = true
  ORDER BY p.created_at ASC
  LIMIT 1
);

-- Migrate all other users as attendees
INSERT INTO event_members (event_id, user_id, role)
SELECT
  (SELECT id FROM events WHERE slug = 'ethboulder-2026'),
  id,
  'attendee'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM event_members em
  WHERE em.user_id = profiles.id
  AND em.event_id = (SELECT id FROM events WHERE slug = 'ethboulder-2026')
)
ON CONFLICT (event_id, user_id) DO NOTHING;
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260217000004_create_event_members.sql
git commit -m "feat(db): create event_members table with role migration"
```

---

## Task 5: Update RLS Policies for Event Scoping

**Files:**
- Create: `supabase/migrations/20260217000005_update_rls_policies.sql`

**Step 1: Write the migration file**

```sql
-- Update all RLS policies to use event_members instead of is_admin

-- =============================================================================
-- SESSIONS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all sessions" ON sessions;

CREATE POLICY "Event admins can manage sessions" ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = sessions.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Update insert policy to check event membership
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON sessions;

CREATE POLICY "Event members can create sessions" ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = sessions.event_id
      AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- VENUES
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage venues" ON venues;

CREATE POLICY "Event admins can manage venues" ON venues FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = venues.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- TIME SLOTS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;

CREATE POLICY "Event admins can manage time slots" ON time_slots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = time_slots.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- VOTES
-- =============================================================================
-- Votes are already scoped to user_id, but add event membership check

DROP POLICY IF EXISTS "Users can view own votes" ON votes;
CREATE POLICY "Users can view own votes" ON votes FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create votes" ON votes;
CREATE POLICY "Users can create votes" ON votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own votes" ON votes;
CREATE POLICY "Users can update own votes" ON votes FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own votes" ON votes;
CREATE POLICY "Users can delete own votes" ON votes FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- FAVORITES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = favorites.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
CREATE POLICY "Users can create favorites" ON favorites FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = favorites.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = favorites.event_id
      AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- TRACKS
-- =============================================================================
-- Add admin management policy for tracks
CREATE POLICY "Event admins can manage tracks" ON tracks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = tracks.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Track leads can update their track
CREATE POLICY "Track leads can manage their tracks" ON tracks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = tracks.event_id
    AND em.user_id = auth.uid()
    AND em.role = 'track_lead'
  )
  AND lead_user_id = auth.uid()
);
```

**Step 2: Commit**

```bash
git add supabase/migrations/20260217000005_update_rls_policies.sql
git commit -m "feat(db): update RLS policies for event-scoped access"
```

---

## Task 6: Create TypeScript Types for Events

**Files:**
- Create: `src/types/event.ts`

**Step 1: Write the types file**

```typescript
// Event status lifecycle
export type EventStatus =
  | 'draft'
  | 'published'
  | 'voting'
  | 'scheduling'
  | 'live'
  | 'completed'
  | 'archived';

// Event visibility levels
export type EventVisibility = 'public' | 'unlisted' | 'private';

// Event role hierarchy
export type EventRoleName =
  | 'owner'
  | 'admin'
  | 'moderator'
  | 'track_lead'
  | 'volunteer'
  | 'attendee';

// Event theme configuration
export interface EventTheme {
  colors?: {
    primary?: string;
    primaryForeground?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
    muted?: string;
    destructive?: string;
  };
  fonts?: {
    display?: string;
    body?: string;
  };
  mode?: 'dark' | 'light' | 'system';
  borderRadius?: string;
  style?: 'glassmorphism' | 'flat' | 'neumorphism' | 'minimal';
  social?: {
    twitter?: string;
    telegram?: string;
    discord?: string;
    website?: string;
  };
  heroTitle?: string;
  heroSubtitle?: string;
  heroCta?: string;
  footerText?: string;
}

// Database event row
export interface EventRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  start_date: string;
  end_date: string;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  location_geo: { x: number; y: number } | null;
  status: EventStatus;
  vote_credits_per_user: number;
  voting_opens_at: string | null;
  voting_closes_at: string | null;
  proposals_open_at: string | null;
  proposals_close_at: string | null;
  allowed_formats: string[];
  allowed_durations: number[];
  max_proposals_per_user: number;
  require_proposal_approval: boolean;
  max_attendees: number | null;
  theme: EventTheme;
  logo_url: string | null;
  banner_url: string | null;
  favicon_url: string | null;
  created_by: string | null;
  is_featured: boolean;
  visibility: EventVisibility;
  created_at: string;
  updated_at: string;
}

// Transformed event for frontend use (camelCase)
export interface Event {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  startDate: Date;
  endDate: Date;
  timezone: string;
  locationName: string | null;
  locationAddress: string | null;
  status: EventStatus;
  voteCreditsPerUser: number;
  votingOpensAt: Date | null;
  votingClosesAt: Date | null;
  proposalsOpenAt: Date | null;
  proposalsClosesAt: Date | null;
  allowedFormats: string[];
  allowedDurations: number[];
  maxProposalsPerUser: number;
  requireProposalApproval: boolean;
  maxAttendees: number | null;
  theme: EventTheme;
  logoUrl: string | null;
  bannerUrl: string | null;
  faviconUrl: string | null;
  isFeatured: boolean;
  visibility: EventVisibility;
}

// Event member relationship
export interface EventMember {
  id: string;
  eventId: string;
  userId: string;
  role: EventRoleName;
  voteCredits: number | null;
  joinedAt: Date;
}

// Transform database row to frontend type
export function transformEventRow(row: EventRow): Event {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    tagline: row.tagline,
    description: row.description,
    startDate: new Date(row.start_date),
    endDate: new Date(row.end_date),
    timezone: row.timezone,
    locationName: row.location_name,
    locationAddress: row.location_address,
    status: row.status,
    voteCreditsPerUser: row.vote_credits_per_user,
    votingOpensAt: row.voting_opens_at ? new Date(row.voting_opens_at) : null,
    votingClosesAt: row.voting_closes_at ? new Date(row.voting_closes_at) : null,
    proposalsOpenAt: row.proposals_open_at ? new Date(row.proposals_open_at) : null,
    proposalsClosesAt: row.proposals_close_at ? new Date(row.proposals_close_at) : null,
    allowedFormats: row.allowed_formats,
    allowedDurations: row.allowed_durations,
    maxProposalsPerUser: row.max_proposals_per_user,
    requireProposalApproval: row.require_proposal_approval,
    maxAttendees: row.max_attendees,
    theme: row.theme,
    logoUrl: row.logo_url,
    bannerUrl: row.banner_url,
    faviconUrl: row.favicon_url,
    isFeatured: row.is_featured,
    visibility: row.visibility,
  };
}
```

**Step 2: Commit**

```bash
git add src/types/event.ts
git commit -m "feat(types): add Event and EventMember TypeScript types"
```

---

## Task 7: Create Permissions Utility

**Files:**
- Create: `src/lib/permissions.ts`

**Step 1: Write the permissions file**

```typescript
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
```

**Step 2: Commit**

```bash
git add src/lib/permissions.ts
git commit -m "feat(lib): add permissions utility with role matrix"
```

---

## Task 8: Create Event Data Access Functions

**Files:**
- Create: `src/lib/events/index.ts`

**Step 1: Write the events data access file**

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Event, EventRow, EventMember } from '@/types/event';
import { transformEventRow } from '@/types/event';

/**
 * Get event by slug (server-side)
 */
export async function getEventBySlug(slug: string): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) {
    return null;
  }

  return transformEventRow(data as EventRow);
}

/**
 * Get event by ID (server-side)
 */
export async function getEventById(id: string): Promise<Event | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    return null;
  }

  return transformEventRow(data as EventRow);
}

/**
 * Get user's membership for an event
 */
export async function getEventMembership(
  eventId: string,
  userId: string
): Promise<EventMember | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('event_members')
    .select('*')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    eventId: data.event_id,
    userId: data.user_id,
    role: data.role,
    voteCredits: data.vote_credits,
    joinedAt: new Date(data.joined_at),
  };
}

/**
 * Get all public/unlisted events (for discovery)
 */
export async function getPublicEvents(): Promise<Event[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('events')
    .select('*')
    .in('visibility', ['public', 'unlisted'])
    .order('start_date', { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => transformEventRow(row as EventRow));
}
```

**Step 2: Commit**

```bash
git add src/lib/events/index.ts
git commit -m "feat(lib): add event data access functions"
```

---

## Task 9: Create Date/Timezone Utilities

**Files:**
- Create: `src/lib/events/dates.ts`
- Create: `src/lib/events/timezone.ts`

**Step 1: Write the dates utility**

```typescript
// src/lib/events/dates.ts

/**
 * Generate array of date strings for event days
 * Returns dates in YYYY-MM-DD format
 */
export function getEventDays(startDate: Date, endDate: Date): string[] {
  const days: string[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Format date in event's timezone for display
 */
export function formatEventDate(
  date: Date,
  timezone: string,
  options?: Intl.DateTimeFormatOptions
): string {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options,
  }).format(date);
}

/**
 * Get day label for an event date (e.g., "Fri Feb 27")
 */
export function getEventDayLabel(dateStr: string, timezone: string): string {
  const date = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone edge cases
  return formatEventDate(date, timezone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Check if a date is within the event dates
 */
export function isDateInEvent(
  date: Date,
  startDate: Date,
  endDate: Date
): boolean {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  return d >= start && d <= end;
}
```

**Step 2: Write the timezone utility**

```typescript
// src/lib/events/timezone.ts

/**
 * Format a date/time in the event's timezone
 */
export function formatInEventTimezone(
  date: Date,
  timezone: string,
  format: 'time' | 'date' | 'datetime' | 'full' = 'datetime'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  switch (format) {
    case 'time':
      options.hour = 'numeric';
      options.minute = '2-digit';
      break;
    case 'date':
      options.month = 'short';
      options.day = 'numeric';
      break;
    case 'datetime':
      options.month = 'short';
      options.day = 'numeric';
      options.hour = 'numeric';
      options.minute = '2-digit';
      break;
    case 'full':
      options.weekday = 'long';
      options.month = 'long';
      options.day = 'numeric';
      options.year = 'numeric';
      options.hour = 'numeric';
      options.minute = '2-digit';
      options.timeZoneName = 'short';
      break;
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Parse a time string in the event's timezone
 * Input: "09:00" and "2026-02-27"
 * Output: Date object in UTC that represents that time in the event timezone
 */
export function parseTimeInTimezone(
  timeStr: string,
  dateStr: string,
  timezone: string
): Date {
  // Create a date string in the format the timezone-aware parser expects
  const dateTimeStr = `${dateStr}T${timeStr}:00`;

  // Create a formatter that outputs in ISO format for the given timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  // Parse the local time into a Date object
  // This is a simplified approach - for production, consider using date-fns-tz
  const localDate = new Date(dateTimeStr);

  // Get the offset for this timezone at this date
  const utcDate = new Date(localDate.toLocaleString('en-US', { timeZone: 'UTC' }));
  const tzDate = new Date(localDate.toLocaleString('en-US', { timeZone: timezone }));
  const offset = utcDate.getTime() - tzDate.getTime();

  return new Date(localDate.getTime() + offset);
}

/**
 * Get the timezone abbreviation (e.g., "MST", "MDT")
 */
export function getTimezoneAbbreviation(timezone: string, date: Date = new Date()): string {
  const formatted = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    timeZoneName: 'short',
  }).format(date);

  // Extract just the timezone part
  const parts = formatted.split(' ');
  return parts[parts.length - 1];
}

/**
 * Get list of common timezones for picker
 */
export function getCommonTimezones(): { value: string; label: string }[] {
  const timezones = [
    { value: 'America/New_York', label: 'Eastern Time (ET)' },
    { value: 'America/Chicago', label: 'Central Time (CT)' },
    { value: 'America/Denver', label: 'Mountain Time (MT)' },
    { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
    { value: 'America/Phoenix', label: 'Arizona (MST)' },
    { value: 'Europe/London', label: 'London (GMT/BST)' },
    { value: 'Europe/Paris', label: 'Paris (CET/CEST)' },
    { value: 'Europe/Berlin', label: 'Berlin (CET/CEST)' },
    { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
    { value: 'Asia/Singapore', label: 'Singapore (SGT)' },
    { value: 'Australia/Sydney', label: 'Sydney (AEST/AEDT)' },
    { value: 'UTC', label: 'UTC' },
  ];
  return timezones;
}
```

**Step 3: Commit**

```bash
git add src/lib/events/dates.ts src/lib/events/timezone.ts
git commit -m "feat(lib): add date and timezone utilities"
```

---

## Task 10: Create EventContext and Provider

**Files:**
- Create: `src/contexts/EventContext.tsx`

**Step 1: Write the context file**

```typescript
'use client';

import * as React from 'react';
import type { Event, EventRoleName } from '@/types/event';
import { canRolePerform, isAdminRole, type Permission } from '@/lib/permissions';

// Event context value
interface EventContextValue {
  event: Event;
}

// Event role context value
interface EventRoleContextValue {
  role: EventRoleName | null;
  voteCredits: number;
  isLoading: boolean;
  can: (permission: Permission) => boolean;
  isAdmin: boolean;
  isOwner: boolean;
  isMember: boolean;
}

const EventContext = React.createContext<EventContextValue | null>(null);
const EventRoleContext = React.createContext<EventRoleContextValue | null>(null);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  const storageKey = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`;
  const stored = localStorage.getItem(storageKey);
  if (stored) {
    try {
      const session = JSON.parse(stored);
      return session?.access_token || null;
    } catch {
      return null;
    }
  }
  return null;
}

interface EventProviderProps {
  event: Event;
  children: React.ReactNode;
}

export function EventProvider({ event, children }: EventProviderProps) {
  const [role, setRole] = React.useState<EventRoleName | null>(null);
  const [voteCredits, setVoteCredits] = React.useState<number>(event.voteCreditsPerUser);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch user's role for this event
  React.useEffect(() => {
    const fetchMembership = async () => {
      const token = getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        // Get current user
        const userResponse = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${token}`,
          },
        });

        if (!userResponse.ok) {
          setIsLoading(false);
          return;
        }

        const userData = await userResponse.json();

        // Get membership
        const memberResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/event_members?event_id=eq.${event.id}&user_id=eq.${userData.id}&select=*`,
          {
            headers: {
              apikey: SUPABASE_KEY,
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (memberResponse.ok) {
          const data = await memberResponse.json();
          if (data && data.length > 0) {
            setRole(data[0].role as EventRoleName);
            setVoteCredits(data[0].vote_credits ?? event.voteCreditsPerUser);
          }
        }
      } catch (err) {
        console.error('Error fetching event membership:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMembership();
  }, [event.id, event.voteCreditsPerUser]);

  const roleValue = React.useMemo<EventRoleContextValue>(
    () => ({
      role,
      voteCredits,
      isLoading,
      can: (permission: Permission) => (role ? canRolePerform(role, permission) : false),
      isAdmin: role ? isAdminRole(role) : false,
      isOwner: role === 'owner',
      isMember: role !== null,
    }),
    [role, voteCredits, isLoading]
  );

  return (
    <EventContext.Provider value={{ event }}>
      <EventRoleContext.Provider value={roleValue}>{children}</EventRoleContext.Provider>
    </EventContext.Provider>
  );
}

/**
 * Hook to access current event
 */
export function useEvent(): Event {
  const context = React.useContext(EventContext);
  if (!context) {
    throw new Error('useEvent must be used within EventProvider');
  }
  return context.event;
}

/**
 * Hook to access user's role in current event
 */
export function useEventRole(): EventRoleContextValue {
  const context = React.useContext(EventRoleContext);
  if (!context) {
    throw new Error('useEventRole must be used within EventProvider');
  }
  return context;
}
```

**Step 2: Commit**

```bash
git add src/contexts/EventContext.tsx
git commit -m "feat(context): add EventProvider with useEvent and useEventRole hooks"
```

---

## Task 11: Create Event Layout

**Files:**
- Create: `src/app/e/[slug]/layout.tsx`

**Step 1: Write the layout file**

```typescript
import { notFound } from 'next/navigation';
import { getEventBySlug } from '@/lib/events';
import { EventProvider } from '@/contexts/EventContext';

interface EventLayoutProps {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}

export default async function EventLayout({ params, children }: EventLayoutProps) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    notFound();
  }

  return <EventProvider event={event}>{children}</EventProvider>;
}

// Generate metadata for the event
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);

  if (!event) {
    return {
      title: 'Event Not Found',
    };
  }

  return {
    title: `${event.name} | Schelling Point`,
    description: event.description || event.tagline || `${event.name} unconference`,
    openGraph: {
      title: event.name,
      description: event.description || event.tagline || undefined,
      images: event.bannerUrl ? [event.bannerUrl] : undefined,
    },
  };
}
```

**Step 2: Commit**

```bash
mkdir -p "src/app/e/[slug]"
git add "src/app/e/[slug]/layout.tsx"
git commit -m "feat(routes): add event layout with EventProvider"
```

---

## Task 12: Create Event Landing Page

**Files:**
- Create: `src/app/e/[slug]/page.tsx`

**Step 1: Write the landing page**

```typescript
'use client';

import Link from 'next/link';
import { Calendar, MapPin, Users, Vote, FileText, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useEvent, useEventRole } from '@/contexts/EventContext';
import { formatEventDate } from '@/lib/events/dates';

export default function EventPage() {
  const event = useEvent();
  const { isAdmin, isMember, isLoading } = useEventRole();

  const statusBadge = {
    draft: { label: 'Draft', variant: 'secondary' as const },
    published: { label: 'Open', variant: 'default' as const },
    voting: { label: 'Voting Open', variant: 'default' as const },
    scheduling: { label: 'Scheduling', variant: 'secondary' as const },
    live: { label: 'Live Now', variant: 'destructive' as const },
    completed: { label: 'Completed', variant: 'secondary' as const },
    archived: { label: 'Archived', variant: 'outline' as const },
  }[event.status];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-b from-primary/10 to-background py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <Badge variant={statusBadge.variant} className="mb-4">
            {statusBadge.label}
          </Badge>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {event.name}
          </h1>

          {event.tagline && (
            <p className="text-xl text-muted-foreground mb-6">{event.tagline}</p>
          )}

          <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground mb-8">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {formatEventDate(event.startDate, event.timezone, {
                  month: 'short',
                  day: 'numeric',
                })}{' '}
                -{' '}
                {formatEventDate(event.endDate, event.timezone, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </div>
            {event.locationName && (
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                <span>{event.locationName}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href={`/e/${event.slug}/sessions`}>
                <FileText className="mr-2 h-4 w-4" />
                Browse Sessions
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={`/e/${event.slug}/schedule`}>
                <Clock className="mr-2 h-4 w-4" />
                View Schedule
              </Link>
            </Button>
            {isAdmin && (
              <Button asChild variant="secondary" size="lg">
                <Link href={`/e/${event.slug}/admin`}>Admin Dashboard</Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto max-w-4xl px-4 py-12">
        {event.description && (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">About</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {event.description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isMember && (
            <>
              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/propose`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Propose a Session</h3>
                        <p className="text-sm text-muted-foreground">
                          Share your knowledge with the community
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/my-votes`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Vote className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">My Votes</h3>
                        <p className="text-sm text-muted-foreground">
                          See how you&apos;ve allocated your vote credits
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/my-schedule`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">My Schedule</h3>
                        <p className="text-sm text-muted-foreground">
                          View your favorited sessions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>

              <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                <Link href={`/e/${event.slug}/participants`}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-lg bg-primary/10">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Participants</h3>
                        <p className="text-sm text-muted-foreground">
                          See who&apos;s attending
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add "src/app/e/[slug]/page.tsx"
git commit -m "feat(routes): add event landing page"
```

---

## Task 13: Migrate Sessions Page to Event Route

**Files:**
- Create: `src/app/e/[slug]/sessions/page.tsx`
- Reference: `src/app/sessions/page.tsx`

**Step 1: Copy and adapt sessions page**

Read the existing sessions page and create an event-scoped version that:
1. Uses `useEvent()` to get event context
2. Uses `useEventRole()` for permission checks
3. Adds `event_id` filter to all queries
4. Updates links to use `/e/${event.slug}/...` pattern

**Step 2: Key changes to make**

```typescript
// At top of file, add:
import { useEvent, useEventRole } from '@/contexts/EventContext';

// In component:
const event = useEvent();
const { isAdmin } = useEventRole();

// In fetch calls, add event_id filter:
const response = await fetch(
  `${SUPABASE_URL}/rest/v1/sessions?event_id=eq.${event.id}&status=in.(approved,scheduled)&select=*`,
  // ...
);

// Update links:
<Link href={`/e/${event.slug}/sessions/${session.id}`}>
```

**Step 3: Commit**

```bash
git add "src/app/e/[slug]/sessions/page.tsx"
git commit -m "feat(routes): migrate sessions page to event route"
```

---

## Task 14: Migrate Remaining Event Pages

For each page, follow the same pattern as Task 13:

**Files to create:**
- `src/app/e/[slug]/sessions/[id]/page.tsx` (copy from `src/app/sessions/[id]/page.tsx`)
- `src/app/e/[slug]/sessions/[id]/SessionDetailClient.tsx`
- `src/app/e/[slug]/schedule/page.tsx` (copy from `src/app/schedule/page.tsx`)
- `src/app/e/[slug]/propose/page.tsx` (copy from `src/app/propose/page.tsx`)
- `src/app/e/[slug]/my-votes/page.tsx` (copy from `src/app/my-votes/page.tsx`)
- `src/app/e/[slug]/my-schedule/page.tsx` (copy from `src/app/my-schedule/page.tsx`)
- `src/app/e/[slug]/participants/page.tsx` (copy from `src/app/participants/page.tsx`)

**Key changes for each:**
1. Add `useEvent()` and `useEventRole()` hooks
2. Add `event_id=eq.${event.id}` filter to all Supabase queries
3. Replace `profile?.is_admin` checks with `isAdmin` from `useEventRole()`
4. Update all internal links to use `/e/${event.slug}/...` pattern
5. Replace hardcoded `EVENT_DAYS` with `getEventDays(event.startDate, event.endDate)`

**Commit after each:**

```bash
git add "src/app/e/[slug]/schedule/page.tsx"
git commit -m "feat(routes): migrate schedule page to event route"
```

---

## Task 15: Migrate Admin Pages

**Files to create:**
- `src/app/e/[slug]/admin/page.tsx`
- `src/app/e/[slug]/admin/schedule/page.tsx`
- `src/app/e/[slug]/admin/setup/page.tsx`

**Key changes:**
1. Replace `profile?.is_admin` checks with `useEventRole().isAdmin`
2. Add event_id to all queries
3. Remove hardcoded `EVENT_DAYS` - use `getEventDays(event.startDate, event.endDate)`
4. Remove hardcoded timezone `-07:00` - use `event.timezone`

**For admin/setup/page.tsx specifically (lines 33-37):**

Before:
```typescript
const EVENT_DAYS = [
  { date: '2026-02-13', label: 'Fri Feb 13' },
  // ...
];
```

After:
```typescript
const event = useEvent();
const EVENT_DAYS = getEventDays(event.startDate, event.endDate).map(date => ({
  date,
  label: getEventDayLabel(date, event.timezone),
}));
```

**Commit:**

```bash
git add "src/app/e/[slug]/admin/"
git commit -m "feat(routes): migrate admin pages to event route"
```

---

## Task 16: Delete Old Routes

**Files to delete:**
- `src/app/sessions/` (entire directory)
- `src/app/schedule/` (entire directory)
- `src/app/propose/` (entire directory)
- `src/app/my-votes/` (entire directory)
- `src/app/my-schedule/` (entire directory)
- `src/app/admin/` (entire directory)
- `src/app/dashboard/` (entire directory)
- `src/app/participants/` (entire directory)

**Step 1: Remove old routes**

```bash
rm -rf src/app/sessions
rm -rf src/app/schedule
rm -rf src/app/propose
rm -rf src/app/my-votes
rm -rf src/app/my-schedule
rm -rf src/app/admin
rm -rf src/app/dashboard
rm -rf src/app/participants
```

**Step 2: Commit**

```bash
git add -A
git commit -m "chore: remove old global routes (replaced by /e/[slug]/*)"
```

---

## Task 17: Update Platform Landing Page

**Files:**
- Modify: `src/app/page.tsx`

**Step 1: Update to show event discovery**

Replace the EthBoulder-specific landing with a platform landing that:
1. Lists public events
2. Has a "Create Event" CTA (for Phase 2)
3. Redirects to EthBoulder event for now

```typescript
import { redirect } from 'next/navigation';

// For now, redirect to EthBoulder event
// In Phase 2, this becomes the event discovery page
export default function HomePage() {
  redirect('/e/ethboulder-2026');
}
```

**Step 2: Commit**

```bash
git add src/app/page.tsx
git commit -m "feat(routes): update landing page to redirect to default event"
```

---

## Task 18: Update DashboardLayout Component

**Files:**
- Modify: `src/components/DashboardLayout.tsx`

**Step 1: Make DashboardLayout event-aware**

Key changes:
1. Accept event as prop or use useEvent()
2. Update navigation links to use `/e/${slug}/...`
3. Use `useEventRole().isAdmin` instead of `profile?.is_admin`
4. Display event name instead of hardcoded "EthBoulder™"

**Step 2: Commit**

```bash
git add src/components/DashboardLayout.tsx
git commit -m "feat(layout): make DashboardLayout event-aware"
```

---

## Task 19: Final Verification

**Step 1: Run type check**

```bash
npm run type-check
```

Expected: No TypeScript errors

**Step 2: Run linter**

```bash
npm run lint
```

Expected: No linting errors (or only pre-existing ones)

**Step 3: Run dev server and test**

```bash
npm run dev
```

Test manually:
- Navigate to `/` → should redirect to `/e/ethboulder-2026`
- Navigate to `/e/ethboulder-2026` → should show event landing
- Navigate to `/e/ethboulder-2026/sessions` → should show sessions
- Navigate to `/e/ethboulder-2026/admin` → should show admin (if admin)
- Old routes like `/sessions` should 404

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix: resolve issues from Phase 1 verification"
```

---

## Task 20: Phase 1 Complete Commit

**Step 1: Create summary commit**

```bash
git add -A
git commit -m "$(cat <<'EOF'
feat: Complete Phase 1 - Multi-tenant foundation

Phase 1 establishes the multi-tenant data model and event-scoped routing:

Database:
- Created `events` table with EthBoulder seed data
- Added `event_id` foreign key to all data tables
- Created `event_members` table replacing global `is_admin`
- Updated all RLS policies for event-scoped access

Frontend:
- Created EventContext with useEvent and useEventRole hooks
- Added permissions utility with role matrix
- Created `/e/[slug]/*` route structure
- Migrated all pages to event-scoped routes
- Removed old global routes

Utilities:
- Added date/timezone utilities for event-aware formatting
- Removed hardcoded EVENT_DAYS and timezone offsets

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

---

## Completion Checklist

- [ ] `events` table exists with EthBoulder record
- [ ] All tables have `event_id` column (NOT NULL, indexed)
- [ ] `event_members` table exists with migrated roles
- [ ] No hardcoded EVENT_DAYS in codebase
- [ ] No hardcoded timezone offsets in codebase
- [ ] `/e/[slug]/*` routes functional
- [ ] Old routes removed
- [ ] All RLS policies updated for event scoping
- [ ] useEvent and useEventRole hooks working
- [ ] App runs without errors at new URLs
