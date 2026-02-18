# Phase 1: Foundation Design

## Overview

This document captures the approved design for Phase 1 of the multi-tenant implementation. Phase 1 establishes the foundational data model and routing structure that all subsequent phases build upon.

**Approach**: Database-First Migration
**Branch Strategy**: Single `multi-tenant` feature branch
**Backwards Compatibility**: Old routes will be removed (not redirected)

---

## Architectural Decisions

### AD-1: Shared Database with Event-Scoped Rows
- Single database with `event_id` foreign keys on all data tables
- Not schema-per-tenant or database-per-tenant
- Rationale: Simpler migrations, cross-event features remain easy, Supabase RLS provides isolation
- Trade-off: All queries must include event_id filtering

### AD-2: Explicit event_id on All Tables
- Even where logically redundant (e.g., votes could be scoped through sessions)
- Rationale: RLS policy efficiency, simpler queries, better indexing
- Trade-off: Some data denormalization

### AD-3: Role-Based Event Membership
- Replaces global `is_admin` with `event_members` table
- Role hierarchy: owner > admin > moderator > track_lead > volunteer > attendee
- Rationale: Fine-grained access control per event
- Trade-off: More complex permission checks than boolean is_admin

### AD-4: UTC Storage with Event Timezone Display
- All DB timestamps stored in UTC
- Event timezone in IANA format (e.g., 'America/Denver')
- Display uses Intl.DateTimeFormat with event's timezone
- Rationale: Correct DST handling, consistent storage

### AD-5: Slug-Based Path Routing
- Pattern: `/e/{event-slug}/...`
- Not subdomain routing
- Rationale: Works on Vercel without wildcard DNS, simpler SSL, shared auth session
- Trade-off: Slightly longer URLs

---

## Database Schema

### 1. Events Table

```sql
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

CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
```

### 2. Event Members Table

```sql
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

CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);
```

### 3. event_id Additions to Existing Tables

| Table | Column Added | Index |
|-------|--------------|-------|
| sessions | event_id UUID NOT NULL REFERENCES events(id) | idx_sessions_event_status(event_id, status) |
| votes | event_id UUID NOT NULL REFERENCES events(id) | idx_votes_event_user(event_id, user_id) |
| venues | event_id UUID NOT NULL REFERENCES events(id) | idx_venues_event(event_id) |
| time_slots | event_id UUID NOT NULL REFERENCES events(id) | idx_time_slots_event(event_id) |
| tracks | event_id UUID NOT NULL REFERENCES events(id) | idx_tracks_event(event_id) |
| favorites | event_id UUID NOT NULL REFERENCES events(id) | - |
| session_cohosts | event_id UUID NOT NULL REFERENCES events(id) | - |
| cohost_invites | event_id UUID NOT NULL REFERENCES events(id) | - |

**Migration Strategy**:
1. Add columns as NULLABLE
2. Create EthBoulder 2026 event record
3. Backfill all rows with EthBoulder event ID
4. Add NOT NULL constraints
5. Add indexes

---

## React Context System

### useEvent Hook

```typescript
// src/hooks/useEvent.tsx
interface Event {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  startDate: string;
  endDate: string;
  timezone: string;
  locationName: string | null;
  status: EventStatus;
  voteCreditsPerUser: number;
  votingOpensAt: string | null;
  votingClosesAt: string | null;
  proposalsOpenAt: string | null;
  proposalsCloseAt: string | null;
  allowedFormats: string[];
  allowedDurations: number[];
  maxProposalsPerUser: number;
  requireProposalApproval: boolean;
  theme: EventTheme;
  logoUrl: string | null;
  bannerUrl: string | null;
}

interface EventContextValue {
  event: Event | null;
  isLoading: boolean;
  error: Error | null;
}

function useEvent(): EventContextValue
```

### useEventRole Hook

```typescript
// src/hooks/useEventRole.tsx
type EventRoleName = 'owner' | 'admin' | 'moderator' | 'track_lead' | 'volunteer' | 'attendee';

interface EventRole {
  eventId: string;
  role: EventRoleName;
  voteCredits: number;
}

interface UseEventRoleReturn {
  role: EventRole | null;
  can: (permission: Permission) => boolean;
  isLoading: boolean;
  isAdmin: boolean;  // convenience: role is owner or admin
  isOwner: boolean;  // convenience: role is owner
}

function useEventRole(): UseEventRoleReturn
```

### Permission Matrix

```typescript
// src/lib/permissions.ts
type Permission =
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

function canUserPerform(role: EventRoleName, permission: Permission): boolean {
  return PERMISSION_ROLES[permission].includes(role);
}
```

---

## Route Structure

```
src/app/
├── e/
│   └── [slug]/
│       ├── layout.tsx          # EventProvider wrapper, fetches event by slug
│       ├── page.tsx            # Event landing page
│       ├── sessions/
│       │   └── page.tsx        # Browse event sessions
│       ├── schedule/
│       │   └── page.tsx        # View schedule
│       ├── propose/
│       │   └── page.tsx        # Submit proposal
│       ├── my-votes/
│       │   └── page.tsx        # User's votes for this event
│       ├── my-schedule/
│       │   └── page.tsx        # User's favorites
│       └── admin/
│           ├── page.tsx        # Admin dashboard
│           ├── schedule/
│           │   └── page.tsx    # Schedule builder
│           └── setup/
│               └── page.tsx    # Venue/slot setup
├── page.tsx                    # Platform landing (event discovery) - placeholder for Phase 2
└── create/                     # Event wizard (Phase 2)
```

### Event Layout

```typescript
// src/app/e/[slug]/layout.tsx
import { notFound } from 'next/navigation';
import { EventProvider } from '@/contexts/EventContext';
import { getEventBySlug } from '@/lib/events';

export default async function EventLayout({
  params,
  children
}: {
  params: { slug: string };
  children: React.ReactNode;
}) {
  const event = await getEventBySlug(params.slug);

  if (!event) {
    notFound();
  }

  return (
    <EventProvider event={event}>
      {children}
    </EventProvider>
  );
}
```

---

## RLS Policy Updates

### Pattern: Replace is_admin with event_members

**Before** (current):
```sql
CREATE POLICY "Admins can manage all sessions" ON sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);
```

**After** (Phase 1):
```sql
CREATE POLICY "Event admins can manage sessions" ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = sessions.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

### Policies by Table

#### sessions
- Anyone can view approved/scheduled sessions
- Event members can create sessions (INSERT)
- Hosts can update own pending sessions
- Event admins can manage all sessions

#### votes
- Users can view/manage own votes within events they're members of
- Vote operations require event membership

#### venues
- Anyone can view venues
- Event admins can manage venues

#### time_slots
- Anyone can view time slots
- Event admins can manage time slots

#### tracks
- Anyone can view tracks
- Event admins can manage tracks
- Track leads can manage sessions in their tracks

#### favorites
- Users can view/manage own favorites within events they're members of

#### event_members
- Members can view other members of events they belong to
- Owners/admins can add/remove members
- Users can leave events (delete own membership)

---

## Migration Sequence

### Order of Operations

1. **P1.1**: Create `events` table
2. **P1.1.3**: Insert EthBoulder 2026 event record
3. **P1.2**: Add nullable `event_id` columns to all tables
4. **P1.3.1**: Backfill all rows with EthBoulder event ID
5. **P1.3.2**: Add NOT NULL constraints
6. **P1.3.3**: Add indexes
7. **P1.4.1**: Create `event_members` table
8. **P1.4.3**: Migrate is_admin users to admin role
9. **P1.4.4**: Migrate all users to attendee role
10. **P1.10**: Update RLS policies

### EthBoulder 2026 Seed Data

```sql
INSERT INTO events (
  slug, name, tagline, description,
  start_date, end_date, timezone,
  location_name, location_address,
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
  NULL,
  'completed',  -- Event is over
  100,
  ARRAY['talk','workshop','discussion','panel','demo'],
  ARRAY[15,30,60,90],
  5,
  TRUE
);
```

---

## Utility Functions

### Date Utilities

```typescript
// src/lib/events/dates.ts

/**
 * Generate array of date strings for event days
 */
export function getEventDays(startDate: Date, endDate: Date): string[] {
  const days: string[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  return days;
}

/**
 * Format date in event's timezone
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
```

### Timezone Utilities

```typescript
// src/lib/events/timezone.ts

/**
 * Format time in event's timezone
 */
export function formatInEventTimezone(
  date: Date,
  timezone: string,
  format: 'time' | 'date' | 'datetime' = 'datetime'
): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
  };

  if (format === 'time' || format === 'datetime') {
    options.hour = 'numeric';
    options.minute = '2-digit';
  }
  if (format === 'date' || format === 'datetime') {
    options.month = 'short';
    options.day = 'numeric';
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}
```

---

## Files to Remove

After Phase 1, these files/routes will be deleted (not redirected):

- `src/app/sessions/` → replaced by `/e/[slug]/sessions`
- `src/app/schedule/` → replaced by `/e/[slug]/schedule`
- `src/app/propose/` → replaced by `/e/[slug]/propose`
- `src/app/my-votes/` → replaced by `/e/[slug]/my-votes`
- `src/app/my-schedule/` → replaced by `/e/[slug]/my-schedule`
- `src/app/admin/` → replaced by `/e/[slug]/admin`
- `src/app/dashboard/` → replaced by `/e/[slug]` landing

---

## Completion Criteria

- [x] `events` table exists with EthBoulder record
- [x] All tables have `event_id` column (NOT NULL, indexed)
- [x] `event_members` table exists with migrated roles
- [~] No hardcoded EVENT_DAYS in codebase (1 file remaining: EditSessionModal.tsx)
- [x] No hardcoded timezone offsets in codebase
- [x] `/e/[slug]/*` routes functional
- [x] Old routes removed
- [x] All RLS policies updated for event scoping
- [x] useEvent and useEventRole hooks working
- [x] Existing EthBoulder functionality unchanged at new URLs

### Phase 1 Completed: 2026-02-17

**Branch:** `multi-tenant`
**Commits:** 23 commits
**Changes:** ~4500 lines added, ~1300 lines removed

**Follow-up items for Phase 2:**
- Update `EditSessionModal.tsx` to use event context for EVENT_DAYS
- Update API routes to use event_members instead of is_admin where appropriate
- Extract `getAccessToken()` to shared utility (duplicated in 6+ files)
