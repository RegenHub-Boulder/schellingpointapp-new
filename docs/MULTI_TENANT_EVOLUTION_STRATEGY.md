# Schelling Point: Multi-Tenant Unconference Platform Evolution Strategy

## Executive Summary

This document outlines the comprehensive strategy to evolve Schelling Point from a single-event EthBoulder unconference tool into a self-serve, multi-tenant unconference platform capable of powering thousands of events worldwide. The strategy builds on the existing working codebase — its quadratic voting engine, session proposal workflow, schedule builder, and co-host system — while introducing the architectural changes needed for true multi-tenancy, self-serve event creation, customizable branding, improved admin tooling, and an eventual ticketing/revenue distribution layer.

---

## Table of Contents

1. [Current State Assessment](#1-current-state-assessment)
2. [Multi-Tenancy Architecture](#2-multi-tenancy-architecture)
3. [Event Creation Wizard](#3-event-creation-wizard)
4. [Branding & Theming System](#4-branding--theming-system)
5. [Roles & Permissions Evolution](#5-roles--permissions-evolution)
6. [Notification & Communication System](#6-notification--communication-system)
7. [Admin Dashboard Improvements](#7-admin-dashboard-improvements)
8. [Event Tracks System](#8-event-tracks-system)
9. [Scheduling Engine Improvements](#9-scheduling-engine-improvements)
10. [Ticketing & Revenue Distribution](#10-ticketing--revenue-distribution)
11. [Platform-Level Features](#11-platform-level-features)
12. [Things You Haven't Considered](#12-things-you-havent-considered)
13. [Database Schema Evolution](#13-database-schema-evolution)
14. [API Architecture Evolution](#14-api-architecture-evolution)
15. [Migration Strategy](#15-migration-strategy)
16. [Phased Implementation Roadmap](#16-phased-implementation-roadmap)

---

## 1. Current State Assessment

### What's Working Well
- **Quadratic voting engine** — Clean math utilities (`votesToCredits`, `creditsToVotes`, `maxVotesWithCredits`) in `src/lib/utils.ts` with automatic vote count triggers in PostgreSQL
- **Session proposal workflow** — Full lifecycle: propose → admin review → approve → schedule, with format/duration/tags/track selection
- **Schedule builder** — Drag-and-drop grid with venue columns × time-slot rows in `src/app/admin/schedule/page.tsx`
- **Co-host system** — Invite links with token-based acceptance flow and `session_cohosts` junction table
- **Self-hosted sessions** — Proposers can host at their own locations with custom times
- **Magic link auth** — Passwordless flow via Supabase OTP with localStorage token management and auto-refresh
- **RLS policies** — Row-level security properly separating admin/user/public access
- **API layer** — RESTful v1 endpoints with API key auth, include parameters, and standardized responses

### What Needs to Change for Multi-Tenancy
| Area | Current State | Problem |
|------|--------------|---------|
| **Data model** | All tables are global — no event scoping | Every session, vote, venue, track belongs to a single implied event |
| **Routing** | Single-event routes (`/sessions`, `/schedule`) | No way to distinguish between events |
| **Auth** | Global `is_admin` boolean on profiles | No event-level roles — you're either a site admin or a regular user |
| **Branding** | EthBoulder hardcoded throughout (`page.tsx`, `Footer.tsx`, `DashboardLayout.tsx`) | Cannot customize per-event |
| **Configuration** | Event days hardcoded as constants (`EVENT_DAYS` in 3+ files) | No dynamic event dates |
| **Vote credits** | Global `vote_credits = 100` on profiles | Credits need to be per-event |
| **Admin setup** | Single admin setup page manages global venues/slots | No event-scoped setup wizard |
| **Notifications** | Only "session scheduled" email template | No lifecycle notifications |
| **Time zones** | Hardcoded `-07:00` (Mountain Time) offsets | Events could be anywhere |

---

## 2. Multi-Tenancy Architecture

### 2.1 Tenancy Model: Shared Database, Event-Scoped Data

We'll use a **single database with event-scoped rows** rather than separate schemas or databases per tenant. This is the right choice because:
- The data model is identical across events
- Supabase RLS can enforce event isolation
- It keeps infrastructure simple and costs low
- Cross-event features (user profiles, platform analytics) remain easy

### 2.2 Core Tenant Entity: `events`

```sql
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  slug TEXT UNIQUE NOT NULL,           -- URL-friendly identifier (e.g., "ethboulder-2026")
  name TEXT NOT NULL,                  -- "EthBoulder 2026"
  tagline TEXT,                        -- "Fork The Frontier"
  description TEXT,

  -- Dates & Location
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Denver',  -- IANA timezone
  location_name TEXT,                  -- "Boulder, CO"
  location_address TEXT,
  location_geo POINT,                  -- For map features

  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft',        -- Being configured
    'published',    -- Visible, accepting proposals
    'voting',       -- Proposals closed, voting open
    'scheduling',   -- Voting closed, admin scheduling
    'live',         -- Event is happening now
    'completed',    -- Event finished
    'archived'      -- No longer actively displayed
  )),

  -- Voting Configuration
  vote_credits_per_user INTEGER DEFAULT 100,
  voting_opens_at TIMESTAMPTZ,
  voting_closes_at TIMESTAMPTZ,
  proposals_open_at TIMESTAMPTZ,
  proposals_close_at TIMESTAMPTZ,

  -- Proposal Configuration
  allowed_formats TEXT[] DEFAULT ARRAY['talk', 'workshop', 'discussion', 'panel', 'demo'],
  allowed_durations INTEGER[] DEFAULT ARRAY[15, 30, 60, 90],
  max_proposals_per_user INTEGER DEFAULT 5,
  require_proposal_approval BOOLEAN DEFAULT TRUE,

  -- Capacity
  max_attendees INTEGER,

  -- Branding (see Section 4)
  theme JSONB DEFAULT '{}',
  logo_url TEXT,
  banner_url TEXT,
  favicon_url TEXT,

  -- Owner
  created_by UUID REFERENCES profiles(id),

  -- Metadata
  is_featured BOOLEAN DEFAULT FALSE,   -- Platform-level featuring
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public', 'unlisted', 'private')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Event Scoping Every Existing Table

Every existing table gets an `event_id` column:

```sql
-- Sessions
ALTER TABLE sessions ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);

-- Votes (scoped through sessions, but explicit for RLS efficiency)
ALTER TABLE votes ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);

-- Venues
ALTER TABLE venues ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);

-- Time Slots
ALTER TABLE time_slots ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);

-- Tracks
ALTER TABLE tracks ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);

-- Favorites (scoped through sessions, but explicit for query efficiency)
ALTER TABLE favorites ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);
```

### 2.4 Event Memberships (replaces global `is_admin`)

```sql
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN (
    'owner',      -- Full control, can delete event, manage billing
    'admin',      -- Can manage sessions, schedule, venues, tracks
    'moderator',  -- Can approve/reject proposals, manage communications
    'track_lead', -- Can manage sessions within their assigned track(s)
    'volunteer',  -- Can check in attendees, manage on-site logistics
    'attendee'    -- Can propose, vote, favorite
  )),
  vote_credits INTEGER,               -- Per-event credits (overrides event default if set)
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);
```

### 2.5 Per-Event Vote Credits

Instead of storing `vote_credits` on the global `profiles` table, credits are now per-event via `event_members.vote_credits` (defaulting to `events.vote_credits_per_user`). The `votes` table gets `event_id` so credit calculations are event-scoped.

### 2.6 URL Routing Strategy

**Approach: Slug-based path routing** — `app.schellingpoint.xyz/e/{event-slug}/...`

This is preferable to subdomain routing because:
- Works on Vercel without wildcard DNS setup
- Simpler SSL certificate management
- All events share the same auth session
- Easier to implement in Next.js App Router

```
/                                  → Platform landing (discover events)
/create                            → Event creation wizard
/e/{slug}                          → Event landing page (replaces current page.tsx)
/e/{slug}/sessions                 → Browse event sessions
/e/{slug}/sessions/{id}            → Session detail
/e/{slug}/schedule                 → Event schedule
/e/{slug}/propose                  → Propose a session
/e/{slug}/my-votes                 → User's votes for this event
/e/{slug}/my-schedule              → User's favorites for this event
/e/{slug}/participants             → Event participants
/e/{slug}/dashboard                → Attendee dashboard
/e/{slug}/admin                    → Event admin dashboard
/e/{slug}/admin/schedule           → Schedule builder
/e/{slug}/admin/setup              → Event setup
/e/{slug}/admin/tracks             → Track management
/e/{slug}/admin/communications     → Notification management
/e/{slug}/admin/analytics          → Event analytics
```

### 2.7 RLS Policy Evolution

All existing RLS policies need event-scoping. Example pattern:

```sql
-- Sessions: Anyone can view approved/scheduled sessions FOR THEIR EVENT
CREATE POLICY "Anyone can view approved event sessions" ON sessions FOR SELECT
  USING (status IN ('approved', 'scheduled'));

-- Event members can propose sessions
CREATE POLICY "Event members can create sessions" ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = sessions.event_id
      AND user_id = auth.uid()
    )
  );

-- Event admins can manage sessions
CREATE POLICY "Event admins can manage sessions" ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = sessions.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

---

## 3. Event Creation Wizard

### 3.1 Wizard Flow

A multi-step wizard at `/create` guides event organizers through setup:

**Step 1: Basics**
- Event name, tagline, description
- Auto-generated slug (editable)
- Event type (unconference, hackathon, conference, meetup)
- Visibility (public, unlisted, private)

**Step 2: Dates & Location**
- Start date, end date
- Timezone picker (IANA timezone, auto-detected from browser)
- Location name, address (optional: map pin)
- Virtual/hybrid/in-person toggle

**Step 3: Venues**
- Add venues with name, capacity, features, address
- Reuse the existing `VenueAvailabilityEditor` component from `admin/setup`
- Import venues from a previous event (for recurring events)

**Step 4: Schedule Structure**
- Define event days (auto-populated from start/end dates)
- Set up time slot templates per venue per day
- Bulk time slot creation (e.g., "45-min sessions with 15-min breaks from 9am-5pm")
- Break/lunch/checkin slot presets

**Step 5: Tracks & Categories**
- Define event tracks (name, color, description, track lead)
- Set whether sessions must belong to a track

**Step 6: Voting Configuration**
- Credits per attendee (default 100)
- Voting mechanism: quadratic (default), linear, approval
- Voting window (opens at, closes at)
- Proposal window (opens at, closes at)
- Max proposals per user
- Whether proposals require admin approval
- Allowed session formats and durations

**Step 7: Branding**
- Logo upload
- Color theme picker (primary, secondary, accent)
- Template selection (prebuilt themes)
- Banner image
- Social links (Twitter/X, Telegram, Discord, website)

**Step 8: Review & Launch**
- Summary of all configuration
- Preview of event landing page
- "Save as Draft" or "Publish"

### 3.2 Event Templates

Allow event organizers to start from templates:
- **Unconference Classic** — QV voting, open proposals, community-driven scheduling
- **Curated Conference** — Invited speakers + community proposals, admin-scheduled
- **Hackathon** — Track-based, demo slots, judging-focused
- **Community Meetup** — Lightweight single-venue, fewer configuration steps
- **Clone from Previous Event** — Copy all settings from an event you previously ran

### 3.3 Technical Implementation

The wizard state is stored in React state with `useReducer` and persisted to `localStorage` on each step change so progress isn't lost on navigation. On completion, a single API call creates the event and all associated records (venues, tracks, time slots) in a database transaction.

```
src/app/create/
  page.tsx               → Wizard container with step navigation
  steps/
    BasicsStep.tsx
    DatesStep.tsx
    VenuesStep.tsx
    ScheduleStep.tsx
    TracksStep.tsx
    VotingStep.tsx
    BrandingStep.tsx
    ReviewStep.tsx
```

---

## 4. Branding & Theming System

### 4.1 "Powered by Schelling Point" Model

The platform follows a **white-label-lite** approach:
- The event's name and branding are foregrounded everywhere
- "Powered by Schelling Point" appears in the footer and loading screens
- The platform provides the infrastructure; the event owns the identity

### 4.2 Theme Configuration Schema

Stored in `events.theme` as JSONB:

```jsonc
{
  // Color palette
  "colors": {
    "primary": "#B2FF00",        // Main accent color
    "primary_foreground": "#000000",
    "secondary": "#1a1a2e",
    "accent": "#00D4AA",
    "background": "#0a0a0f",
    "foreground": "#ffffff",
    "muted": "#1a1a2e",
    "destructive": "#ef4444"
  },

  // Typography
  "fonts": {
    "display": "Inter",          // Headings
    "body": "Inter"              // Body text
  },

  // Appearance
  "mode": "dark",                // "dark" | "light" | "system"
  "borderRadius": "0.75rem",     // Card/button radius
  "style": "glassmorphism",      // "glassmorphism" | "flat" | "neumorphism" | "minimal"

  // Social links
  "social": {
    "twitter": "https://x.com/ethboulder",
    "telegram": "https://t.me/+hDrF89xECLsxNjFh",
    "discord": null,
    "website": "https://ethboulder.xyz"
  },

  // Content
  "hero_title": "EthBoulder",
  "hero_subtitle": "Unconference",
  "hero_cta": "Join the Unconference",
  "footer_text": "© 2026 EthBoulder"
}
```

### 4.3 Theme Application

A `ThemeProvider` component at the event layout level injects CSS custom properties:

```tsx
// src/app/e/[slug]/layout.tsx
export default function EventLayout({ params, children }) {
  const event = await getEvent(params.slug)

  return (
    <EventThemeProvider theme={event.theme}>
      <EventContext.Provider value={event}>
        {children}
      </EventContext.Provider>
    </EventThemeProvider>
  )
}
```

The `EventThemeProvider` maps the `theme.colors` into CSS variables that Tailwind's existing `hsl(var(--primary))` system already consumes. No component changes needed — just swap the CSS variable values at the root.

### 4.4 Pre-Built Theme Templates

Offer 6-8 ready-made themes:
- **Neon Dark** (current EthBoulder style — neon green on dark)
- **Ocean Breeze** (blues and teals, light mode)
- **Sunset** (warm oranges and purples, dark mode)
- **Forest** (greens and earth tones)
- **Monochrome** (black & white, minimal)
- **Web3 Purple** (purple/pink gradient, dark)
- **Corporate Clean** (neutral, light, professional)
- **Festival** (bright, colorful, playful)

### 4.5 Asset Storage

Use Supabase Storage (currently disabled) for event assets:
- Logo (max 2MB, square aspect)
- Banner image (max 5MB, 16:9 aspect)
- Favicon (max 500KB, square)
- Speaker/host photos (managed via profile avatars)

Storage bucket structure:
```
events/
  {event-id}/
    logo.png
    banner.jpg
    favicon.ico
```

---

## 5. Roles & Permissions Evolution

### 5.1 Current State

The existing app has a single boolean `is_admin` on the `profiles` table. This worked for a single event with a known team, but multi-tenancy requires event-scoped roles.

### 5.2 Role Hierarchy

```
Platform Super Admin  (manages the Schelling Point platform itself)
  └── Event Owner     (created the event, full control)
       └── Event Admin    (manage schedule, venues, sessions)
            └── Moderator     (approve/reject proposals, communications)
                 └── Track Lead    (manage sessions in their track)
                      └── Volunteer    (check-in, on-site logistics)
                           └── Attendee    (propose, vote, favorite)
```

### 5.3 Permission Matrix

| Capability | Owner | Admin | Moderator | Track Lead | Volunteer | Attendee |
|-----------|-------|-------|-----------|------------|-----------|----------|
| Delete event | x | | | | | |
| Edit event settings | x | x | | | | |
| Manage billing/ticketing | x | | | | | |
| Manage venues & time slots | x | x | | | | |
| Manage schedule builder | x | x | | | | |
| Approve/reject proposals | x | x | x | (own track) | | |
| Send communications | x | x | x | | | |
| Define tracks | x | x | | | | |
| Manage track sessions | x | x | | x | | |
| Check-in attendees | x | x | x | | x | |
| View analytics | x | x | x | x | | |
| Propose sessions | x | x | x | x | x | x |
| Vote | x | x | x | x | x | x |
| Favorite sessions | x | x | x | x | x | x |

### 5.4 Implementation

The `useAuth` hook evolves to include event context:

```typescript
interface EventRole {
  eventId: string
  role: 'owner' | 'admin' | 'moderator' | 'track_lead' | 'volunteer' | 'attendee'
  voteCredits: number
}

// New hook alongside useAuth
function useEventRole(eventSlug: string): {
  role: EventRole | null
  can: (permission: Permission) => boolean
  isLoading: boolean
}
```

### 5.5 Invitation Flow for Event Roles

Event owners/admins can invite team members:
- Email invitation with role assignment
- Shareable invite link with default role
- Bulk import via CSV (for large volunteer teams)
- Accept/decline flow (reuse co-host invite pattern)

---

## 6. Notification & Communication System

### 6.1 Current State

The app currently has:
- One email template: `session-scheduled.ts` (notifies host when session is scheduled)
- Fire-and-forget notification on schedule assignment
- Manual "Notify All Hosts" bulk action for unnotified scheduled sessions
- No notification preferences, no in-app notifications, no status change hooks

### 6.2 Notification Architecture

#### Event Types That Trigger Notifications

**Session Lifecycle (to session host & co-hosts):**
| Event | Current | Needed |
|-------|---------|--------|
| Session submitted (confirmation) | - | Email + In-app |
| Session approved | - | Email + In-app |
| Session rejected (with reason) | - | Email + In-app |
| Session scheduled (time/venue assigned) | Email | Email + In-app (improve template) |
| Session rescheduled (time/venue changed) | - | Email + In-app |
| Session unscheduled | - | Email + In-app |
| Session receives N votes milestone | - | In-app |
| Co-host invitation | - | Email (exists via invite flow) |
| Co-host accepted/declined | - | In-app |

**Event Lifecycle (to all attendees):**
| Event | Needed |
|-------|--------|
| Event published | Email |
| Proposals now open | Email + In-app |
| Voting now open | Email + In-app |
| Schedule published | Email + In-app |
| Event starting soon (1 day, 1 hour) | Push + In-app |
| Event completed (feedback request) | Email |

**Admin Notifications (to event admins):**
| Event | Needed |
|-------|--------|
| New session proposal submitted | Email + In-app |
| High-vote session not yet scheduled | In-app |
| Schedule conflicts detected | In-app |
| Attendee capacity threshold reached | Email + In-app |

### 6.3 Notification Infrastructure

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL,                  -- 'session_approved', 'voting_open', etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',            -- Structured payload (session_id, etc.)
  channel TEXT NOT NULL DEFAULT 'in_app',  -- 'email', 'in_app', 'push'
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  event_id UUID REFERENCES events(id),  -- NULL = global defaults
  notification_type TEXT NOT NULL,
  email_enabled BOOLEAN DEFAULT TRUE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  push_enabled BOOLEAN DEFAULT FALSE,
  UNIQUE(user_id, event_id, notification_type)
);
```

### 6.4 Email Templates

Move from single hardcoded template to a template engine:

```
src/lib/email/templates/
  session-submitted.tsx
  session-approved.tsx
  session-rejected.tsx
  session-scheduled.tsx
  session-rescheduled.tsx
  voting-open.tsx
  schedule-published.tsx
  event-reminder.tsx
  event-feedback.tsx
  admin-new-proposal.tsx
```

Each template receives the event's branding (colors, logo) and renders with the event's theme.

### 6.5 In-App Notification Center

Add a notification bell icon to the `DashboardLayout` header. Shows unread count badge, dropdown with recent notifications, and links to a full `/e/{slug}/notifications` page.

### 6.6 Notification Triggers

Use Supabase Database Functions + Edge Functions to trigger notifications on row changes:

```sql
-- Trigger when session status changes
CREATE OR REPLACE FUNCTION notify_session_status_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Insert notification record
    INSERT INTO notifications (event_id, user_id, type, title, body, data)
    SELECT
      NEW.event_id,
      NEW.host_id,
      'session_' || NEW.status,
      'Session ' || NEW.status,
      'Your session "' || NEW.title || '" has been ' || NEW.status,
      jsonb_build_object('session_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status);

    -- Also notify co-hosts
    INSERT INTO notifications (event_id, user_id, type, title, body, data)
    SELECT
      NEW.event_id,
      sc.user_id,
      'session_' || NEW.status,
      'Session ' || NEW.status,
      'A session you co-host "' || NEW.title || '" has been ' || NEW.status,
      jsonb_build_object('session_id', NEW.id, 'old_status', OLD.status, 'new_status', NEW.status)
    FROM session_cohosts sc
    WHERE sc.session_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

An Edge Function or cron job processes the notification queue and dispatches emails via Resend.

---

## 7. Admin Dashboard Improvements

### 7.1 Current Pain Points

From reviewing `src/app/admin/page.tsx` and `src/app/admin/schedule/page.tsx`:

1. **Session scheduling is two-step**: Admin must expand a scheduling panel per-session, select venue + time slot from dropdowns — no visual feedback about conflicts or capacity
2. **No conflict detection**: Two sessions can be assigned to the same venue + time slot
3. **No capacity warnings**: Sessions with 50+ votes can be assigned to 10-person venues
4. **No batch operations**: Approving 20 sessions requires 20 clicks
5. **Limited filtering/search**: No way to search sessions by name, filter by track, or sort by different criteria
6. **Schedule builder sidebar**: Unscheduled sessions list doesn't filter well, no search
7. **No undo**: Accidental scheduling changes are not reversible
8. **Session creation by admin**: Admins can't directly create sessions (for curated/invited speakers) from the admin dashboard

### 7.2 Improved Session Management

**Batch operations:**
- Select multiple sessions → batch approve, reject, assign track
- Select all pending → approve all
- Drag-select in schedule builder

**Better filtering:**
- Search bar (title, host name, tags)
- Filter by: track, format, vote count range, has time preference, has co-hosts
- Sort by: votes (desc), date submitted, title, duration

**Quick scheduling from admin list:**
- Inline "Quick Schedule" button that shows available slots matching the session's duration
- Auto-suggest: recommend venues and time slots based on vote count (high votes → larger venues), time preferences, and track grouping

**Admin session creation:**
- "Add Curated Session" button — create sessions directly as approved/scheduled
- Bulk import via CSV (for conferences migrating speaker lineups)
- Session templates (keynote, lightning talk, workshop formats with preset durations)

### 7.3 Improved Schedule Builder

**Conflict detection:**
- Visual red highlight when dropping a session into an already-occupied slot
- Warning icon if session duration doesn't match slot duration
- Capacity indicator (color-coded: green if session votes < venue capacity, yellow if close, red if over)

**Smart scheduling assistance:**
- "Auto-Schedule" button: algorithmically assign approved sessions to slots based on:
  - Vote count → venue capacity matching
  - Time preferences → respect host availability
  - Track grouping → same-track sessions spread across different time slots (avoid overlap)
  - Duration matching → session duration fits slot length
- Drag between slots to reschedule
- Multi-day overview mode (see all days at once)

**Undo/redo:**
- Maintain a stack of scheduling actions
- Ctrl+Z to undo last action
- "Reset Day" to clear all assignments for a day

**Session detail on hover:**
- Hover over a scheduled session to see full details (description, vote count, host, track) without leaving the builder

### 7.4 Admin Analytics Dashboard

New `/e/{slug}/admin/analytics` page:

- **Proposal stats**: Total proposals, approval rate, proposals per track, proposals over time
- **Voting stats**: Total votes cast, credits spent distribution, most-voted sessions, voting participation rate
- **Attendee stats**: Total attendees, joined over time, proposals per attendee distribution
- **Schedule stats**: Slot utilization, venue utilization, track distribution
- **Engagement**: Favorites count, session detail page views (if we add basic analytics)

---

## 8. Event Tracks System

### 8.1 Current State

Tracks exist (`tracks` table with name, slug, description, color, lead_name, is_active`) and sessions can be assigned to tracks. But:
- Track leads are stored as text (`lead_name`), not linked to user profiles
- Tracks are not manageable through a dedicated admin UI
- No track-level permissions
- No track-specific schedule view

### 8.2 Enhanced Track Model

```sql
ALTER TABLE tracks ADD COLUMN event_id UUID NOT NULL REFERENCES events(id);
ALTER TABLE tracks ADD COLUMN lead_user_id UUID REFERENCES profiles(id);
ALTER TABLE tracks ADD COLUMN max_sessions INTEGER;          -- Cap sessions per track
ALTER TABLE tracks ADD COLUMN proposal_guidelines TEXT;      -- Guidance for proposers
ALTER TABLE tracks ADD COLUMN icon TEXT;                     -- Icon identifier
ALTER TABLE tracks ADD COLUMN display_order INTEGER DEFAULT 0;
```

### 8.3 Track Management UI

New `/e/{slug}/admin/tracks` page:
- CRUD for tracks with color picker, description editor, icon selector
- Assign track leads (search users, assign role)
- Set max sessions per track
- Reorder tracks via drag-and-drop
- View sessions per track with counts

### 8.4 Track Lead Workflow

Track leads get a dedicated view:
- See all proposals in their track
- Approve/reject proposals (if granted moderator-level permission)
- Recommend scheduling preferences
- Communicate with session hosts in their track

### 8.5 Track-Filtered Views

- Session browser: filter by track (already partially working)
- Schedule view: filter to show only one track
- Voting page: browse sessions by track for easier discovery

---

## 9. Scheduling Engine Improvements

### 9.1 Conflict Prevention

```sql
-- Add constraint to prevent double-booking
CREATE UNIQUE INDEX idx_unique_session_per_slot
  ON sessions (time_slot_id)
  WHERE time_slot_id IS NOT NULL AND status = 'scheduled';
```

### 9.2 Smart Scheduling Algorithm

An API endpoint `/api/e/{slug}/admin/auto-schedule` that:

1. Takes all approved sessions sorted by vote count (descending)
2. For each session, finds the best available slot by scoring:
   - **Time preference match** (+10 points if host's preferred time)
   - **Capacity fit** (+5 if venue capacity ≥ estimated attendance based on votes)
   - **Track spread** (+3 if no other session from same track in same time row)
   - **Duration match** (+8 if session duration matches slot duration)
3. Admin previews the proposed schedule before confirming
4. Allows manual adjustments after auto-scheduling

### 9.3 Schedule Publication Workflow

Add concept of "draft schedule" vs "published schedule":
- Admin builds schedule in draft mode
- Preview how it looks to attendees
- "Publish Schedule" button makes it visible
- Triggers "schedule published" notification to all attendees
- Subsequent changes are tracked and can trigger "schedule updated" notifications

---

## 10. Ticketing & Revenue Distribution

### 10.1 Ticketing System

**Phase 1: Basic Ticketing**

```sql
CREATE TABLE ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  name TEXT NOT NULL,                 -- "General Admission", "VIP", "Speaker"
  description TEXT,
  price_cents INTEGER NOT NULL,       -- Price in cents (USD)
  currency TEXT DEFAULT 'USD',
  quantity_total INTEGER,             -- NULL = unlimited
  quantity_sold INTEGER DEFAULT 0,
  sale_starts_at TIMESTAMPTZ,
  sale_ends_at TIMESTAMPTZ,
  includes TEXT[],                    -- ["main_event", "afterparty", "workshop_access"]
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  tier_id UUID NOT NULL REFERENCES ticket_tiers(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  status TEXT DEFAULT 'valid' CHECK (status IN ('valid', 'checked_in', 'cancelled', 'refunded')),
  payment_id TEXT,                    -- External payment reference
  payment_method TEXT,                -- 'stripe', 'crypto', 'free'
  amount_paid_cents INTEGER,
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  qr_code TEXT UNIQUE,               -- For check-in scanning
  UNIQUE(event_id, user_id, tier_id)
);
```

**Payment Integration Options:**
- Stripe for fiat payments
- Crypto payments (ETH, USDC) via smart contract
- Free tier (for free events)

### 10.2 Revenue Distribution Smart Contract

This is the most ambitious feature — distributing ticket revenue to session hosts based on quadratic votes.

**Flow:**
1. Event admin sets a **revenue share percentage** (e.g., 30% of ticket revenue)
2. That percentage goes into a **multi-sig treasury** (Gnosis Safe / Safe{Wallet})
3. After the event concludes, the smart contract calculates each session host's share:
   - Share = (session's QV votes² / total QV votes² across all sessions) × treasury amount
4. Distribution is triggered by the event admin (or automatically after a delay)
5. Hosts claim their share from the contract

**Smart Contract Architecture:**

```solidity
// SchellingPointDistributor.sol
contract SchellingPointDistributor {
    struct Event {
        address treasury;             // Multi-sig address
        uint256 totalFunds;           // Total distributable amount
        uint256 totalVoteCredits;     // Sum of all sessions' credits_spent
        bool distributed;
        mapping(address => uint256) hostCredits;    // host → their sessions' total credits
        mapping(address => bool) claimed;
    }

    // Admin registers session results after event
    function registerResults(
        bytes32 eventId,
        address[] calldata hosts,
        uint256[] calldata credits
    ) external;

    // Hosts claim their share
    function claim(bytes32 eventId) external;
}
```

**Database Support:**

```sql
CREATE TABLE event_treasury (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  chain_id INTEGER NOT NULL,                -- Ethereum chain ID
  treasury_address TEXT NOT NULL,            -- Multi-sig address
  distributor_contract TEXT,                 -- Distributor contract address
  revenue_share_pct NUMERIC(5,2) NOT NULL,  -- e.g., 30.00 for 30%
  total_revenue_cents INTEGER DEFAULT 0,
  distributed_amount_cents INTEGER DEFAULT 0,
  distribution_status TEXT DEFAULT 'pending',
  distribution_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE host_payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  host_user_id UUID NOT NULL REFERENCES profiles(id),
  wallet_address TEXT,
  vote_credits_received INTEGER NOT NULL,
  share_pct NUMERIC(10,6),
  payout_amount_cents INTEGER,
  claimed BOOLEAN DEFAULT FALSE,
  claim_tx_hash TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.3 Wallet Integration

Session hosts need to connect an Ethereum wallet to receive payouts:
- Add `wallet_address` to `profiles` table
- "Connect Wallet" button using wagmi/viem or RainbowKit
- Wallet verification (sign message to prove ownership)
- Display wallet address in host profile

---

## 11. Platform-Level Features

### 11.1 Event Discovery

The platform landing page (`/`) becomes an event discovery hub:
- Featured events carousel
- Upcoming events grid (filterable by date, location, category)
- Search events by name, location, or topic
- Event categories (web3, tech, science, community, etc.)
- Geographic map view
- "My Events" section for logged-in users

### 11.2 User Profiles Across Events

The global `profiles` table becomes a cross-event identity:
- Profile page showing all events a user has participated in
- Sessions they've hosted across events
- Reputation/history (total sessions hosted, total votes received)
- Reusable profile that auto-fills when joining new events

### 11.3 Recurring Events

Support events that repeat:
- "Clone Event" functionality
- Recurring event series (e.g., "EthBoulder" as a series with annual instances)
- Carry over venue configurations, track definitions, team members

### 11.4 Platform Admin Dashboard

For Schelling Point platform operators:
- Total events, total users, total sessions across platform
- Revenue overview (if taking platform fee)
- Featured event management
- User management (ban/suspend)
- Platform-wide settings

### 11.5 Embed Widgets

Allow event organizers to embed Schelling Point components on their own websites:
- Schedule widget (`<iframe>` or web component)
- Session list widget
- Voting widget
- "Propose a Session" button

---

## 12. Things You Haven't Considered

This section covers critical gaps that need addressing for a production multi-tenant platform.

### 12.1 Event Lifecycle Management

**The Problem:** There's no concept of event phases. Currently, proposals, voting, and scheduling all happen simultaneously with no guardrails.

**The Solution:** Events move through defined phases with automatic transitions:
```
Draft → Published → Proposals Open → Proposals Closed → Voting Open →
Voting Closed → Scheduling → Schedule Published → Live → Completed → Archived
```

Each phase controls what's possible:
- Proposals can only be submitted during `proposals_open`
- Votes can only be cast during `voting_open`
- Schedule is only visible after `schedule_published`
- Phase transitions can be automatic (based on configured timestamps) or manual

### 12.2 Time Zone Handling

**The Problem:** The codebase hardcodes `-07:00` (Mountain Time) offsets in `admin/setup/page.tsx` and `propose/page.tsx`.

**The Solution:**
- Store all timestamps in UTC in the database
- Store event timezone in `events.timezone` (IANA format)
- Display times in the event's timezone throughout the event pages
- Use `Intl.DateTimeFormat` with the event's timezone for all rendering
- Handle daylight saving transitions correctly

### 12.3 Session Capacity & Venue Matching

**The Problem:** No mechanism to prevent scheduling a session with 200 interested voters into a 20-person room.

**The Solution:**
- Track "estimated attendance" based on vote count and historical conversion rates
- Warn admins when scheduling into undersized venues
- Allow attendees to RSVP to specific sessions (helps with capacity planning)
- Show live capacity indicators: "23 / 50 spots claimed"

### 12.4 Waitlists

**The Problem:** No mechanism for handling events or sessions at capacity.

**The Solution:**
- Event-level waitlist when `max_attendees` is reached
- Session-level RSVP with capacity limits tied to venue size
- Automatic promotion from waitlist when spots open
- Notification when promoted from waitlist

### 12.5 Content Moderation at Scale

**The Problem:** With thousands of events, spam and abuse become real concerns.

**The Solution:**
- Rate limiting on event creation (verify email, optional phone)
- Session proposal spam detection (basic keyword filtering, duplicate detection)
- Report mechanism (flag sessions, events, or users)
- Platform-level moderation queue
- Automated content policy enforcement
- Trust scores for users based on history

### 12.6 Data Privacy & Compliance (GDPR/CCPA)

**The Problem:** No data export, deletion, or consent management.

**The Solution:**
- User data export (download all personal data as JSON/ZIP)
- Account deletion (cascade delete all user data, anonymize votes)
- Cookie consent banner (if adding analytics)
- Privacy policy generator per event (template + customization)
- Data retention policies (auto-archive events after N months)
- Event-level attendee data — organizers can only see data for their event

### 12.7 Offline Capability & Day-of Reliability

**The Problem:** During the actual event, WiFi is often unreliable. The app currently requires constant connectivity.

**The Solution:**
- Service Worker for offline schedule viewing (cache schedule data)
- Optimistic UI updates for voting (queue votes locally, sync when online)
- Progressive Web App (PWA) support with "Add to Home Screen"
- QR code check-in that works offline (pre-downloaded attendee list)
- Local-first data sync for critical day-of features

### 12.8 Calendar Integration

**The Problem:** The `my-schedule` page mentions calendar export but it needs to be robust.

**The Solution:**
- .ics file download for individual sessions
- .ics file download for full personal schedule
- Google Calendar "Add" button (deep link)
- Subscribable calendar URL (iCal feed that updates as schedule changes)
- Calendar reminders (15 min before session starts)

### 12.9 Accessibility

**The Problem:** No explicit accessibility considerations in the current UI.

**The Solution:**
- WCAG 2.1 AA compliance audit
- Keyboard navigation for all interactive elements (especially schedule builder)
- Screen reader support (proper ARIA labels, semantic HTML)
- Color contrast ratios (especially important with custom themes — validate contrast)
- Reduced motion option (currently using framer-motion animations)
- Focus management in modals (already using Radix UI which helps)

### 12.10 Mobile Experience

**The Problem:** The schedule builder has a "best viewed on desktop" warning. The app is web-only.

**The Solution:**
- Mobile-first responsive redesign of schedule view (list view on mobile, grid on desktop)
- Touch-friendly drag-and-drop for schedule builder (or alternative "assign" UI for mobile admins)
- PWA with push notifications
- Deep linking (share session URLs that open in the PWA)
- Consider React Native or Capacitor wrapper for app store presence (later phase)

### 12.11 API Rate Limiting & Abuse Prevention

**The Problem:** No rate limiting on API endpoints. A single bad actor could overwhelm the system.

**The Solution:**
- Rate limiting per user per endpoint (using Vercel Edge Middleware or Upstash Redis)
- Rate limiting per event (prevent one event from consuming disproportionate resources)
- API key scoping per event (the current global `API_KEY_BONFIRESAI` becomes per-event)
- Vote manipulation detection (sudden burst of votes from similar patterns)
- DDoS protection (Vercel's built-in + Cloudflare if needed)

### 12.12 Session Materials & Resources

**The Problem:** No way for hosts to share slides, recordings, or resources.

**The Solution:**
```sql
ALTER TABLE sessions ADD COLUMN resources JSONB DEFAULT '[]';
-- [{"type": "slides", "url": "...", "title": "..."}, {"type": "recording", "url": "..."}]
```
- Hosts can add resources before (prep materials) and after (slides, recordings) their session
- File upload via Supabase Storage or external URL
- Resources visible on session detail page

### 12.13 Feedback & Ratings

**The Problem:** No post-session feedback mechanism.

**The Solution:**
```sql
CREATE TABLE session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  session_id UUID NOT NULL REFERENCES sessions(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  is_anonymous BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);
```
- Post-event feedback window (configurable duration)
- Anonymous option to encourage honest feedback
- Aggregate ratings visible to hosts
- Feedback summary for event organizers

### 12.14 Check-In System

**The Problem:** No mechanism to verify actual attendance.

**The Solution:**
- QR code per ticket (generated on purchase/registration)
- Check-in scanner (camera-based, works on any phone)
- Volunteer check-in UI (`/e/{slug}/checkin`)
- Real-time attendance tracking
- Check-in gates (only allow voting after check-in for in-person events)

### 12.15 Multi-Language Support (i18n)

**The Problem:** All UI text is hardcoded in English.

**The Solution:**
- Extract all strings to translation files (using `next-intl` or `react-i18next`)
- Support event-level language setting
- Start with English, add Spanish, Portuguese, Mandarin, Japanese, Korean
- Allow community-contributed translations

### 12.16 Webhook & Integration System

**The Problem:** No way for event organizers to integrate with their existing tools.

**The Solution:**
- Outgoing webhooks for key events (new proposal, vote cast, session scheduled)
- Slack/Discord integration (post updates to a channel)
- Zapier/n8n integration via webhooks
- API tokens per event for custom integrations

### 12.17 Search & Discovery Within Events

**The Problem:** For large events with 100+ sessions, finding relevant content is hard.

**The Solution:**
- Full-text search across session titles, descriptions, and tags
- Personalized session recommendations based on user's interests (from profile) and voting patterns
- "Similar Sessions" suggestions on session detail pages
- Tag cloud / topic clustering visualization

### 12.18 Session Scheduling Constraints

**The Problem:** Hosts might have conflicts, co-hosts might be at other sessions, attendees might want to see two sessions in the same slot.

**The Solution:**
- Host availability windows (already partially implemented as `time_preferences`)
- Co-host conflict detection (don't schedule two sessions with the same co-host at the same time)
- Attendee demand analysis (if many users voted for both Session A and Session B, schedule them in different slots)
- "Conflicts" indicator in my-schedule view

### 12.19 Legal & Compliance Per Event

**The Problem:** The current app has global terms/privacy/code-of-conduct pages. Events need their own.

**The Solution:**
- Event-level Code of Conduct (customizable template)
- Event-level Terms (liability waivers, photo consent, etc.)
- Require acceptance of event-specific terms on registration
- Incident reporting system tied to Code of Conduct

### 12.20 Platform Economics

**The Problem:** No revenue model for the Schelling Point platform itself.

**The Solution (options):**
- **Freemium**: Free for small events (≤50 attendees), paid tiers for larger
- **Transaction fee**: Small % on ticket sales (e.g., 2-5%)
- **Feature gating**: Advanced features (custom domains, analytics, API access) on paid plans
- **White-label licensing**: Remove "Powered by Schelling Point" for enterprise tier

---

## 13. Database Schema Evolution

### 13.1 New Tables Summary

| Table | Purpose |
|-------|---------|
| `events` | Core tenant entity — one row per unconference |
| `event_members` | User ↔ Event relationship with roles |
| `notifications` | In-app and email notification records |
| `notification_preferences` | Per-user notification settings |
| `ticket_tiers` | Ticket types and pricing |
| `tickets` | Purchased tickets |
| `event_treasury` | Smart contract treasury configuration |
| `host_payouts` | Per-session payout tracking |
| `session_feedback` | Post-session ratings and comments |
| `event_invitations` | Team member invitations |

### 13.2 Modified Tables Summary

| Table | Changes |
|-------|---------|
| `profiles` | Add `wallet_address`, `platform_role`, remove `vote_credits`, `is_admin` |
| `sessions` | Add `event_id`, `resources JSONB`, `estimated_attendance` |
| `votes` | Add `event_id` |
| `venues` | Add `event_id` |
| `time_slots` | Add `event_id` |
| `tracks` | Add `event_id`, `lead_user_id`, `max_sessions`, `display_order` |
| `favorites` | Add `event_id` |
| `session_cohosts` | Add `event_id` (for RLS efficiency) |
| `cohost_invites` | Add `event_id` (for RLS efficiency) |

### 13.3 Index Strategy

```sql
-- Event-scoped lookups (critical for performance)
CREATE INDEX idx_sessions_event_status ON sessions(event_id, status);
CREATE INDEX idx_sessions_event_votes ON sessions(event_id, total_votes DESC);
CREATE INDEX idx_votes_event_user ON votes(event_id, user_id);
CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);
CREATE INDEX idx_venues_event ON venues(event_id);
CREATE INDEX idx_time_slots_event ON time_slots(event_id);
CREATE INDEX idx_tracks_event ON tracks(event_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);
```

---

## 14. API Architecture Evolution

### 14.1 Route Restructuring

Current API routes are global:
```
/api/v1/sessions
/api/v1/venues
/api/v1/tracks
```

New routes are event-scoped:
```
/api/v1/events                          → List/create events
/api/v1/events/{slug}                   → Get/update event
/api/v1/events/{slug}/sessions          → List/create sessions
/api/v1/events/{slug}/sessions/{id}     → Get/update/delete session
/api/v1/events/{slug}/venues            → List/create venues
/api/v1/events/{slug}/tracks            → List/create tracks
/api/v1/events/{slug}/timeslots         → List/create time slots
/api/v1/events/{slug}/schedule          → Get schedule
/api/v1/events/{slug}/members           → List/manage members
/api/v1/events/{slug}/analytics         → Get analytics
/api/v1/events/{slug}/notifications     → Manage notifications
/api/v1/events/{slug}/tickets           → Ticketing endpoints

/api/v1/me                              → Current user profile
/api/v1/me/events                       → User's events
/api/v1/me/notifications                → User's notifications
```

### 14.2 API Authentication Evolution

- Keep API key auth for external read-only access (now scoped per-event)
- Bearer token auth for user-facing operations (no change)
- Add OAuth2 support for third-party integrations (future)
- Add webhook signing for outgoing webhooks

### 14.3 Event Context Middleware

Create a middleware that extracts event context from the URL:

```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const eventSlug = extractEventSlug(request.nextUrl.pathname)
  if (eventSlug) {
    // Add event context to headers for API routes
    request.headers.set('x-event-slug', eventSlug)
  }
}
```

---

## 15. Migration Strategy

### 15.1 Principles

1. **No data loss**: All existing EthBoulder data migrates cleanly
2. **No downtime**: Migration can run while the existing app is live
3. **Backwards compatible**: Existing URLs redirect to new structure
4. **Incremental**: Changes are deployed in phases, not a big bang

### 15.2 Migration Steps

**Phase 0: Preparation**
1. Create `events` table
2. Create a default "EthBoulder 2026" event record
3. Add nullable `event_id` columns to all existing tables
4. Backfill `event_id` with the EthBoulder event ID
5. Make `event_id` NOT NULL once backfilled

**Phase 1: Route Migration**
1. Create new `/e/[slug]/...` routes (can coexist with old routes)
2. Add redirects from old routes → `/e/ethboulder-2026/...`
3. Update `DashboardLayout` to be event-aware

**Phase 2: Auth Migration**
1. Create `event_members` table
2. Migrate existing `profiles.is_admin = true` → `event_members` with role `admin`
3. Migrate all existing users → `event_members` with role `attendee`
4. Update `useAuth` to support event context

**Phase 3: Feature Migration**
1. Migrate notifications
2. Migrate theming
3. Migrate API routes

### 15.3 EthBoulder → Schelling Point Branding Changes

Files requiring branding removal:

| File | Change |
|------|--------|
| `src/app/page.tsx` | Replace with platform landing page; current becomes event landing template |
| `src/components/Footer.tsx` | Remove EthBoulder links/branding; make event-aware |
| `src/components/DashboardLayout.tsx` | Remove "EthBoulder™" subtitle; show event name |
| `src/app/admin/setup/page.tsx` | Remove hardcoded `EVENT_DAYS` |
| `src/app/admin/schedule/page.tsx` | Remove hardcoded `EVENT_DAYS`, `DAY_TO_PREFERENCES` |
| `src/app/propose/page.tsx` | Remove hardcoded `EVENT_DAYS`, `TIME_PREFERENCES` |
| `public/logo.svg` | Keep as Schelling Point platform logo; event logos from storage |
| Metadata in `layout.tsx` | Dynamic based on event context |

---

## 16. Phased Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
**Goal: Multi-tenant data model + event context routing**

- [ ] Create `events` table and migration
- [ ] Add `event_id` to all existing tables
- [ ] Create `event_members` table (replaces `is_admin`)
- [ ] Backfill existing data into EthBoulder event
- [ ] Create `/e/[slug]` dynamic route structure
- [ ] Build `EventContext` provider (useEvent hook)
- [ ] Update `useAuth` to include event role
- [ ] Update RLS policies for event-scoping
- [ ] Add redirects from old routes
- [ ] Remove hardcoded `EVENT_DAYS` — derive from event dates
- [ ] Remove hardcoded timezone — use event timezone

### Phase 2: Self-Serve Event Creation (Weeks 3-5)
**Goal: Anyone can create and configure an event**

- [ ] Build event creation wizard (8-step flow)
- [ ] Event templates system
- [ ] Venue setup within wizard (build on existing `admin/setup`)
- [ ] Time slot bulk creation
- [ ] Track definition within wizard
- [ ] Voting configuration (credits, mechanism, windows)
- [ ] Platform landing page (event discovery)
- [ ] Event lifecycle state machine

### Phase 3: Branding & Theming (Weeks 5-6)
**Goal: Events look like their own product**

- [ ] `ThemeProvider` with CSS variable injection
- [ ] Theme configuration UI in wizard + settings
- [ ] Pre-built theme templates (6-8 options)
- [ ] Logo/banner upload via Supabase Storage
- [ ] "Powered by Schelling Point" footer
- [ ] Dynamic metadata (title, OG images) per event
- [ ] Remove all EthBoulder-specific branding from codebase

### Phase 4: Notifications & Communications (Weeks 6-8)
**Goal: Session hosts and attendees are informed at every step**

- [ ] `notifications` and `notification_preferences` tables
- [ ] Database triggers for session status changes
- [ ] Email template library (10+ templates)
- [ ] In-app notification center (bell icon + dropdown)
- [ ] Notification preferences UI
- [ ] Admin broadcast messaging (send to all attendees)
- [ ] Session status change emails (approved, rejected, scheduled, rescheduled)

### Phase 5: Admin Dashboard Overhaul (Weeks 8-10)
**Goal: Managing an event is fast and intuitive**

- [ ] Batch session operations (approve/reject/assign)
- [ ] Session search and filtering
- [ ] Schedule builder conflict detection
- [ ] Capacity warnings in schedule builder
- [ ] Auto-scheduling algorithm
- [ ] Admin analytics dashboard
- [ ] Admin session creation (curated/invited speakers)
- [ ] Schedule draft/publish workflow
- [ ] Track management UI
- [ ] Undo/redo in schedule builder

### Phase 6: Attendee Experience (Weeks 10-12)
**Goal: Attending an event is delightful**

- [ ] Event-scoped voting with per-event credits
- [ ] Improved session discovery (search, filter, recommendations)
- [ ] Calendar integration (.ics export, subscribable feed)
- [ ] PWA support (offline schedule, add to home screen)
- [ ] Session RSVP with capacity tracking
- [ ] Post-session feedback system
- [ ] Session resources (slides, recordings)

### Phase 7: Ticketing & Revenue (Weeks 12-16)
**Goal: Events can sell tickets and distribute revenue**

- [ ] Ticket tier configuration
- [ ] Stripe payment integration
- [ ] Crypto payment integration (ETH/USDC)
- [ ] QR code ticket generation
- [ ] Check-in scanner UI
- [ ] Revenue dashboard
- [ ] Treasury multi-sig configuration
- [ ] Smart contract: `SchellingPointDistributor`
- [ ] Host wallet connection
- [ ] Payout calculation and distribution
- [ ] Payout claim flow

### Phase 8: Scale & Polish (Weeks 16-20)
**Goal: Production-ready for thousands of events**

- [ ] Rate limiting and abuse prevention
- [ ] Content moderation tools
- [ ] Platform admin dashboard
- [ ] Webhook system for integrations
- [ ] Embed widgets
- [ ] Accessibility audit (WCAG 2.1 AA)
- [ ] Performance optimization (caching, pagination, lazy loading)
- [ ] Data export and deletion (GDPR)
- [ ] Recurring events support
- [ ] i18n foundation
- [ ] Platform billing/pricing tiers
- [ ] Documentation for event organizers

---

## Appendix: Key Technical Decisions

### Why Slug-Based Routing Over Subdomains
- No wildcard DNS needed
- Simpler Vercel deployment
- Shared auth session across events
- SEO benefits (domain authority consolidation)
- Custom domains can be supported later via Vercel's domain mapping

### Why Shared Database Over Schema-Per-Tenant
- Simpler migrations (one schema to evolve)
- Cross-event features are trivial (user profiles, platform analytics)
- Supabase RLS provides strong isolation
- Cost-effective (single database connection pool)
- 10,000 events with 100 sessions each = 1M session rows — well within PostgreSQL capacity

### Why Keep Supabase
- RLS policies provide tenant isolation without application-level checks
- Auth already working (magic link, token refresh)
- Database triggers handle vote counting automatically
- Edge Functions for background processing (notifications)
- Storage for event assets
- Realtime for live updates (future: live voting, schedule changes)

### Why Build Smart Contracts Later
- The ticketing + QV distribution is the most novel and complex feature
- Get the platform mechanics right first
- Can start with Stripe-only payments and manual distribution
- Smart contract adds trustlessness and transparency once the math is proven

---

## Appendix: Files Requiring Changes (Ordered by Impact)

### Critical Path (Must Change for Multi-Tenancy)
1. `supabase/migrations/` — New migration for events table + event_id columns
2. `src/hooks/useAuth.tsx` — Event-scoped role context
3. `src/components/DashboardLayout.tsx` — Event-aware navigation, remove hardcoded branding
4. `src/app/page.tsx` → Platform landing (event discovery)
5. `src/app/admin/page.tsx` → Event-scoped admin
6. `src/app/admin/schedule/page.tsx` → Remove EVENT_DAYS hardcoding
7. `src/app/admin/setup/page.tsx` → Remove EVENT_DAYS hardcoding
8. `src/app/propose/page.tsx` → Remove EVENT_DAYS, TIME_PREFERENCES hardcoding
9. `src/lib/supabase/server.ts` → Event context in server-side queries
10. `src/lib/api/response.ts` → Event-scoped API responses

### New Files (Core)
1. `src/app/e/[slug]/layout.tsx` — Event layout with theme + context
2. `src/app/e/[slug]/page.tsx` — Event landing page
3. `src/app/create/page.tsx` — Event creation wizard
4. `src/hooks/useEvent.tsx` — Event context hook
5. `src/hooks/useEventRole.tsx` — Event role/permissions hook
6. `src/lib/theme/ThemeProvider.tsx` — Theme injection
7. `src/lib/notifications/` — Notification system
8. `src/lib/email/templates/` — Email template library

### EthBoulder Branding to Remove
1. `src/app/page.tsx:79,92-96,98-102` — "EthBoulder™", event dates, hero text
2. `src/components/DashboardLayout.tsx:205` — "EthBoulder™" subtitle
3. `src/components/Footer.tsx:36-48,118-177` — EthBoulder logo, wordmark, links
4. `src/app/admin/setup/page.tsx:33-37` — Hardcoded EVENT_DAYS
5. `src/app/admin/schedule/page.tsx:88-99` — Hardcoded EVENT_DAYS, DAY_TO_PREFERENCES
6. `src/app/propose/page.tsx:35-52` — Hardcoded TIME_PREFERENCES, EVENT_DAYS

---

*This strategy document is a living artifact. As implementation proceeds, each phase will generate more detailed technical specifications and acceptance criteria.*
