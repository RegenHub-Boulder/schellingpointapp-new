# Multi-Tenant Implementation Plan
## Comprehensive Task Breakdown with Dependencies & Cross-References

---

## Document Overview

This document provides an exhaustive implementation plan derived from `MULTI_TENANT_EVOLUTION_STRATEGY.md`. Each phase contains:
- **Tasks** with unique IDs for cross-referencing
- **Sub-tasks** with detailed descriptions
- **Dependencies** (what must be completed first)
- **Related Tasks** (work that shares concerns or code)
- **Architectural Decisions** affecting the task
- **Files Affected** for each task

---

## Task ID Convention

```
P{phase}.{task}.{subtask}
Example: P1.3.2 = Phase 1, Task 3, Sub-task 2
```

---

## Dependency Legend

- `BLOCKS` → Must complete before dependent task can start
- `RELATED` → Shares code/concerns; coordinate changes
- `INFORMS` → Output affects decisions in dependent task

---

# PHASE 1: Foundation (Weeks 1-3)

## Objective
Establish multi-tenant data model and event-scoped routing while maintaining backward compatibility with existing EthBoulder data.

---

## P1.1: Create Events Table

**Description**: The `events` table is the core tenant entity. Every other table will reference it.

**Architectural Decision**:
> **AD-1**: Shared database with event-scoped rows (not schema-per-tenant)
> - Rationale: Simpler migrations, cross-event features remain easy, Supabase RLS provides isolation
> - Trade-off: Must ensure all queries include event_id filtering

**Files Affected**:
- `supabase/migrations/[timestamp]_create_events_table.sql` (NEW)

### Sub-tasks

#### P1.1.1: Design events table schema
**Description**: Create the SQL DDL for the events table including all columns from strategy doc section 2.2
**Dependencies**: None (starting point)
**Columns to include**:
- Identity: `id`, `slug`, `name`, `tagline`, `description`
- Dates: `start_date`, `end_date`, `timezone`
- Location: `location_name`, `location_address`, `location_geo`
- Lifecycle: `status` (enum with CHECK constraint)
- Voting config: `vote_credits_per_user`, `voting_opens_at`, `voting_closes_at`, `proposals_open_at`, `proposals_close_at`
- Proposal config: `allowed_formats`, `allowed_durations`, `max_proposals_per_user`, `require_proposal_approval`
- Branding: `theme` (JSONB), `logo_url`, `banner_url`, `favicon_url`
- Metadata: `created_by`, `is_featured`, `visibility`, timestamps

#### P1.1.2: Create events table migration
**Description**: Write and test the migration SQL
**Dependencies**: P1.1.1
**Validation**: Migration runs without error, table exists with correct structure

#### P1.1.3: Create default EthBoulder event record
**Description**: Insert the initial event record for EthBoulder 2026 with current configuration
**Dependencies**: P1.1.2
**Data to migrate**:
- Extract EVENT_DAYS from current hardcoded values → `start_date`, `end_date`
- Set timezone to 'America/Denver'
- Set status to current phase (likely 'draft' or 'published')
- Configure voting/proposal windows based on current behavior

**Related Tasks**: P1.5 (hardcoded EVENT_DAYS removal depends on this)

---

## P1.2: Add event_id to Existing Tables

**Description**: Every existing data table needs an `event_id` foreign key to scope data per-event.

**Architectural Decision**:
> **AD-2**: Add event_id as explicit column even where logically redundant (e.g., votes could be scoped through sessions)
> - Rationale: RLS policy efficiency, simpler queries, better indexing
> - Trade-off: Some data denormalization

**Files Affected**:
- `supabase/migrations/[timestamp]_add_event_id_columns.sql` (NEW)

### Sub-tasks

#### P1.2.1: Add event_id to sessions table
**Description**: `ALTER TABLE sessions ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2
**Special considerations**:
- Add as nullable first, backfill, then make NOT NULL
- Add index: `CREATE INDEX idx_sessions_event_status ON sessions(event_id, status)`

#### P1.2.2: Add event_id to votes table
**Description**: `ALTER TABLE votes ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2
**Special considerations**:
- Add index: `CREATE INDEX idx_votes_event_user ON votes(event_id, user_id)`
- Update vote credit calculation to be event-scoped

#### P1.2.3: Add event_id to venues table
**Description**: `ALTER TABLE venues ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2
**Special considerations**:
- Add index: `CREATE INDEX idx_venues_event ON venues(event_id)`

#### P1.2.4: Add event_id to time_slots table
**Description**: `ALTER TABLE time_slots ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2
**Special considerations**:
- Add index: `CREATE INDEX idx_time_slots_event ON time_slots(event_id)`

#### P1.2.5: Add event_id to tracks table
**Description**: `ALTER TABLE tracks ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2
**Special considerations**:
- Also add `lead_user_id`, `max_sessions`, `display_order` columns per strategy section 8.2
- Add index: `CREATE INDEX idx_tracks_event ON tracks(event_id)`

#### P1.2.6: Add event_id to favorites table
**Description**: `ALTER TABLE favorites ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2

#### P1.2.7: Add event_id to session_cohosts table
**Description**: `ALTER TABLE session_cohosts ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2
**Rationale**: RLS efficiency even though logically scoped through sessions

#### P1.2.8: Add event_id to cohost_invites table
**Description**: `ALTER TABLE cohost_invites ADD COLUMN event_id UUID REFERENCES events(id)`
**Dependencies**: P1.1.2

---

## P1.3: Backfill Existing Data

**Description**: Populate event_id for all existing records with the EthBoulder event.

**Files Affected**:
- `supabase/migrations/[timestamp]_backfill_event_ids.sql` (NEW)

### Sub-tasks

#### P1.3.1: Write backfill migration
**Description**: UPDATE all tables SET event_id = (SELECT id FROM events WHERE slug = 'ethboulder-2026')
**Dependencies**: P1.1.3, P1.2.1-P1.2.8
**Order**: Must run after event_id columns added and default event created

#### P1.3.2: Add NOT NULL constraints
**Description**: ALTER each table to make event_id NOT NULL after backfill
**Dependencies**: P1.3.1
**Validation**: No null event_id values remain

#### P1.3.3: Add ON DELETE CASCADE
**Description**: Ensure foreign key constraints cascade properly
**Dependencies**: P1.3.2

---

## P1.4: Create event_members Table

**Description**: Replace global `is_admin` with event-scoped role memberships.

**Architectural Decision**:
> **AD-3**: Role-based event membership with hierarchical permissions
> - Roles: owner > admin > moderator > track_lead > volunteer > attendee
> - Rationale: Fine-grained access control per event
> - Trade-off: More complex permission checks than boolean is_admin

**Files Affected**:
- `supabase/migrations/[timestamp]_create_event_members.sql` (NEW)

### Sub-tasks

#### P1.4.1: Create event_members table
**Description**: Create table per strategy section 2.4
**Dependencies**: P1.1.2
**Schema**:
```sql
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN (
    'owner', 'admin', 'moderator', 'track_lead', 'volunteer', 'attendee'
  )),
  vote_credits INTEGER,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
```

#### P1.4.2: Create event_members indexes
**Description**: Add performance indexes
**Dependencies**: P1.4.1
**Indexes**:
- `CREATE INDEX idx_event_members_event ON event_members(event_id)`
- `CREATE INDEX idx_event_members_user ON event_members(user_id)`

#### P1.4.3: Migrate existing admins
**Description**: Convert profiles.is_admin=true to event_members with role='admin'
**Dependencies**: P1.4.1, P1.1.3
**SQL**:
```sql
INSERT INTO event_members (event_id, user_id, role)
SELECT
  (SELECT id FROM events WHERE slug = 'ethboulder-2026'),
  id,
  'admin'
FROM profiles WHERE is_admin = true;
```

#### P1.4.4: Migrate existing users as attendees
**Description**: All existing profiles become attendees of EthBoulder event
**Dependencies**: P1.4.3
**SQL**:
```sql
INSERT INTO event_members (event_id, user_id, role)
SELECT
  (SELECT id FROM events WHERE slug = 'ethboulder-2026'),
  id,
  'attendee'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM event_members em
  WHERE em.user_id = profiles.id
);
```

#### P1.4.5: Mark event creator as owner
**Description**: The profiles.is_admin who created the backfill should be owner
**Dependencies**: P1.4.3

---

## P1.5: Remove Hardcoded EVENT_DAYS

**Description**: Replace hardcoded event dates with dynamic values from events table.

**Files Affected**:
- `src/app/admin/setup/page.tsx` (lines 33-37)
- `src/app/admin/schedule/page.tsx` (lines 88-99)
- `src/app/propose/page.tsx` (lines 35-52)

### Sub-tasks

#### P1.5.1: Create date utility functions
**Description**: Create `src/lib/events/dates.ts` with functions to derive event days from start/end dates
**Dependencies**: P1.1.1
**Functions needed**:
- `getEventDays(startDate: Date, endDate: Date): string[]`
- `formatEventDay(date: Date, timezone: string): string`
- `getTimePreferencesForEvent(event: Event): TimePreference[]`

**Related Tasks**: P1.7 (EventContext will provide event data)

#### P1.5.2: Update admin/setup/page.tsx
**Description**: Replace `EVENT_DAYS` constant with dynamic derivation from event context
**Dependencies**: P1.5.1, P1.7.1
**Current code** (lines 33-37):
```typescript
const EVENT_DAYS = ["2026-02-27", "2026-02-28", "2026-03-01"];
```
**New approach**: Get from EventContext and derive using utility

#### P1.5.3: Update admin/schedule/page.tsx
**Description**: Replace `EVENT_DAYS` and `DAY_TO_PREFERENCES` with dynamic values
**Dependencies**: P1.5.1, P1.7.1
**Current code** (lines 88-99): Hardcoded EVENT_DAYS and preference mappings
**New approach**: Derive from event context

#### P1.5.4: Update propose/page.tsx
**Description**: Replace `TIME_PREFERENCES` and `EVENT_DAYS` constants
**Dependencies**: P1.5.1, P1.7.1
**Current code** (lines 35-52): Hardcoded preferences
**New approach**: Derive from event context

---

## P1.6: Remove Hardcoded Timezone

**Description**: Replace hardcoded '-07:00' Mountain Time with event.timezone.

**Architectural Decision**:
> **AD-4**: Store all DB timestamps in UTC; display in event timezone
> - Use IANA timezone format (e.g., 'America/Denver')
> - Use Intl.DateTimeFormat for display
> - Handle DST transitions correctly

**Files Affected**:
- `src/app/admin/setup/page.tsx`
- `src/app/propose/page.tsx`
- `src/lib/utils.ts` (add timezone utilities)

### Sub-tasks

#### P1.6.1: Create timezone utility functions
**Description**: Create `src/lib/events/timezone.ts`
**Dependencies**: None
**Functions needed**:
- `formatInEventTimezone(date: Date, timezone: string, format: string): string`
- `parseInEventTimezone(dateStr: string, timezone: string): Date`
- `getTimezoneOffset(timezone: string, date: Date): string`

#### P1.6.2: Update time displays throughout app
**Description**: Replace hardcoded '-07:00' with dynamic timezone
**Dependencies**: P1.6.1, P1.7.1
**Files to audit and update**: All files showing times to users

---

## P1.7: Create Event Context System

**Description**: React context and hooks for event-scoped state management.

**Files Affected**:
- `src/hooks/useEvent.tsx` (NEW)
- `src/hooks/useEventRole.tsx` (NEW)
- `src/app/e/[slug]/layout.tsx` (NEW)

### Sub-tasks

#### P1.7.1: Create useEvent hook
**Description**: Hook providing current event data from context
**Dependencies**: P1.1.2
**Interface**:
```typescript
interface EventContextValue {
  event: Event | null;
  isLoading: boolean;
  error: Error | null;
}
function useEvent(): EventContextValue
```

#### P1.7.2: Create useEventRole hook
**Description**: Hook providing user's role and permissions for current event
**Dependencies**: P1.4.1, P1.7.1
**Interface**:
```typescript
interface EventRole {
  eventId: string;
  role: 'owner' | 'admin' | 'moderator' | 'track_lead' | 'volunteer' | 'attendee';
  voteCredits: number;
}
function useEventRole(): {
  role: EventRole | null;
  can: (permission: Permission) => boolean;
  isLoading: boolean;
}
```

#### P1.7.3: Create EventProvider component
**Description**: Context provider that fetches and provides event data
**Dependencies**: P1.7.1
**Location**: `src/contexts/EventContext.tsx`

#### P1.7.4: Create permission checking utility
**Description**: Implement permission matrix from strategy section 5.3
**Dependencies**: P1.7.2
**File**: `src/lib/permissions.ts`

---

## P1.8: Create Event-Scoped Routes

**Description**: New `/e/[slug]/*` route structure for multi-tenant navigation.

**Architectural Decision**:
> **AD-5**: Slug-based path routing over subdomains
> - Pattern: `app.schellingpoint.xyz/e/{event-slug}/...`
> - Rationale: Works on Vercel without wildcard DNS, simpler SSL, shared auth session
> - Trade-off: Slightly longer URLs than subdomain approach

**Files Affected**:
- `src/app/e/[slug]/layout.tsx` (NEW)
- `src/app/e/[slug]/page.tsx` (NEW)
- `src/app/e/[slug]/sessions/page.tsx` (NEW)
- `src/app/e/[slug]/schedule/page.tsx` (NEW)
- `src/app/e/[slug]/propose/page.tsx` (NEW)
- `src/app/e/[slug]/my-votes/page.tsx` (NEW)
- `src/app/e/[slug]/my-schedule/page.tsx` (NEW)
- `src/app/e/[slug]/admin/page.tsx` (NEW)
- `src/app/e/[slug]/admin/schedule/page.tsx` (NEW)
- `src/app/e/[slug]/admin/setup/page.tsx` (NEW)

### Sub-tasks

#### P1.8.1: Create event layout
**Description**: `/e/[slug]/layout.tsx` wraps all event pages with EventProvider
**Dependencies**: P1.7.3
**Responsibilities**:
- Fetch event by slug
- Provide EventContext
- Apply event theme (foundation for Phase 3)
- Handle 404 for invalid slugs

#### P1.8.2: Create event landing page
**Description**: `/e/[slug]/page.tsx` - event home showing overview
**Dependencies**: P1.8.1
**Content**: Event name, description, dates, status, CTA based on phase

#### P1.8.3: Migrate sessions page
**Description**: Copy/adapt `/sessions` to `/e/[slug]/sessions`
**Dependencies**: P1.8.1
**Changes**: Add event_id filtering to queries

#### P1.8.4: Migrate schedule page
**Description**: Copy/adapt `/schedule` to `/e/[slug]/schedule`
**Dependencies**: P1.8.1, P1.5.3
**Changes**: Add event_id filtering, use event timezone

#### P1.8.5: Migrate propose page
**Description**: Copy/adapt `/propose` to `/e/[slug]/propose`
**Dependencies**: P1.8.1, P1.5.4
**Changes**: Add event_id to new sessions, use event config for formats/durations

#### P1.8.6: Migrate my-votes page
**Description**: Copy/adapt `/my-votes` to `/e/[slug]/my-votes`
**Dependencies**: P1.8.1
**Changes**: Filter votes by event_id

#### P1.8.7: Migrate my-schedule page
**Description**: Copy/adapt `/my-schedule` to `/e/[slug]/my-schedule`
**Dependencies**: P1.8.1
**Changes**: Filter favorites by event_id

#### P1.8.8: Migrate admin pages
**Description**: Copy/adapt `/admin/*` to `/e/[slug]/admin/*`
**Dependencies**: P1.8.1, P1.7.2
**Changes**:
- Add event_id filtering
- Use useEventRole for permission checks
- Remove global is_admin checks

---

## P1.9: Add Route Redirects

**Description**: Redirect old routes to new event-scoped routes for backward compatibility.

**Files Affected**:
- `src/middleware.ts`
- `next.config.js` (redirects)

### Sub-tasks

#### P1.9.1: Configure redirects in next.config.js
**Description**: Add permanent redirects from old paths to new paths
**Dependencies**: P1.8.2-P1.8.8
**Redirects**:
```javascript
{
  source: '/sessions',
  destination: '/e/ethboulder-2026/sessions',
  permanent: false, // Use false during transition
},
{
  source: '/schedule',
  destination: '/e/ethboulder-2026/schedule',
  permanent: false,
},
// ... etc for all routes
```

#### P1.9.2: Update middleware for event context
**Description**: Extract event slug from URL and add to request headers
**Dependencies**: P1.8.1
**Implementation**: Per strategy section 14.3

---

## P1.10: Update RLS Policies

**Description**: Modify all Row Level Security policies to include event_id scoping.

**Files Affected**:
- `supabase/migrations/[timestamp]_update_rls_policies.sql` (NEW)

### Sub-tasks

#### P1.10.1: Update sessions RLS
**Description**: Add event-scoped policies per strategy section 2.7
**Dependencies**: P1.2.1, P1.4.1
**Policies**:
- Anyone can view approved/scheduled sessions (no change to logic)
- Event members can create sessions (check event_members)
- Event admins can manage sessions (check role in event_members)

#### P1.10.2: Update votes RLS
**Description**: Scope vote policies to event membership
**Dependencies**: P1.2.2, P1.4.1

#### P1.10.3: Update venues RLS
**Description**: Event admins can manage venues
**Dependencies**: P1.2.3, P1.4.1

#### P1.10.4: Update time_slots RLS
**Description**: Event admins can manage time slots
**Dependencies**: P1.2.4, P1.4.1

#### P1.10.5: Update tracks RLS
**Description**: Event admins can manage tracks; track leads can manage their track's sessions
**Dependencies**: P1.2.5, P1.4.1

#### P1.10.6: Update favorites RLS
**Description**: Users can manage their own favorites within events they're members of
**Dependencies**: P1.2.6, P1.4.1

#### P1.10.7: Create event_members RLS
**Description**: Policies for who can view/modify event memberships
**Dependencies**: P1.4.1
**Policies**:
- Members can view other members of events they belong to
- Owners/admins can add/remove members
- Users can leave events (delete own membership)

---

## P1.11: Update useAuth Hook

**Description**: Extend authentication hook to support event context.

**Files Affected**:
- `src/hooks/useAuth.tsx`

### Sub-tasks

#### P1.11.1: Add event role to auth state
**Description**: useAuth should optionally accept eventSlug and return role
**Dependencies**: P1.4.1, P1.7.2
**Note**: May delegate to useEventRole instead of modifying useAuth directly

#### P1.11.2: Remove is_admin dependency
**Description**: Replace all is_admin checks with event role checks
**Dependencies**: P1.11.1, P1.7.2
**Files to update**: All files using `profile.is_admin`

---

## Phase 1 Dependency Graph

```
P1.1.1 → P1.1.2 → P1.1.3 ─┬→ P1.3.1
                          │
P1.2.1-P1.2.8 ────────────┘
         │
         └→ P1.3.1 → P1.3.2 → P1.3.3

P1.1.2 → P1.4.1 → P1.4.2
              │
              └→ P1.4.3 → P1.4.4 → P1.4.5

P1.1.1 → P1.5.1 ─┬→ P1.5.2
                 ├→ P1.5.3
                 └→ P1.5.4

P1.6.1 → P1.6.2

P1.1.2 → P1.7.1 → P1.7.3 → P1.8.1 → P1.8.2-P1.8.8 → P1.9.1
P1.4.1 → P1.7.2 → P1.7.4

P1.2.* + P1.4.1 → P1.10.1-P1.10.7

P1.4.1 + P1.7.2 → P1.11.1 → P1.11.2
```

---

## Phase 1 Completion Criteria

- [ ] `events` table exists with EthBoulder record
- [ ] All tables have `event_id` column (NOT NULL, indexed)
- [ ] `event_members` table exists with migrated roles
- [ ] No hardcoded EVENT_DAYS in codebase
- [ ] No hardcoded timezone offsets in codebase
- [ ] `/e/[slug]/*` routes functional
- [ ] Old routes redirect to new routes
- [ ] All RLS policies updated for event scoping
- [ ] useEvent and useEventRole hooks working
- [ ] Existing EthBoulder functionality unchanged

---

# PHASE 2: Self-Serve Event Creation (Weeks 3-5)

## Objective
Enable anyone to create and configure their own unconference event through a guided wizard.

---

## P2.1: Event Creation Wizard Infrastructure

**Description**: Build the multi-step wizard framework at `/create`.

**Architectural Decision**:
> **AD-6**: Wizard state in React useReducer + localStorage persistence
> - Rationale: Progress preserved on navigation, single API call on completion
> - Trade-off: More complex state management than simple forms

**Files Affected**:
- `src/app/create/page.tsx` (NEW)
- `src/app/create/layout.tsx` (NEW)
- `src/app/create/steps/*.tsx` (NEW - 8 files)

### Sub-tasks

#### P2.1.1: Create wizard state management
**Description**: useReducer hook managing all wizard state
**Dependencies**: P1 complete
**File**: `src/app/create/useWizardState.ts`
**State shape**:
```typescript
interface WizardState {
  currentStep: number;
  basics: { name, tagline, description, slug, eventType, visibility };
  dates: { startDate, endDate, timezone, location, locationType };
  venues: Venue[];
  schedule: { days: Day[], slots: TimeSlot[] };
  tracks: Track[];
  voting: { credits, mechanism, windows, proposalConfig };
  branding: { theme, logo, banner, socialLinks };
  validation: Record<string, string[]>;
}
```

#### P2.1.2: Create wizard navigation component
**Description**: Step indicator, prev/next buttons, validation gating
**Dependencies**: P2.1.1
**File**: `src/app/create/WizardNavigation.tsx`

#### P2.1.3: Implement localStorage persistence
**Description**: Auto-save wizard state on each step change
**Dependencies**: P2.1.1
**Key**: `schellingpoint-event-wizard-draft`

#### P2.1.4: Create wizard container page
**Description**: Main page orchestrating wizard flow
**Dependencies**: P2.1.1, P2.1.2
**File**: `src/app/create/page.tsx`

---

## P2.2: Wizard Step 1 - Basics

**Description**: Event name, tagline, description, slug, type, visibility.

**Files Affected**:
- `src/app/create/steps/BasicsStep.tsx` (NEW)

### Sub-tasks

#### P2.2.1: Create BasicsStep component
**Description**: Form for basic event information
**Dependencies**: P2.1.1
**Fields**:
- Event name (required, max 100 chars)
- Tagline (optional, max 200 chars)
- Description (optional, rich text)
- Slug (auto-generated from name, editable, validated for uniqueness)
- Event type (unconference, hackathon, conference, meetup)
- Visibility (public, unlisted, private)

#### P2.2.2: Implement slug generation and validation
**Description**: Auto-generate URL-friendly slug, check availability via API
**Dependencies**: P2.2.1
**Validation**: Unique across all events, lowercase, alphanumeric + hyphens

---

## P2.3: Wizard Step 2 - Dates & Location

**Description**: Event dates, timezone, location configuration.

**Files Affected**:
- `src/app/create/steps/DatesStep.tsx` (NEW)

### Sub-tasks

#### P2.3.1: Create DatesStep component
**Description**: Form for dates and location
**Dependencies**: P2.1.1
**Fields**:
- Start date (date picker)
- End date (date picker, must be >= start)
- Timezone (searchable dropdown, IANA format, auto-detect from browser)
- Location type (in-person, virtual, hybrid)
- Location name (conditional on type)
- Location address (conditional, with autocomplete)

#### P2.3.2: Implement timezone picker
**Description**: Searchable dropdown of IANA timezones with auto-detection
**Dependencies**: P2.3.1
**File**: `src/components/TimezonePicker.tsx`
**Data source**: Intl.supportedValuesOf('timeZone')

---

## P2.4: Wizard Step 3 - Venues

**Description**: Define physical/virtual spaces for sessions.

**Files Affected**:
- `src/app/create/steps/VenuesStep.tsx` (NEW)

**Related Tasks**: Reuse `VenueAvailabilityEditor` from `admin/setup`

### Sub-tasks

#### P2.4.1: Create VenuesStep component
**Description**: Add/edit/remove venues
**Dependencies**: P2.1.1
**Features**:
- Venue name, capacity, features, address
- Drag-and-drop reordering
- Import from previous event (if user has past events)

#### P2.4.2: Extract VenueEditor as reusable component
**Description**: Refactor venue editing from admin/setup for reuse
**Dependencies**: P2.4.1
**File**: `src/components/admin/VenueEditor.tsx`
**RELATED**: P5.6 (admin venue management)

---

## P2.5: Wizard Step 4 - Schedule Structure

**Description**: Define event days and time slot templates.

**Files Affected**:
- `src/app/create/steps/ScheduleStep.tsx` (NEW)

### Sub-tasks

#### P2.5.1: Create ScheduleStep component
**Description**: Configure time slots for each day/venue
**Dependencies**: P2.1.1, P2.3.1 (needs dates), P2.4.1 (needs venues)
**Features**:
- Auto-populated days from start/end dates
- Time slot templates per venue per day
- Bulk creation: "45-min sessions with 15-min breaks from 9am-5pm"
- Break/lunch/checkin presets

#### P2.5.2: Create BulkSlotCreator component
**Description**: UI for generating multiple time slots at once
**Dependencies**: P2.5.1
**File**: `src/components/admin/BulkSlotCreator.tsx`
**RELATED**: P5.7 (admin time slot management)

---

## P2.6: Wizard Step 5 - Tracks & Categories

**Description**: Define content tracks for the event.

**Files Affected**:
- `src/app/create/steps/TracksStep.tsx` (NEW)

### Sub-tasks

#### P2.6.1: Create TracksStep component
**Description**: Add/edit tracks with name, color, description
**Dependencies**: P2.1.1
**Features**:
- Track name, color (color picker), description
- Track lead assignment (optional, search users)
- Toggle: require sessions to belong to a track

#### P2.6.2: Create ColorPicker component
**Description**: Reusable color picker for tracks and theming
**Dependencies**: None
**File**: `src/components/ColorPicker.tsx`
**RELATED**: P3.3 (branding color picker)

---

## P2.7: Wizard Step 6 - Voting Configuration

**Description**: Configure quadratic voting and proposal settings.

**Files Affected**:
- `src/app/create/steps/VotingStep.tsx` (NEW)

### Sub-tasks

#### P2.7.1: Create VotingStep component
**Description**: Configure voting mechanism and windows
**Dependencies**: P2.1.1
**Fields**:
- Vote credits per attendee (default 100)
- Voting mechanism (quadratic, linear, approval)
- Voting window (opens at, closes at)
- Proposal window (opens at, closes at)
- Max proposals per user
- Require proposal approval (boolean)
- Allowed session formats (multi-select)
- Allowed session durations (multi-select)

#### P2.7.2: Create voting explainer component
**Description**: Visual explanation of QV vs linear vs approval voting
**Dependencies**: P2.7.1
**File**: `src/components/VotingExplainer.tsx`

---

## P2.8: Wizard Step 7 - Branding

**Description**: Logo, colors, and visual theme configuration.

**Files Affected**:
- `src/app/create/steps/BrandingStep.tsx` (NEW)

**Related Tasks**: P3 (full branding system implementation)

### Sub-tasks

#### P2.8.1: Create BrandingStep component
**Description**: Configure visual identity
**Dependencies**: P2.1.1
**Fields**:
- Logo upload (max 2MB, square aspect)
- Banner image upload (max 5MB, 16:9)
- Color theme picker (primary, secondary, accent, background)
- Theme template selection (prebuilt themes)
- Social links (Twitter, Telegram, Discord, website)

#### P2.8.2: Create theme preview component
**Description**: Live preview of branding choices
**Dependencies**: P2.8.1
**File**: `src/components/ThemePreview.tsx`
**RELATED**: P3.2 (ThemeProvider)

---

## P2.9: Wizard Step 8 - Review & Launch

**Description**: Summary and event creation.

**Files Affected**:
- `src/app/create/steps/ReviewStep.tsx` (NEW)

### Sub-tasks

#### P2.9.1: Create ReviewStep component
**Description**: Summary of all configuration with edit links
**Dependencies**: P2.2-P2.8
**Sections**: Each previous step summarized, "Edit" button per section

#### P2.9.2: Create event preview modal
**Description**: Preview of event landing page with branding applied
**Dependencies**: P2.9.1, P2.8.2

#### P2.9.3: Implement event creation API call
**Description**: Single transaction creating event + all associated records
**Dependencies**: P2.9.1
**Endpoint**: `POST /api/v1/events`
**Creates in transaction**:
- events record
- venues records
- time_slots records
- tracks records
- event_members record (creator as owner)

---

## P2.10: Event Templates System

**Description**: Pre-configured starting points for common event types.

**Files Affected**:
- `src/lib/events/templates.ts` (NEW)
- `src/app/create/TemplateSelector.tsx` (NEW)

### Sub-tasks

#### P2.10.1: Define template data structures
**Description**: Template configurations for common event types
**Dependencies**: P2.1.1
**Templates** (per strategy section 3.2):
- Unconference Classic
- Curated Conference
- Hackathon
- Community Meetup

#### P2.10.2: Create TemplateSelector component
**Description**: UI to choose template before starting wizard
**Dependencies**: P2.10.1
**Location**: First screen before wizard steps

#### P2.10.3: Implement "Clone from Previous Event"
**Description**: Load settings from user's past event
**Dependencies**: P2.10.2
**API**: `GET /api/v1/me/events` to list cloneable events

---

## P2.11: Platform Landing Page

**Description**: Transform root `/` into event discovery hub.

**Files Affected**:
- `src/app/page.tsx` (MAJOR REWRITE)

**Related Tasks**: P1.9 (redirects from old routes)

### Sub-tasks

#### P2.11.1: Design platform landing layout
**Description**: Hero section, featured events, upcoming events grid
**Dependencies**: P1 complete
**Sections**:
- Hero: "Power your unconference with Schelling Point"
- Featured events carousel
- Upcoming events grid (filterable)
- "Create Your Event" CTA
- "My Events" for logged-in users

#### P2.11.2: Implement event discovery grid
**Description**: Filterable, paginated event listing
**Dependencies**: P2.11.1
**Filters**: Date range, location, category, search text
**Sort**: Start date, popularity, recently added

#### P2.11.3: Implement featured events carousel
**Description**: Platform-curated featured events
**Dependencies**: P2.11.1
**Data**: `events.is_featured = true`

---

## P2.12: Event Lifecycle State Machine

**Description**: Enforce valid state transitions and automate phase changes.

**Files Affected**:
- `src/lib/events/lifecycle.ts` (NEW)
- `supabase/migrations/[timestamp]_event_lifecycle.sql` (NEW)

**Architectural Decision**:
> **AD-7**: Event phases control feature availability
> - Transitions can be manual or automatic (timestamp-based)
> - Invalid transitions blocked at DB and application level

### Sub-tasks

#### P2.12.1: Define state machine transitions
**Description**: Valid transitions between event statuses
**Dependencies**: P1.1.1
**States**: draft → published → proposals_open → voting_open → scheduling → live → completed → archived
**File**: `src/lib/events/lifecycle.ts`

#### P2.12.2: Create DB trigger for automatic transitions
**Description**: Cron job or trigger to advance state based on timestamps
**Dependencies**: P2.12.1
**Logic**:
```sql
-- When current time > proposals_open_at AND status = 'published'
-- → Update status to 'proposals_open'
```

#### P2.12.3: Create status transition API
**Description**: Admin endpoint to manually advance/revert status
**Dependencies**: P2.12.1
**Endpoint**: `PATCH /api/v1/events/{slug}/status`
**Validation**: Check transition is valid per state machine

#### P2.12.4: Add phase guards to UI
**Description**: Disable features based on current phase
**Dependencies**: P2.12.1, P1.7.1
**Examples**:
- Propose button disabled unless status = 'proposals_open'
- Vote buttons disabled unless status = 'voting_open'
- Schedule visible only after 'scheduling' phase

---

## Phase 2 Dependency Graph

```
P1 (complete) → P2.1.1 → P2.1.2 → P2.1.4
                    │
                    └→ P2.1.3

P2.1.1 → P2.2.1 → P2.2.2
P2.1.1 → P2.3.1 → P2.3.2
P2.1.1 → P2.4.1 → P2.4.2
P2.3.1 + P2.4.1 → P2.5.1 → P2.5.2
P2.1.1 → P2.6.1 → P2.6.2
P2.1.1 → P2.7.1 → P2.7.2
P2.1.1 → P2.8.1 → P2.8.2
P2.2-P2.8 → P2.9.1 → P2.9.2 → P2.9.3

P2.1.1 → P2.10.1 → P2.10.2 → P2.10.3

P1 → P2.11.1 → P2.11.2
                    │
                    └→ P2.11.3

P1.1.1 → P2.12.1 → P2.12.2
                 → P2.12.3
P2.12.1 + P1.7.1 → P2.12.4
```

---

## Phase 2 Completion Criteria

- [ ] Event creation wizard fully functional (8 steps)
- [ ] Event templates available
- [ ] Platform landing page shows event discovery
- [ ] Event lifecycle state machine enforced
- [ ] Event creator becomes owner automatically
- [ ] Created events appear in platform listing

---

# PHASE 3: Branding & Theming (Weeks 5-6)

## Objective
Enable events to have their own visual identity while maintaining "Powered by Schelling Point" attribution.

---

## P3.1: Theme Configuration Schema

**Description**: Define and validate the JSONB theme structure.

**Files Affected**:
- `src/lib/theme/schema.ts` (NEW)
- `src/lib/theme/defaults.ts` (NEW)

### Sub-tasks

#### P3.1.1: Define theme TypeScript types
**Description**: Type definitions matching strategy section 4.2
**Dependencies**: None
**File**: `src/lib/theme/schema.ts`

#### P3.1.2: Define default theme values
**Description**: Fallback values for missing theme properties
**Dependencies**: P3.1.1
**File**: `src/lib/theme/defaults.ts`

#### P3.1.3: Create theme validation function
**Description**: Validate theme JSONB against schema
**Dependencies**: P3.1.1
**Use**: Zod schema validation

---

## P3.2: ThemeProvider Implementation

**Description**: React context that injects CSS custom properties from event theme.

**Architectural Decision**:
> **AD-8**: CSS custom property injection for theming
> - Map theme.colors to CSS variables
> - Tailwind's existing `hsl(var(--primary))` system consumes them
> - No component changes needed

**Files Affected**:
- `src/lib/theme/ThemeProvider.tsx` (NEW)
- `src/app/e/[slug]/layout.tsx` (MODIFY)

### Sub-tasks

#### P3.2.1: Create ThemeProvider component
**Description**: Injects CSS variables at event layout level
**Dependencies**: P3.1.1, P1.8.1
**Implementation**:
```tsx
function ThemeProvider({ theme, children }) {
  const cssVars = themeToCssVariables(theme);
  return (
    <div style={cssVars}>
      {children}
    </div>
  );
}
```

#### P3.2.2: Create themeToCssVariables utility
**Description**: Convert theme object to CSS variable object
**Dependencies**: P3.1.1
**Maps**: `theme.colors.primary` → `--primary`

#### P3.2.3: Integrate ThemeProvider into event layout
**Description**: Wrap event pages with ThemeProvider
**Dependencies**: P3.2.1, P1.8.1
**File**: `src/app/e/[slug]/layout.tsx`

---

## P3.3: Theme Configuration UI

**Description**: UI for customizing event theme in wizard and settings.

**Files Affected**:
- `src/components/admin/ThemeEditor.tsx` (NEW)
- `src/app/e/[slug]/admin/settings/page.tsx` (NEW)

**Related Tasks**: P2.8 (wizard branding step)

### Sub-tasks

#### P3.3.1: Create ThemeEditor component
**Description**: Full theme editing UI with live preview
**Dependencies**: P3.1.1, P2.6.2 (ColorPicker)
**Sections**:
- Color palette editor
- Font selection (from allowed fonts)
- Border radius slider
- Style preset selector
- Dark/light mode toggle

#### P3.3.2: Create event settings page
**Description**: Admin page for editing event settings including theme
**Dependencies**: P3.3.1
**File**: `src/app/e/[slug]/admin/settings/page.tsx`
**Tabs**: General, Branding, Voting, Notifications

---

## P3.4: Pre-Built Theme Templates

**Description**: Ready-made themes per strategy section 4.4.

**Files Affected**:
- `src/lib/theme/templates.ts` (NEW)
- `src/components/ThemeTemplatePicker.tsx` (NEW)

### Sub-tasks

#### P3.4.1: Define theme template data
**Description**: 6-8 complete theme configurations
**Dependencies**: P3.1.1
**Templates**:
- Neon Dark (current EthBoulder)
- Ocean Breeze
- Sunset
- Forest
- Monochrome
- Web3 Purple
- Corporate Clean
- Festival

#### P3.4.2: Create ThemeTemplatePicker component
**Description**: Visual grid to select theme template
**Dependencies**: P3.4.1
**Features**: Preview thumbnail, one-click apply

---

## P3.5: Asset Storage Setup

**Description**: Configure Supabase Storage for event assets.

**Files Affected**:
- Supabase dashboard (Storage bucket config)
- `src/lib/storage/events.ts` (NEW)

### Sub-tasks

#### P3.5.1: Create events storage bucket
**Description**: Configure Supabase Storage bucket
**Dependencies**: None
**Structure**: `events/{event-id}/logo.png`, `banner.jpg`, `favicon.ico`
**Policies**: Event admins can upload to their event folder

#### P3.5.2: Create asset upload utilities
**Description**: Functions for uploading/retrieving event assets
**Dependencies**: P3.5.1
**File**: `src/lib/storage/events.ts`
**Functions**:
- `uploadEventLogo(eventId, file)`
- `uploadEventBanner(eventId, file)`
- `getEventAssetUrl(eventId, assetType)`

#### P3.5.3: Create ImageUpload component
**Description**: Reusable image upload with preview and cropping
**Dependencies**: P3.5.2
**File**: `src/components/ImageUpload.tsx`
**Features**: Drag-and-drop, aspect ratio enforcement, file size validation

---

## P3.6: Dynamic Metadata

**Description**: Page titles, OG images, favicons per event.

**Files Affected**:
- `src/app/e/[slug]/layout.tsx` (MODIFY)

### Sub-tasks

#### P3.6.1: Implement dynamic page metadata
**Description**: Next.js generateMetadata for event pages
**Dependencies**: P1.8.1
**Metadata**:
- title: `${event.name} | Schelling Point`
- description: event.description
- openGraph.title, openGraph.description
- openGraph.images: event.banner_url

#### P3.6.2: Implement dynamic favicon
**Description**: Use event favicon if set, fallback to platform
**Dependencies**: P3.5.2
**Note**: May require middleware or client-side favicon swap

---

## P3.7: Remove EthBoulder-Specific Branding

**Description**: Remove all hardcoded EthBoulder references from codebase.

**Files Affected**:
- `src/app/page.tsx` (REWRITE - now platform landing)
- `src/components/Footer.tsx` (MODIFY)
- `src/components/DashboardLayout.tsx` (MODIFY)

### Sub-tasks

#### P3.7.1: Update Footer component
**Description**: Make footer event-aware, add "Powered by Schelling Point"
**Dependencies**: P1.7.1
**Changes**:
- Remove EthBoulder logo, wordmark, links (lines 36-48, 118-177)
- Add event social links from theme
- Add "Powered by Schelling Point" attribution

#### P3.7.2: Update DashboardLayout component
**Description**: Show event name instead of "EthBoulder™"
**Dependencies**: P1.7.1
**Changes**: Line 205 - replace hardcoded subtitle with event.name

#### P3.7.3: Audit remaining hardcoded references
**Description**: Find and replace any remaining EthBoulder strings
**Dependencies**: P3.7.1, P3.7.2
**Search**: `grep -r "EthBoulder" src/`

---

## Phase 3 Completion Criteria

- [ ] ThemeProvider applying CSS variables
- [ ] Theme editor functional in wizard and settings
- [ ] 8 theme templates available
- [ ] Event asset upload working (logo, banner)
- [ ] Dynamic page metadata per event
- [ ] No hardcoded EthBoulder branding in codebase
- [ ] "Powered by Schelling Point" footer visible

---

# PHASE 4: Notifications & Communications (Weeks 6-8)

## Objective
Keep session hosts and attendees informed throughout the event lifecycle.

---

## P4.1: Notification Database Schema

**Description**: Tables for notification storage and preferences.

**Files Affected**:
- `supabase/migrations/[timestamp]_notifications.sql` (NEW)

### Sub-tasks

#### P4.1.1: Create notifications table
**Description**: Per strategy section 6.3
**Dependencies**: P1 complete
**Schema**:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  channel TEXT NOT NULL DEFAULT 'in_app',
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_user_unread
  ON notifications(user_id) WHERE read_at IS NULL;
```

#### P4.1.2: Create notification_preferences table
**Description**: Per-user, per-event notification settings
**Dependencies**: P4.1.1
**Schema**:
```sql
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  event_id UUID REFERENCES events(id),
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, event_id, notification_type)
);
```

---

## P4.2: Database Triggers for Status Changes

**Description**: Automatically create notifications on session status changes.

**Files Affected**:
- `supabase/migrations/[timestamp]_notification_triggers.sql` (NEW)

### Sub-tasks

#### P4.2.1: Create session status change trigger
**Description**: Per strategy section 6.6
**Dependencies**: P4.1.1
**Trigger**: On sessions UPDATE when status changes
**Creates notifications for**: host + co-hosts

#### P4.2.2: Create vote milestone trigger
**Description**: Notify when session reaches vote milestones
**Dependencies**: P4.1.1
**Milestones**: 10, 25, 50, 100 votes

#### P4.2.3: Create co-host invite trigger
**Description**: Notify on co-host invitation and response
**Dependencies**: P4.1.1

---

## P4.3: Email Template Library

**Description**: Create all email templates per strategy section 6.4.

**Files Affected**:
- `src/lib/email/templates/*.tsx` (NEW - 10+ files)

**Related Tasks**: Uses existing Resend integration

### Sub-tasks

#### P4.3.1: Create base email template
**Description**: Shared layout with event branding
**Dependencies**: P3.2 (theme access)
**File**: `src/lib/email/templates/BaseTemplate.tsx`
**Includes**: Event logo, colors, footer

#### P4.3.2: Create session-submitted template
**Description**: Confirmation when session is proposed
**Dependencies**: P4.3.1

#### P4.3.3: Create session-approved template
**Description**: Notification when session is approved
**Dependencies**: P4.3.1

#### P4.3.4: Create session-rejected template
**Description**: Notification with rejection reason
**Dependencies**: P4.3.1

#### P4.3.5: Improve session-scheduled template
**Description**: Enhanced version of existing template
**Dependencies**: P4.3.1
**Improvements**: Event branding, venue details, add-to-calendar links

#### P4.3.6: Create session-rescheduled template
**Description**: Notification when time/venue changes
**Dependencies**: P4.3.1

#### P4.3.7: Create voting-open template
**Description**: Event-wide announcement
**Dependencies**: P4.3.1

#### P4.3.8: Create schedule-published template
**Description**: Event-wide announcement with schedule link
**Dependencies**: P4.3.1

#### P4.3.9: Create admin-new-proposal template
**Description**: Alert admins to new proposals
**Dependencies**: P4.3.1

#### P4.3.10: Create event-reminder template
**Description**: Day-before and hour-before reminders
**Dependencies**: P4.3.1

---

## P4.4: In-App Notification Center

**Description**: Bell icon with dropdown showing recent notifications.

**Files Affected**:
- `src/components/NotificationCenter.tsx` (NEW)
- `src/components/DashboardLayout.tsx` (MODIFY)
- `src/app/e/[slug]/notifications/page.tsx` (NEW)

### Sub-tasks

#### P4.4.1: Create NotificationBell component
**Description**: Bell icon with unread count badge
**Dependencies**: P4.1.1
**File**: `src/components/NotificationBell.tsx`

#### P4.4.2: Create NotificationDropdown component
**Description**: Dropdown showing recent notifications
**Dependencies**: P4.4.1
**Features**: Mark as read, click to navigate, "View all" link

#### P4.4.3: Add NotificationBell to DashboardLayout
**Description**: Integrate into header
**Dependencies**: P4.4.1, P4.4.2

#### P4.4.4: Create full notifications page
**Description**: `/e/{slug}/notifications` with pagination
**Dependencies**: P4.1.1
**Features**: Filter by type, mark all read, pagination

---

## P4.5: Notification Preferences UI

**Description**: Let users control their notification settings.

**Files Affected**:
- `src/app/e/[slug]/settings/notifications/page.tsx` (NEW)
- `src/components/NotificationPreferences.tsx` (NEW)

### Sub-tasks

#### P4.5.1: Create NotificationPreferences component
**Description**: Toggle matrix for notification types × channels
**Dependencies**: P4.1.2
**Channels**: Email, In-app, Push (future)
**Types**: Session status, event announcements, admin alerts

#### P4.5.2: Create user notifications settings page
**Description**: Page for managing preferences
**Dependencies**: P4.5.1
**File**: `src/app/e/[slug]/settings/notifications/page.tsx`

---

## P4.6: Notification Dispatch System

**Description**: Process notification queue and send via appropriate channels.

**Files Affected**:
- `supabase/functions/process-notifications/index.ts` (NEW)
- `src/lib/notifications/dispatcher.ts` (NEW)

### Sub-tasks

#### P4.6.1: Create notification dispatcher
**Description**: Check preferences, dispatch to appropriate channel
**Dependencies**: P4.1.1, P4.1.2
**Logic**:
1. Read pending notifications (sent_at IS NULL)
2. Check user preferences
3. Send via enabled channels
4. Update sent_at

#### P4.6.2: Create Edge Function for email dispatch
**Description**: Supabase Edge Function calling Resend
**Dependencies**: P4.6.1, P4.3.*
**Trigger**: Database webhook or cron

#### P4.6.3: Create real-time notification hook
**Description**: useRealtimeNotifications hook for live updates
**Dependencies**: P4.1.1
**Implementation**: Supabase realtime subscription

---

## P4.7: Admin Broadcast Messaging

**Description**: Allow admins to send messages to all attendees.

**Files Affected**:
- `src/app/e/[slug]/admin/communications/page.tsx` (NEW)

### Sub-tasks

#### P4.7.1: Create communications admin page
**Description**: Send announcements to event attendees
**Dependencies**: P4.6.1
**Features**:
- Compose message (title, body)
- Select channels (email, in-app)
- Target audience (all attendees, hosts only, admins only)
- Preview before sending
- Send history

#### P4.7.2: Implement broadcast API
**Description**: Endpoint to create notifications for all members
**Dependencies**: P4.7.1
**Endpoint**: `POST /api/v1/events/{slug}/admin/broadcast`

---

## Phase 4 Completion Criteria

- [ ] Notifications table populated on session status changes
- [ ] All 10+ email templates created and tested
- [ ] In-app notification center with bell icon
- [ ] Notification preferences UI functional
- [ ] Email dispatch working via Resend
- [ ] Admin broadcast messaging functional
- [ ] Users can toggle notification preferences

---

# PHASE 5: Admin Dashboard Overhaul (Weeks 8-10)

## Objective
Make managing an event fast, intuitive, and powerful for organizers.

---

## P5.1: Batch Session Operations

**Description**: Select and operate on multiple sessions at once.

**Files Affected**:
- `src/app/e/[slug]/admin/page.tsx` (MAJOR MODIFY)
- `src/components/admin/SessionTable.tsx` (NEW)
- `src/components/admin/BatchActions.tsx` (NEW)

### Sub-tasks

#### P5.1.1: Create SessionTable component
**Description**: Data table with multi-select capability
**Dependencies**: P1.8.8
**Features**:
- Checkbox selection (single, all, shift-click range)
- Sortable columns (votes, date, title, status)
- Expandable rows for details

#### P5.1.2: Create BatchActions component
**Description**: Toolbar appearing when sessions selected
**Dependencies**: P5.1.1
**Actions**:
- Batch approve
- Batch reject (with reason)
- Batch assign track
- Batch delete (with confirmation)

#### P5.1.3: Implement batch API endpoints
**Description**: Server endpoints for batch operations
**Dependencies**: P5.1.2
**Endpoints**:
- `PATCH /api/v1/events/{slug}/sessions/batch`

---

## P5.2: Session Search and Filtering

**Description**: Find sessions quickly in large events.

**Files Affected**:
- `src/components/admin/SessionFilters.tsx` (NEW)

### Sub-tasks

#### P5.2.1: Create search bar component
**Description**: Search by title, host name, tags
**Dependencies**: P5.1.1
**Features**: Debounced search, highlight matches

#### P5.2.2: Create filter panel
**Description**: Filter sessions by multiple criteria
**Dependencies**: P5.1.1
**Filters**:
- Status (pending, approved, rejected, scheduled)
- Track (multi-select)
- Format (talk, workshop, etc.)
- Vote count range (min-max slider)
- Has time preference (boolean)
- Has co-hosts (boolean)

#### P5.2.3: Create sort options
**Description**: Sort sessions by various fields
**Dependencies**: P5.1.1
**Options**: Votes (desc), date submitted, title, duration

---

## P5.3: Schedule Builder Conflict Detection

**Description**: Visual feedback when scheduling conflicts occur.

**Files Affected**:
- `src/app/e/[slug]/admin/schedule/page.tsx` (MAJOR MODIFY)
- `src/components/admin/ScheduleGrid.tsx` (MODIFY)

### Sub-tasks

#### P5.3.1: Implement slot occupancy detection
**Description**: Track which slots are occupied
**Dependencies**: P1.8.8
**Data structure**: Map<slotId, sessionId>

#### P5.3.2: Add conflict visual feedback
**Description**: Red highlight when dropping into occupied slot
**Dependencies**: P5.3.1
**UI**: Border color change, tooltip explaining conflict

#### P5.3.3: Add duration mismatch warning
**Description**: Warning when session duration doesn't match slot
**Dependencies**: P5.3.1
**UI**: Yellow warning icon with tooltip

---

## P5.4: Capacity Warnings

**Description**: Alert when high-vote sessions assigned to small venues.

**Files Affected**:
- `src/components/admin/ScheduleGrid.tsx` (MODIFY)

### Sub-tasks

#### P5.4.1: Calculate estimated attendance
**Description**: Estimate attendance from vote count
**Dependencies**: P5.3.1
**Formula**: Historical conversion rate or configurable multiplier

#### P5.4.2: Add capacity indicator to schedule grid
**Description**: Color-coded capacity status
**Dependencies**: P5.4.1
**Colors**:
- Green: estimated < 70% capacity
- Yellow: 70-100% capacity
- Red: > 100% capacity

#### P5.4.3: Add capacity warning on drag-drop
**Description**: Warn before finalizing undersized venue assignment
**Dependencies**: P5.4.2
**UI**: Confirmation dialog with capacity details

---

## P5.5: Auto-Scheduling Algorithm

**Description**: Automatically place sessions in optimal slots.

**Files Affected**:
- `src/lib/scheduling/auto-scheduler.ts` (NEW)
- `src/app/api/v1/events/[slug]/admin/auto-schedule/route.ts` (NEW)

**Architectural Decision**:
> **AD-9**: Greedy algorithm with scoring function
> - Process sessions by vote count (highest first)
> - Score each available slot
> - Assign to highest-scoring slot
> - Admin previews before confirming

### Sub-tasks

#### P5.5.1: Implement slot scoring function
**Description**: Score slots for a given session
**Dependencies**: P5.3.1
**Scoring criteria** (per strategy section 9.2):
- Time preference match: +10
- Capacity fit: +5
- Track spread: +3
- Duration match: +8

#### P5.5.2: Implement auto-scheduler algorithm
**Description**: Place all approved sessions optimally
**Dependencies**: P5.5.1
**Algorithm**:
1. Sort approved sessions by vote count (desc)
2. For each session, find highest-scoring available slot
3. Assign session to slot
4. Return proposed schedule

#### P5.5.3: Create auto-schedule preview UI
**Description**: Show proposed schedule before applying
**Dependencies**: P5.5.2
**Features**: Side-by-side comparison, accept/reject individual assignments

#### P5.5.4: Implement auto-schedule API endpoint
**Description**: Endpoint to generate and apply auto-schedule
**Dependencies**: P5.5.2
**Endpoints**:
- `POST /api/v1/events/{slug}/admin/auto-schedule/preview`
- `POST /api/v1/events/{slug}/admin/auto-schedule/apply`

---

## P5.6: Admin Analytics Dashboard

**Description**: Insights into event proposals, voting, and attendance.

**Files Affected**:
- `src/app/e/[slug]/admin/analytics/page.tsx` (NEW)
- `src/components/admin/AnalyticsCharts.tsx` (NEW)

### Sub-tasks

#### P5.6.1: Create analytics page layout
**Description**: Dashboard with multiple stat cards and charts
**Dependencies**: P1.8.8
**Sections**: Proposals, Voting, Attendees, Schedule

#### P5.6.2: Implement proposal stats
**Description**: Total proposals, approval rate, per-track breakdown
**Dependencies**: P5.6.1
**Charts**: Bar chart by track, pie chart by status

#### P5.6.3: Implement voting stats
**Description**: Total votes, credits spent, participation rate
**Dependencies**: P5.6.1
**Charts**: Distribution histogram, top-voted sessions list

#### P5.6.4: Implement attendee stats
**Description**: Total members, joined over time, proposals per attendee
**Dependencies**: P5.6.1
**Charts**: Line chart over time, participation distribution

#### P5.6.5: Implement schedule stats
**Description**: Slot utilization, venue utilization, track distribution
**Dependencies**: P5.6.1
**Charts**: Heatmap of slot usage, utilization percentages

---

## P5.7: Admin Session Creation

**Description**: Admins can create sessions directly (for curated speakers).

**Files Affected**:
- `src/app/e/[slug]/admin/sessions/new/page.tsx` (NEW)
- `src/components/admin/SessionForm.tsx` (NEW)

### Sub-tasks

#### P5.7.1: Create admin session form
**Description**: Full form for creating curated sessions
**Dependencies**: P1.8.8
**Features**:
- All session fields (title, description, format, duration, etc.)
- Status can be set directly to approved/scheduled
- Host selection (search users or external name)
- Immediate slot assignment option

#### P5.7.2: Implement bulk import via CSV
**Description**: Upload CSV to create multiple sessions
**Dependencies**: P5.7.1
**CSV columns**: title, description, host_email, format, duration, track
**Validation**: Validate all rows before importing

---

## P5.8: Schedule Draft/Publish Workflow

**Description**: Build schedule privately, preview, then publish.

**Files Affected**:
- `src/lib/events/schedule-status.ts` (NEW)
- `src/app/e/[slug]/admin/schedule/page.tsx` (MODIFY)

### Sub-tasks

#### P5.8.1: Add schedule_published_at to events
**Description**: Track when schedule was last published
**Dependencies**: P1.1.1
**Migration**: `ALTER TABLE events ADD COLUMN schedule_published_at TIMESTAMPTZ`

#### P5.8.2: Implement draft mode indicator
**Description**: Show "Draft" badge when unpublished changes exist
**Dependencies**: P5.8.1
**Logic**: Compare session assignments to last published state

#### P5.8.3: Create schedule preview modal
**Description**: Preview how attendees will see the schedule
**Dependencies**: P5.8.2

#### P5.8.4: Implement publish workflow
**Description**: "Publish Schedule" button with confirmation
**Dependencies**: P5.8.3
**Actions**:
1. Update schedule_published_at
2. Set event status to appropriate phase
3. Trigger "schedule published" notification

---

## P5.9: Track Management UI

**Description**: Full CRUD for tracks with enhanced features.

**Files Affected**:
- `src/app/e/[slug]/admin/tracks/page.tsx` (NEW)
- `src/components/admin/TrackEditor.tsx` (NEW)

### Sub-tasks

#### P5.9.1: Create tracks admin page
**Description**: List and manage all tracks
**Dependencies**: P1.8.8
**Features**:
- Track list with session counts
- Add/edit/delete tracks
- Drag-and-drop reorder

#### P5.9.2: Create TrackEditor component
**Description**: Form for editing track details
**Dependencies**: P5.9.1
**Fields**:
- Name, color (picker), description, icon
- Track lead (user search)
- Max sessions limit
- Proposal guidelines

---

## P5.10: Undo/Redo in Schedule Builder

**Description**: Allow reverting scheduling mistakes.

**Files Affected**:
- `src/hooks/useScheduleHistory.ts` (NEW)
- `src/app/e/[slug]/admin/schedule/page.tsx` (MODIFY)

### Sub-tasks

#### P5.10.1: Create schedule history hook
**Description**: Maintain stack of scheduling actions
**Dependencies**: P5.3.1
**State**: Array of {action, sessionId, fromSlotId, toSlotId}

#### P5.10.2: Implement undo functionality
**Description**: Ctrl+Z to revert last action
**Dependencies**: P5.10.1
**UI**: Undo button in toolbar, keyboard shortcut

#### P5.10.3: Implement redo functionality
**Description**: Ctrl+Shift+Z to redo undone action
**Dependencies**: P5.10.2

#### P5.10.4: Implement "Reset Day" action
**Description**: Clear all assignments for a specific day
**Dependencies**: P5.10.1
**UI**: Button with confirmation dialog

---

## Phase 5 Completion Criteria

- [ ] Batch session operations functional
- [ ] Session search and filtering working
- [ ] Schedule builder shows conflict warnings
- [ ] Capacity warnings displayed
- [ ] Auto-scheduling algorithm produces valid schedules
- [ ] Analytics dashboard shows meaningful stats
- [ ] Admins can create curated sessions
- [ ] Schedule draft/publish workflow working
- [ ] Track management UI complete
- [ ] Undo/redo in schedule builder

---

# PHASE 6: Attendee Experience (Weeks 10-12)

## Objective
Make attending an event delightful with better discovery, calendar integration, and engagement features.

---

## P6.1: Event-Scoped Voting with Per-Event Credits

**Description**: Ensure voting is fully isolated per event.

**Files Affected**:
- `src/app/e/[slug]/sessions/page.tsx` (MODIFY)
- `src/components/VoteButton.tsx` (MODIFY)

### Sub-tasks

#### P6.1.1: Update vote credit display
**Description**: Show event-specific remaining credits
**Dependencies**: P1.4.1
**Source**: event_members.vote_credits OR events.vote_credits_per_user

#### P6.1.2: Update vote submission
**Description**: Ensure votes include event_id
**Dependencies**: P1.2.2
**Validation**: Check user is event member with credits

#### P6.1.3: Add credit refund on vote removal
**Description**: Return credits when reducing votes
**Dependencies**: P6.1.2
**Note**: Already may exist; verify event-scoped

---

## P6.2: Improved Session Discovery

**Description**: Help attendees find relevant sessions in large events.

**Files Affected**:
- `src/app/e/[slug]/sessions/page.tsx` (MAJOR MODIFY)
- `src/components/SessionSearch.tsx` (NEW)
- `src/components/SessionRecommendations.tsx` (NEW)

### Sub-tasks

#### P6.2.1: Add full-text search
**Description**: Search titles, descriptions, tags
**Dependencies**: P1.8.3
**Implementation**: PostgreSQL full-text search or client-side filtering

#### P6.2.2: Add advanced filters
**Description**: Filter by track, format, time, favorited
**Dependencies**: P6.2.1
**Filters**: Track, format, day, has open capacity

#### P6.2.3: Create session recommendations
**Description**: Suggest sessions based on user's interests
**Dependencies**: P6.2.1
**Algorithm**: Similar to sessions user voted for, popular in tracks they follow

#### P6.2.4: Add "Similar Sessions" on detail page
**Description**: Show related sessions
**Dependencies**: P6.2.3
**Criteria**: Same track, shared tags, same host

---

## P6.3: Calendar Integration

**Description**: Export schedule to external calendars.

**Files Affected**:
- `src/lib/calendar/ics.ts` (NEW)
- `src/app/api/v1/events/[slug]/calendar/route.ts` (NEW)
- `src/components/AddToCalendar.tsx` (NEW)

### Sub-tasks

#### P6.3.1: Create ICS file generator
**Description**: Generate .ics files for sessions
**Dependencies**: None
**File**: `src/lib/calendar/ics.ts`

#### P6.3.2: Create single-session ICS download
**Description**: Download .ics for individual session
**Dependencies**: P6.3.1
**Endpoint**: `/api/v1/events/{slug}/sessions/{id}/calendar.ics`

#### P6.3.3: Create full schedule ICS download
**Description**: Download .ics with all favorited sessions
**Dependencies**: P6.3.1
**Endpoint**: `/api/v1/events/{slug}/calendar.ics`

#### P6.3.4: Create subscribable calendar feed
**Description**: URL that auto-updates when schedule changes
**Dependencies**: P6.3.3
**Endpoint**: `/api/v1/events/{slug}/calendar/subscribe.ics`

#### P6.3.5: Create AddToCalendar component
**Description**: Button with Google Calendar, Apple Calendar, ICS options
**Dependencies**: P6.3.1
**File**: `src/components/AddToCalendar.tsx`

---

## P6.4: PWA Support

**Description**: Offline schedule viewing and home screen installation.

**Files Affected**:
- `public/manifest.json` (NEW)
- `public/sw.js` (NEW)
- `src/app/layout.tsx` (MODIFY)

### Sub-tasks

#### P6.4.1: Create web app manifest
**Description**: PWA manifest for installability
**Dependencies**: None
**Properties**: name, icons, theme_color, start_url, display

#### P6.4.2: Create service worker
**Description**: Cache schedule data for offline access
**Dependencies**: P6.4.1
**Strategy**: Network-first with cache fallback for schedule

#### P6.4.3: Add install prompt
**Description**: "Add to Home Screen" banner
**Dependencies**: P6.4.2
**UI**: Dismissable banner on mobile

#### P6.4.4: Implement offline schedule view
**Description**: Show cached schedule when offline
**Dependencies**: P6.4.2
**Features**: Last-updated timestamp, offline indicator

---

## P6.5: Session RSVP with Capacity Tracking

**Description**: Let attendees indicate intent to attend specific sessions.

**Files Affected**:
- `supabase/migrations/[timestamp]_session_rsvps.sql` (NEW)
- `src/components/RSVPButton.tsx` (NEW)

### Sub-tasks

#### P6.5.1: Create session_rsvps table
**Description**: Track RSVPs per session
**Dependencies**: P1.2.1
**Schema**:
```sql
CREATE TABLE session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);
```

#### P6.5.2: Create RSVPButton component
**Description**: RSVP/un-RSVP with capacity indicator
**Dependencies**: P6.5.1
**Display**: "23 / 50 spots" or "Waitlist (12 ahead)"

#### P6.5.3: Implement waitlist auto-promotion
**Description**: Promote from waitlist when spot opens
**Dependencies**: P6.5.1, P4.6.1
**Trigger**: On RSVP cancellation, promote first waitlisted

---

## P6.6: Post-Session Feedback System

**Description**: Collect ratings and comments after sessions.

**Files Affected**:
- `supabase/migrations/[timestamp]_session_feedback.sql` (NEW)
- `src/app/e/[slug]/sessions/[id]/feedback/page.tsx` (NEW)
- `src/components/SessionRating.tsx` (NEW)

### Sub-tasks

#### P6.6.1: Create session_feedback table
**Description**: Per strategy section 12.13
**Dependencies**: P1.2.1
**Schema**: See strategy doc

#### P6.6.2: Create feedback submission page
**Description**: Form for rating and commenting
**Dependencies**: P6.6.1
**Fields**: 1-5 star rating, optional comment, anonymous toggle

#### P6.6.3: Create SessionRating component
**Description**: Star rating display and input
**Dependencies**: P6.6.2
**File**: `src/components/SessionRating.tsx`

#### P6.6.4: Add feedback to session detail page
**Description**: Show aggregate rating and feedback
**Dependencies**: P6.6.1
**Display**: Average rating, total ratings, recent comments (if not anonymous)

---

## P6.7: Session Resources

**Description**: Hosts can share slides, recordings, links.

**Files Affected**:
- Session table (add `resources JSONB`)
- `src/components/SessionResources.tsx` (NEW)

### Sub-tasks

#### P6.7.1: Add resources column to sessions
**Description**: JSONB array of resources
**Dependencies**: P1.2.1
**Migration**: `ALTER TABLE sessions ADD COLUMN resources JSONB DEFAULT '[]'`

#### P6.7.2: Create resource editor for hosts
**Description**: Add/edit resources on session
**Dependencies**: P6.7.1
**Resource types**: slides, recording, code, website, other

#### P6.7.3: Display resources on session detail
**Description**: Show resources with icons and links
**Dependencies**: P6.7.2
**UI**: Icon per type, title, link

---

## Phase 6 Completion Criteria

- [ ] Per-event vote credits working
- [ ] Session search and filtering functional
- [ ] Calendar export (.ics) working
- [ ] Subscribable calendar feed functional
- [ ] PWA installable with offline schedule
- [ ] Session RSVP with capacity tracking
- [ ] Waitlist auto-promotion working
- [ ] Post-session feedback collection working
- [ ] Session resources editable by hosts

---

# PHASE 7: Ticketing & Revenue Distribution (Weeks 12-16)

## Objective
Enable paid events with trustless revenue distribution to session hosts.

---

## P7.1: Ticket Tier Configuration

**Description**: Define ticket types and pricing.

**Files Affected**:
- `supabase/migrations/[timestamp]_ticketing.sql` (NEW)
- `src/app/e/[slug]/admin/tickets/page.tsx` (NEW)

### Sub-tasks

#### P7.1.1: Create ticket_tiers table
**Description**: Per strategy section 10.1
**Dependencies**: P1.1.2

#### P7.1.2: Create tickets table
**Description**: Per strategy section 10.1
**Dependencies**: P7.1.1

#### P7.1.3: Create ticket admin page
**Description**: Define and manage ticket tiers
**Dependencies**: P7.1.1
**Features**: Add/edit tiers, set pricing, quantities, sale windows

---

## P7.2: Stripe Payment Integration

**Description**: Accept fiat payments via Stripe.

**Files Affected**:
- `src/lib/payments/stripe.ts` (NEW)
- `src/app/api/v1/events/[slug]/checkout/route.ts` (NEW)
- `src/app/e/[slug]/tickets/page.tsx` (NEW)

### Sub-tasks

#### P7.2.1: Set up Stripe integration
**Description**: Initialize Stripe SDK, configure webhooks
**Dependencies**: P7.1.2
**Env vars**: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

#### P7.2.2: Create checkout flow
**Description**: Select tier → Stripe checkout → confirm
**Dependencies**: P7.2.1

#### P7.2.3: Create ticket purchase confirmation
**Description**: Success page after purchase
**Dependencies**: P7.2.2

#### P7.2.4: Implement Stripe webhooks
**Description**: Handle payment events
**Dependencies**: P7.2.1
**Events**: checkout.session.completed, payment_intent.failed

---

## P7.3: QR Code Ticket Generation

**Description**: Generate unique QR codes for check-in.

**Files Affected**:
- `src/lib/tickets/qr.ts` (NEW)
- `src/components/TicketQR.tsx` (NEW)

### Sub-tasks

#### P7.3.1: Generate QR codes on purchase
**Description**: Unique code per ticket
**Dependencies**: P7.1.2
**Format**: JWT containing ticket_id, event_id, user_id

#### P7.3.2: Create TicketQR component
**Description**: Display QR code for check-in
**Dependencies**: P7.3.1

#### P7.3.3: Add QR to ticket confirmation email
**Description**: Include QR in purchase confirmation
**Dependencies**: P7.3.1, P4.3.*

---

## P7.4: Check-In Scanner

**Description**: Mobile-friendly scanner for volunteers.

**Files Affected**:
- `src/app/e/[slug]/checkin/page.tsx` (NEW)
- `src/components/QRScanner.tsx` (NEW)

### Sub-tasks

#### P7.4.1: Create QR scanner component
**Description**: Camera-based QR code scanner
**Dependencies**: P7.3.1
**Library**: html5-qrcode or similar

#### P7.4.2: Create check-in page
**Description**: Scanner UI for volunteers
**Dependencies**: P7.4.1
**Features**: Scan, validate, show attendee name, mark checked in

#### P7.4.3: Implement check-in API
**Description**: Mark ticket as checked in
**Dependencies**: P7.1.2
**Endpoint**: `POST /api/v1/events/{slug}/checkin`
**Validation**: Ticket valid, not already checked in

---

## P7.5: Revenue Dashboard

**Description**: Track ticket sales and revenue.

**Files Affected**:
- `src/app/e/[slug]/admin/revenue/page.tsx` (NEW)

### Sub-tasks

#### P7.5.1: Create revenue dashboard
**Description**: Sales stats and revenue tracking
**Dependencies**: P7.1.2
**Metrics**: Total tickets sold, revenue by tier, sales over time

#### P7.5.2: Add sales chart
**Description**: Line chart of sales over time
**Dependencies**: P7.5.1

---

## P7.6: Treasury Configuration

**Description**: Set up multi-sig treasury for revenue distribution.

**Files Affected**:
- `supabase/migrations/[timestamp]_treasury.sql` (NEW)
- `src/app/e/[slug]/admin/treasury/page.tsx` (NEW)

### Sub-tasks

#### P7.6.1: Create event_treasury table
**Description**: Per strategy section 10.2
**Dependencies**: P7.1.1

#### P7.6.2: Create treasury admin page
**Description**: Configure treasury settings
**Dependencies**: P7.6.1
**Fields**: Chain, treasury address, revenue share %, distributor contract

---

## P7.7: Smart Contract Development

**Description**: SchellingPointDistributor contract for trustless payouts.

**Files Affected**:
- `contracts/SchellingPointDistributor.sol` (NEW)
- `contracts/test/*.ts` (NEW)

### Sub-tasks

#### P7.7.1: Implement distributor contract
**Description**: Per strategy section 10.2
**Dependencies**: None (can develop in parallel)
**Functions**: registerResults, claim, getShare

#### P7.7.2: Write contract tests
**Description**: Full test coverage
**Dependencies**: P7.7.1

#### P7.7.3: Deploy to testnet
**Description**: Deploy and test on Sepolia
**Dependencies**: P7.7.2

---

## P7.8: Wallet Connection

**Description**: Hosts connect wallet to receive payouts.

**Files Affected**:
- `src/components/WalletConnect.tsx` (NEW)
- `src/app/e/[slug]/profile/wallet/page.tsx` (NEW)

### Sub-tasks

#### P7.8.1: Add wallet_address to profiles
**Description**: Store verified wallet address
**Dependencies**: P1 complete
**Migration**: `ALTER TABLE profiles ADD COLUMN wallet_address TEXT`

#### P7.8.2: Implement wallet connection
**Description**: Connect wallet using wagmi/RainbowKit
**Dependencies**: P7.8.1

#### P7.8.3: Implement wallet verification
**Description**: Sign message to prove ownership
**Dependencies**: P7.8.2

---

## P7.9: Payout Calculation

**Description**: Calculate each host's share based on QV votes.

**Files Affected**:
- `src/lib/payouts/calculator.ts` (NEW)
- `supabase/migrations/[timestamp]_host_payouts.sql` (NEW)

### Sub-tasks

#### P7.9.1: Create host_payouts table
**Description**: Per strategy section 10.2
**Dependencies**: P7.6.1

#### P7.9.2: Implement payout calculation
**Description**: Calculate shares based on quadratic votes
**Dependencies**: P7.9.1
**Formula**: share = (session_credits / total_credits) × treasury_amount

#### P7.9.3: Create payout preview page
**Description**: Show hosts their expected payout
**Dependencies**: P7.9.2

---

## P7.10: Distribution and Claims

**Description**: Trigger distribution and allow hosts to claim.

**Files Affected**:
- `src/app/e/[slug]/admin/distribute/page.tsx` (NEW)
- `src/app/e/[slug]/claim/page.tsx` (NEW)

### Sub-tasks

#### P7.10.1: Create distribution trigger UI
**Description**: Admin page to initiate distribution
**Dependencies**: P7.9.2, P7.7.1
**Flow**: Preview amounts → confirm → sign transaction → submit

#### P7.10.2: Create claim page for hosts
**Description**: Hosts claim their share
**Dependencies**: P7.10.1
**Flow**: Connect wallet → view amount → claim → receive funds

---

## Phase 7 Completion Criteria

- [ ] Ticket tiers configurable
- [ ] Stripe payments working
- [ ] QR codes generated and scannable
- [ ] Check-in system functional
- [ ] Revenue dashboard showing stats
- [ ] Treasury configuration working
- [ ] Smart contract deployed (testnet)
- [ ] Wallet connection functional
- [ ] Payout calculation accurate
- [ ] Distribution and claims working

---

# PHASE 8: Scale & Polish (Weeks 16-20)

## Objective
Production-ready platform for thousands of events with enterprise features.

---

## P8.1: Rate Limiting and Abuse Prevention

**Description**: Protect against bad actors and resource abuse.

**Files Affected**:
- `src/middleware.ts` (MODIFY)
- `src/lib/rate-limit.ts` (NEW)

### Sub-tasks

#### P8.1.1: Implement rate limiting middleware
**Description**: Limit requests per user per endpoint
**Dependencies**: None
**Implementation**: Upstash Redis or Vercel Edge Config

#### P8.1.2: Add event-level rate limits
**Description**: Prevent one event from consuming disproportionate resources
**Dependencies**: P8.1.1

#### P8.1.3: Implement vote manipulation detection
**Description**: Detect suspicious voting patterns
**Dependencies**: P8.1.1
**Signals**: Burst of votes, similar patterns, new accounts

---

## P8.2: Content Moderation Tools

**Description**: Handle spam and abuse at scale.

**Files Affected**:
- `src/app/platform/moderation/page.tsx` (NEW)
- `supabase/migrations/[timestamp]_reports.sql` (NEW)

### Sub-tasks

#### P8.2.1: Create reports table
**Description**: User-submitted reports of content
**Dependencies**: None
**Schema**: reporter_id, reported_type, reported_id, reason, status

#### P8.2.2: Implement report submission
**Description**: Flag sessions, events, or users
**Dependencies**: P8.2.1

#### P8.2.3: Create moderation queue
**Description**: Platform admin UI to review reports
**Dependencies**: P8.2.2

#### P8.2.4: Implement basic spam detection
**Description**: Keyword filtering, duplicate detection
**Dependencies**: None

---

## P8.3: Platform Admin Dashboard

**Description**: Schelling Point platform operator controls.

**Files Affected**:
- `src/app/platform/page.tsx` (NEW)
- `src/app/platform/events/page.tsx` (NEW)
- `src/app/platform/users/page.tsx` (NEW)

### Sub-tasks

#### P8.3.1: Create platform dashboard
**Description**: Overview stats across all events
**Dependencies**: P1 complete
**Metrics**: Total events, total users, total sessions

#### P8.3.2: Create platform event management
**Description**: List/search/manage all events
**Dependencies**: P8.3.1
**Actions**: Feature, unfeature, suspend, delete

#### P8.3.3: Create platform user management
**Description**: List/search/manage all users
**Dependencies**: P8.3.1
**Actions**: View activity, suspend, ban

---

## P8.4: Webhook System

**Description**: Allow integrations with external tools.

**Files Affected**:
- `supabase/migrations/[timestamp]_webhooks.sql` (NEW)
- `src/app/e/[slug]/admin/webhooks/page.tsx` (NEW)
- `src/lib/webhooks/dispatcher.ts` (NEW)

### Sub-tasks

#### P8.4.1: Create webhooks table
**Description**: Store webhook configurations per event
**Dependencies**: None
**Schema**: event_id, url, events[], secret, is_active

#### P8.4.2: Create webhook admin UI
**Description**: Configure outgoing webhooks
**Dependencies**: P8.4.1
**Features**: Add endpoint, select events, test, view logs

#### P8.4.3: Implement webhook dispatcher
**Description**: Send webhook payloads on events
**Dependencies**: P8.4.1
**Events**: new_proposal, vote_cast, session_scheduled, etc.

#### P8.4.4: Implement webhook signing
**Description**: Sign payloads for verification
**Dependencies**: P8.4.3

---

## P8.5: Embed Widgets

**Description**: Embeddable components for external websites.

**Files Affected**:
- `src/app/embed/[slug]/schedule/page.tsx` (NEW)
- `src/app/embed/[slug]/sessions/page.tsx` (NEW)

### Sub-tasks

#### P8.5.1: Create schedule embed widget
**Description**: Embeddable schedule view
**Dependencies**: P1.8.4
**Output**: Iframe-friendly page with minimal chrome

#### P8.5.2: Create session list embed widget
**Description**: Embeddable session browser
**Dependencies**: P1.8.3

#### P8.5.3: Create embed code generator
**Description**: UI to get embed code
**Dependencies**: P8.5.1, P8.5.2
**Output**: `<iframe>` snippet with customization options

---

## P8.6: Accessibility Audit

**Description**: WCAG 2.1 AA compliance.

**Files Affected**: Multiple component files

### Sub-tasks

#### P8.6.1: Keyboard navigation audit
**Description**: Ensure all interactive elements keyboard accessible
**Focus**: Schedule builder, modals, dropdowns

#### P8.6.2: Screen reader audit
**Description**: Add ARIA labels, ensure semantic HTML
**Focus**: Form labels, status announcements, navigation

#### P8.6.3: Color contrast validation
**Description**: Ensure theme colors meet contrast ratios
**Focus**: Theme validation in ThemeProvider

#### P8.6.4: Reduced motion support
**Description**: Respect prefers-reduced-motion
**Focus**: Framer-motion animations

---

## P8.7: Performance Optimization

**Description**: Optimize for large events and many concurrent users.

**Files Affected**: Multiple

### Sub-tasks

#### P8.7.1: Implement query caching
**Description**: Cache frequent queries (event data, schedule)
**Dependencies**: None
**Implementation**: Redis or Vercel KV

#### P8.7.2: Add pagination to all lists
**Description**: Paginate sessions, members, notifications
**Dependencies**: None

#### P8.7.3: Implement lazy loading
**Description**: Lazy load non-critical components
**Dependencies**: None
**Focus**: Analytics charts, heavy modals

#### P8.7.4: Optimize database queries
**Description**: Add indexes, optimize N+1 queries
**Dependencies**: None

---

## P8.8: Data Export and Deletion (GDPR)

**Description**: User data rights compliance.

**Files Affected**:
- `src/app/settings/privacy/page.tsx` (NEW)
- `src/lib/gdpr/export.ts` (NEW)
- `src/lib/gdpr/delete.ts` (NEW)

### Sub-tasks

#### P8.8.1: Implement data export
**Description**: Download all personal data as JSON/ZIP
**Dependencies**: None
**Includes**: Profile, sessions, votes, favorites, notifications

#### P8.8.2: Implement account deletion
**Description**: Delete account and anonymize data
**Dependencies**: None
**Process**: Cascade delete personal data, anonymize votes

#### P8.8.3: Create privacy settings page
**Description**: UI for export and deletion
**Dependencies**: P8.8.1, P8.8.2

---

## P8.9: Recurring Events Support

**Description**: Clone and manage event series.

**Files Affected**:
- `supabase/migrations/[timestamp]_event_series.sql` (NEW)
- `src/app/e/[slug]/admin/clone/page.tsx` (NEW)

### Sub-tasks

#### P8.9.1: Create event_series table
**Description**: Link related events
**Dependencies**: P1.1.2
**Schema**: series_id, series_name, parent links

#### P8.9.2: Implement event cloning
**Description**: Copy all settings from previous event
**Dependencies**: P8.9.1
**Copies**: Venues, tracks, time slot templates, team

#### P8.9.3: Create series management UI
**Description**: View and manage event series
**Dependencies**: P8.9.1

---

## P8.10: Internationalization Foundation

**Description**: Prepare for multi-language support.

**Files Affected**:
- `src/lib/i18n/*.ts` (NEW)
- Multiple component files (string extraction)

### Sub-tasks

#### P8.10.1: Set up i18n framework
**Description**: Configure next-intl or react-i18next
**Dependencies**: None

#### P8.10.2: Extract English strings
**Description**: Move hardcoded strings to translation files
**Dependencies**: P8.10.1

#### P8.10.3: Add event-level language setting
**Description**: Events can set primary language
**Dependencies**: P8.10.1
**Migration**: `ALTER TABLE events ADD COLUMN language TEXT DEFAULT 'en'`

---

## P8.11: Platform Billing/Pricing

**Description**: Monetization for the Schelling Point platform.

**Files Affected**:
- `src/app/platform/billing/page.tsx` (NEW)
- `src/lib/billing/*.ts` (NEW)

### Sub-tasks

#### P8.11.1: Define pricing tiers
**Description**: Free, Pro, Enterprise tiers
**Dependencies**: None
**Limits**: Attendees, features, support level

#### P8.11.2: Implement usage tracking
**Description**: Track usage against tier limits
**Dependencies**: P8.11.1

#### P8.11.3: Create billing UI
**Description**: Subscription management, invoices
**Dependencies**: P8.11.1

---

## P8.12: Documentation

**Description**: Help event organizers succeed.

**Files Affected**:
- `docs/organizers/*.md` (NEW)
- `src/app/docs/page.tsx` (NEW)

### Sub-tasks

#### P8.12.1: Write getting started guide
**Description**: Step-by-step for first event
**Dependencies**: P2 complete

#### P8.12.2: Write feature documentation
**Description**: Document all features
**Dependencies**: All phases

#### P8.12.3: Create help center
**Description**: Searchable documentation site
**Dependencies**: P8.12.1, P8.12.2

---

## Phase 8 Completion Criteria

- [ ] Rate limiting protecting all endpoints
- [ ] Content moderation queue functional
- [ ] Platform admin dashboard complete
- [ ] Webhook system working
- [ ] Embed widgets available
- [ ] Accessibility audit passed
- [ ] Performance optimized for scale
- [ ] GDPR data export/deletion working
- [ ] Recurring events supported
- [ ] i18n foundation in place
- [ ] Platform billing functional
- [ ] Documentation complete

---

# CROSS-REFERENCE MATRIX

## Tasks by Affected File

This matrix shows which tasks modify each key file, enabling coordination when multiple tasks touch the same code.

### Database Migrations

| Migration File | Tasks |
|---------------|-------|
| `create_events_table.sql` | P1.1.2 |
| `add_event_id_columns.sql` | P1.2.1-P1.2.8 |
| `backfill_event_ids.sql` | P1.3.1-P1.3.3 |
| `create_event_members.sql` | P1.4.1-P1.4.5 |
| `update_rls_policies.sql` | P1.10.1-P1.10.7 |
| `event_lifecycle.sql` | P2.12.2 |
| `notifications.sql` | P4.1.1-P4.1.2 |
| `notification_triggers.sql` | P4.2.1-P4.2.3 |
| `schedule_published.sql` | P5.8.1 |
| `session_rsvps.sql` | P6.5.1 |
| `session_feedback.sql` | P6.6.1 |
| `session_resources.sql` | P6.7.1 |
| `ticketing.sql` | P7.1.1-P7.1.2 |
| `treasury.sql` | P7.6.1 |
| `host_payouts.sql` | P7.9.1 |
| `wallet_address.sql` | P7.8.1 |
| `reports.sql` | P8.2.1 |
| `webhooks.sql` | P8.4.1 |
| `event_series.sql` | P8.9.1 |

### Core Application Files

| File | Tasks |
|------|-------|
| `src/hooks/useAuth.tsx` | P1.11.1, P1.11.2 |
| `src/hooks/useEvent.tsx` | P1.7.1, P1.7.3 |
| `src/hooks/useEventRole.tsx` | P1.7.2, P1.7.4 |
| `src/components/DashboardLayout.tsx` | P3.7.2, P4.4.3 |
| `src/components/Footer.tsx` | P3.7.1 |
| `src/app/page.tsx` | P2.11.1-P2.11.3 |
| `src/app/e/[slug]/layout.tsx` | P1.8.1, P3.2.3, P3.6.1 |
| `src/app/e/[slug]/admin/page.tsx` | P1.8.8, P5.1.1-P5.1.3 |
| `src/app/e/[slug]/admin/schedule/page.tsx` | P1.8.8, P5.3.1-P5.3.3, P5.8.2-P5.8.4, P5.10.1-P5.10.4 |
| `src/middleware.ts` | P1.9.2, P8.1.1-P8.1.2 |

### Reusable Components

| Component | Created In | Used By |
|-----------|-----------|---------|
| `ColorPicker.tsx` | P2.6.2 | P3.3.1, P5.9.2 |
| `VenueEditor.tsx` | P2.4.2 | P2.4.1, P5.6 |
| `BulkSlotCreator.tsx` | P2.5.2 | P2.5.1, P5.7 |
| `ThemePreview.tsx` | P2.8.2 | P2.8.1, P3.3.1 |
| `ImageUpload.tsx` | P3.5.3 | P2.8.1, P3.3.1 |
| `TimezonePicker.tsx` | P2.3.2 | P2.3.1 |
| `NotificationBell.tsx` | P4.4.1 | P4.4.3 |
| `AddToCalendar.tsx` | P6.3.5 | P6.3.2, P6.3.3 |
| `SessionRating.tsx` | P6.6.3 | P6.6.2, P6.6.4 |
| `QRScanner.tsx` | P7.4.1 | P7.4.2 |

---

## Tasks by Feature Domain

### Authentication & Authorization
- P1.4.* (event_members)
- P1.7.2 (useEventRole)
- P1.7.4 (permissions)
- P1.10.* (RLS policies)
- P1.11.* (useAuth updates)

### Event Management
- P1.1.* (events table)
- P2.1.* - P2.9.* (creation wizard)
- P2.10.* (templates)
- P2.12.* (lifecycle)
- P3.* (branding)

### Session Management
- P1.2.1 (event_id on sessions)
- P5.1.* (batch operations)
- P5.2.* (search/filter)
- P5.7.* (admin creation)
- P6.7.* (resources)

### Scheduling
- P1.5.* (remove hardcoded dates)
- P5.3.* (conflict detection)
- P5.4.* (capacity warnings)
- P5.5.* (auto-scheduling)
- P5.8.* (draft/publish)
- P5.10.* (undo/redo)

### Voting
- P1.2.2 (event_id on votes)
- P6.1.* (per-event credits)

### Notifications
- P4.1.* (database schema)
- P4.2.* (triggers)
- P4.3.* (email templates)
- P4.4.* (in-app center)
- P4.5.* (preferences)
- P4.6.* (dispatch)
- P4.7.* (admin broadcast)

### Attendee Experience
- P6.2.* (discovery)
- P6.3.* (calendar)
- P6.4.* (PWA)
- P6.5.* (RSVP)
- P6.6.* (feedback)

### Ticketing & Payments
- P7.1.* (ticket tiers)
- P7.2.* (Stripe)
- P7.3.* (QR codes)
- P7.4.* (check-in)
- P7.5.* (revenue dashboard)

### Revenue Distribution
- P7.6.* (treasury)
- P7.7.* (smart contract)
- P7.8.* (wallet connection)
- P7.9.* (payout calculation)
- P7.10.* (claims)

### Platform Operations
- P8.1.* (rate limiting)
- P8.2.* (moderation)
- P8.3.* (platform admin)
- P8.4.* (webhooks)
- P8.11.* (billing)

---

# ARCHITECTURAL DECISIONS SUMMARY

| ID | Decision | Rationale | Trade-offs | Affected Tasks |
|----|----------|-----------|------------|----------------|
| AD-1 | Shared database with event-scoped rows | Simpler migrations, cross-event features easy, RLS provides isolation | Must ensure all queries include event_id | P1.2.*, P1.10.* |
| AD-2 | Explicit event_id even where redundant | RLS efficiency, simpler queries, better indexing | Some data denormalization | P1.2.2, P1.2.6-P1.2.8 |
| AD-3 | Role-based event membership | Fine-grained access control per event | More complex permission checks | P1.4.*, P1.7.2, P1.7.4 |
| AD-4 | UTC storage, event timezone display | Correct DST handling, consistent storage | More complex display logic | P1.6.*, P2.3.2 |
| AD-5 | Slug-based path routing | Works on Vercel, simpler SSL, shared auth | Longer URLs than subdomains | P1.8.*, P1.9.* |
| AD-6 | Wizard state in useReducer + localStorage | Progress preserved, single API call on completion | Complex state management | P2.1.* |
| AD-7 | Event phases control feature availability | Clear lifecycle, automatic transitions | Must enforce at DB and UI level | P2.12.* |
| AD-8 | CSS custom property injection | No component changes needed | Theme validation complexity | P3.2.* |
| AD-9 | Greedy auto-scheduler with scoring | Simple, predictable, admin can preview | May not find global optimum | P5.5.* |

---

# MASTER DEPENDENCY GRAPH

```
PHASE 1 (Foundation)
├── P1.1 Events Table
│   ├── P1.1.1 Schema design
│   ├── P1.1.2 Migration ←── P1.1.1
│   └── P1.1.3 Default event ←── P1.1.2
│
├── P1.2 Add event_id ←── P1.1.2
│   └── P1.2.1-P1.2.8 (parallel)
│
├── P1.3 Backfill ←── P1.1.3, P1.2.*
│   ├── P1.3.1 Backfill migration
│   ├── P1.3.2 NOT NULL ←── P1.3.1
│   └── P1.3.3 CASCADE ←── P1.3.2
│
├── P1.4 event_members ←── P1.1.2
│   ├── P1.4.1 Create table
│   ├── P1.4.2 Indexes ←── P1.4.1
│   ├── P1.4.3 Migrate admins ←── P1.4.1, P1.1.3
│   ├── P1.4.4 Migrate attendees ←── P1.4.3
│   └── P1.4.5 Mark owner ←── P1.4.3
│
├── P1.5 Remove EVENT_DAYS ←── P1.7.1
│   └── P1.5.1-P1.5.4
│
├── P1.6 Remove hardcoded timezone
│   └── P1.6.1-P1.6.2 ←── P1.7.1
│
├── P1.7 Event Context ←── P1.1.2, P1.4.1
│   ├── P1.7.1 useEvent
│   ├── P1.7.2 useEventRole ←── P1.4.1
│   ├── P1.7.3 EventProvider ←── P1.7.1
│   └── P1.7.4 Permissions ←── P1.7.2
│
├── P1.8 Event Routes ←── P1.7.3
│   ├── P1.8.1 Layout
│   └── P1.8.2-P1.8.8 Pages ←── P1.8.1
│
├── P1.9 Redirects ←── P1.8.*
│
├── P1.10 RLS Policies ←── P1.2.*, P1.4.1
│
└── P1.11 Update useAuth ←── P1.4.1, P1.7.2

PHASE 2 (Self-Serve) ←── PHASE 1
├── P2.1 Wizard Infrastructure
├── P2.2-P2.8 Wizard Steps ←── P2.1
├── P2.9 Review & Launch ←── P2.2-P2.8
├── P2.10 Templates ←── P2.1
├── P2.11 Platform Landing ←── P1
└── P2.12 Lifecycle ←── P1.1.1, P1.7.1

PHASE 3 (Branding) ←── PHASE 2
├── P3.1 Theme Schema
├── P3.2 ThemeProvider ←── P3.1, P1.8.1
├── P3.3 Theme UI ←── P3.1
├── P3.4 Templates ←── P3.1
├── P3.5 Asset Storage
├── P3.6 Dynamic Metadata ←── P1.8.1, P3.5
└── P3.7 Remove EthBoulder ←── P1.7.1

PHASE 4 (Notifications) ←── PHASE 1
├── P4.1 Database Schema
├── P4.2 Triggers ←── P4.1
├── P4.3 Email Templates ←── P3.2 (optional)
├── P4.4 In-App Center ←── P4.1
├── P4.5 Preferences UI ←── P4.1
├── P4.6 Dispatch System ←── P4.1, P4.3
└── P4.7 Admin Broadcast ←── P4.6

PHASE 5 (Admin) ←── PHASE 1
├── P5.1 Batch Operations ←── P1.8.8
├── P5.2 Search/Filter ←── P5.1
├── P5.3 Conflict Detection ←── P1.8.8
├── P5.4 Capacity Warnings ←── P5.3
├── P5.5 Auto-Scheduling ←── P5.3
├── P5.6 Analytics ←── P1.8.8
├── P5.7 Admin Creation ←── P1.8.8
├── P5.8 Draft/Publish ←── P1.1.1
├── P5.9 Track Management ←── P1.8.8
└── P5.10 Undo/Redo ←── P5.3

PHASE 6 (Attendee) ←── PHASE 1
├── P6.1 Per-Event Credits ←── P1.4.1
├── P6.2 Session Discovery ←── P1.8.3
├── P6.3 Calendar ←── (independent)
├── P6.4 PWA ←── (independent)
├── P6.5 RSVP ←── P1.2.1
├── P6.6 Feedback ←── P1.2.1
└── P6.7 Resources ←── P1.2.1

PHASE 7 (Ticketing) ←── PHASE 1
├── P7.1 Ticket Tiers ←── P1.1.2
├── P7.2 Stripe ←── P7.1
├── P7.3 QR Codes ←── P7.1
├── P7.4 Check-In ←── P7.3
├── P7.5 Revenue Dashboard ←── P7.1
├── P7.6 Treasury ←── P7.1
├── P7.7 Smart Contract ←── (independent)
├── P7.8 Wallet Connection ←── P1
├── P7.9 Payout Calculation ←── P7.6
└── P7.10 Distribution ←── P7.9, P7.7

PHASE 8 (Scale) ←── ALL PHASES
├── P8.1 Rate Limiting
├── P8.2 Moderation
├── P8.3 Platform Admin ←── P1
├── P8.4 Webhooks
├── P8.5 Embed Widgets ←── P1.8
├── P8.6 Accessibility
├── P8.7 Performance
├── P8.8 GDPR
├── P8.9 Recurring Events ←── P1.1
├── P8.10 i18n
├── P8.11 Billing
└── P8.12 Documentation ←── ALL
```

---

# CRITICAL PATH ANALYSIS

The **critical path** represents the longest chain of dependent tasks. Delays here delay the entire project.

## Phase 1 Critical Path
```
P1.1.1 → P1.1.2 → P1.1.3 → P1.3.1 → P1.3.2 → P1.3.3
                      ↓
                   P1.4.3 → P1.4.4 → P1.4.5
                      ↓
                   P1.7.2 → P1.7.4 → P1.11.1 → P1.11.2
```

**Bottleneck**: Event table creation and backfill must complete before role-based auth can be implemented.

## Phase 2 Critical Path
```
P2.1.1 → P2.2.1 → P2.3.1 → P2.4.1 → P2.5.1 → ... → P2.9.1 → P2.9.3
```

**Bottleneck**: Wizard steps are sequential; each depends on wizard state infrastructure.

## Overall Critical Path
```
P1.1-P1.4 → P1.7-P1.8 → P2.1-P2.9 → P3.2 → P4.1-P4.6 → P7.1-P7.10
```

---

# PARALLEL WORK STREAMS

These task groups can be developed concurrently by different team members:

## Stream 1: Database & Backend
- P1.1-P1.4 (schema)
- P1.10 (RLS)
- P4.1-P4.2 (notification triggers)
- P7.1, P7.6, P7.9 (ticketing schema)

## Stream 2: Frontend - Event Pages
- P1.8 (event routes)
- P2.2-P2.8 (wizard steps)
- P3.2-P3.4 (theming)
- P6.2-P6.4 (attendee features)

## Stream 3: Frontend - Admin
- P5.1-P5.5 (schedule builder)
- P5.6-P5.9 (admin features)
- P4.4, P4.7 (notification UI)

## Stream 4: Infrastructure
- P4.6 (notification dispatch)
- P6.3-P6.4 (calendar, PWA)
- P7.2 (Stripe)
- P8.1-P8.4 (platform ops)

## Stream 5: Smart Contracts (Independent)
- P7.7 (entire task can proceed in parallel)

---

# IMPLEMENTATION SEQUENCE RECOMMENDATIONS

## Recommended Order (Within Phases)

### Phase 1
1. **P1.1** - Events table (foundation for everything)
2. **P1.2 + P1.4** (parallel) - Add columns + members table
3. **P1.3** - Backfill
4. **P1.7** - Context hooks
5. **P1.8** - Routes
6. **P1.5 + P1.6** (parallel) - Remove hardcoding
7. **P1.10 + P1.11** (parallel) - RLS + auth
8. **P1.9** - Redirects (final step)

### Phase 2
1. **P2.1** - Wizard infrastructure
2. **P2.2 + P2.3** (parallel) - Basics + Dates steps
3. **P2.4 + P2.6** (parallel) - Venues + Tracks steps
4. **P2.5** - Schedule step (depends on 2.3, 2.4)
5. **P2.7 + P2.8** (parallel) - Voting + Branding steps
6. **P2.9** - Review step
7. **P2.10 + P2.11** (parallel) - Templates + Landing
8. **P2.12** - Lifecycle

### Phases 3-8
Follow the sub-task dependencies within each phase. Many Phase 3-8 tasks can run in parallel once Phase 1 is complete.

---

# RISK FACTORS

| Risk | Impact | Mitigation |
|------|--------|------------|
| RLS policy complexity | Could cause data leaks or access issues | Extensive testing with multiple user roles |
| Migration on production data | Could corrupt existing EthBoulder data | Test migrations on copy of production DB |
| Smart contract security | Financial loss if bugs exist | Professional audit before mainnet |
| Performance at scale | Slow page loads for large events | Load testing, caching strategy |
| Stripe integration complexity | Payment failures | Use Stripe test mode extensively |
| State machine edge cases | Events stuck in wrong phase | Comprehensive phase transition testing |

---

# APPENDIX: TASK COUNT SUMMARY

| Phase | Tasks | Sub-tasks | Estimated Complexity |
|-------|-------|-----------|---------------------|
| 1: Foundation | 11 | 52 | High |
| 2: Self-Serve | 12 | 37 | High |
| 3: Branding | 7 | 21 | Medium |
| 4: Notifications | 7 | 24 | Medium |
| 5: Admin | 10 | 33 | High |
| 6: Attendee | 7 | 23 | Medium |
| 7: Ticketing | 10 | 28 | Very High |
| 8: Scale | 12 | 35 | High |
| **TOTAL** | **76** | **253** | - |

---

*This implementation plan is a living document. Update task statuses and dependencies as implementation proceeds.*
