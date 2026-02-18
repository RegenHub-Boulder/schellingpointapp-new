# EthBoulder Data Import Strategy

## Overview

This document outlines the strategy for importing production event data from the CSV files into the Schelling Point MVP database. The goal is to populate the backend with venue, schedule, and track data while preserving the flexibility for unconference-style session proposals and quadratic voting.

---

## 1. Data Analysis Summary

### Source Files

| File | Contents | Records |
|------|----------|---------|
| `EthBoulder Event Status Venues.csv` | Venue list with styles | 6 venues |
| `EthBoulder Event Status Tracks.csv` | Track names + leads | 9 confirmed + 5 pending |
| `EthBoulder Event Programming.csv` | Full 3-day schedule grid | ~60 time blocks across 4 venues |

### Key Observations

**1. Venues have different roles:**
- **E Town** (capacity: 330) - Main stage, curated speakers
- **regen hub** (capacity: 30) - Side venue, workshops + track sessions
- **terrible turtle** (capacity: 65) - Creative Track home + unconference slots
- **Riverside** (capacity: TBD) - Additional space, less structured

**2. Sessions fall into distinct categories:**
- **Curated talks** - Pre-scheduled speakers (e.g., "CODY GUNTON EF", "Naomi Brockwell")
- **Workshops** - Interactive sessions with specific hosts
- **Track sessions** - Thematically grouped (AI track, Creative Track, etc.)
- **Unconference slots** - Open for participant-proposed sessions (labeled "unconference")
- **Breaks** - Lunch, check-in, transitions

**3. Time slots are venue-specific:**
- Each venue operates different hours
- Friday: E Town 10:00-18:00, regen hub 11:15-16:30, turtle 10:00-16:30
- Saturday: E Town 9:30-15:00, others 11:00-16:30
- Sunday: E Town 10:00-18:00, others 11:00-16:30

**4. Tracks are organizational, not venues:**
- Tracks span time and venues (e.g., "Creative Track" runs in turtle but sessions happen across days)
- Track leads are identified but not yet in the system as users

---

## 2. Schema Evolution Needed

### Current Schema Gaps

| Gap | Problem | Solution |
|-----|---------|----------|
| No `tracks` table | Can't organize sessions by theme | Add `tracks` table |
| Time slots are global | Can't model venue-specific schedules | Add `venue_id` to `time_slots` |
| No session type distinction | Can't differentiate curated vs. open slots | Add `session_type` to `sessions` |
| No venue metadata | Missing address, style, operating hours | Extend `venues` table |

### Proposed Schema Changes

```sql
-- =============================================================================
-- TRACKS (NEW)
-- =============================================================================
CREATE TABLE tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,  -- for UI display
  lead_name TEXT,
  lead_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUES (EXTENDED)
-- =============================================================================
ALTER TABLE venues ADD COLUMN IF NOT EXISTS style TEXT;  -- 'main_stage', 'side_venue', 'lounge'
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS notes TEXT;

-- =============================================================================
-- TIME SLOTS (VENUE-AWARE)
-- =============================================================================
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id);
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS day_label TEXT;  -- 'Friday', 'Saturday', 'Sunday'
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS slot_type TEXT DEFAULT 'session';
-- slot_type: 'session', 'break', 'checkin', 'unconference'

-- =============================================================================
-- SESSIONS (EXTENDED)
-- =============================================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id);
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'proposed';
-- session_type: 'curated', 'proposed', 'workshop', 'unconference_slot'
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_votable BOOLEAN DEFAULT TRUE;
-- curated sessions are not votable for scheduling, but may be votable for budget
```

---

## 3. Data Mapping Strategy

### 3.1 Venues

Map directly from CSV with enriched metadata:

| CSV Name | DB Name | Style | Capacity | Notes |
|----------|---------|-------|----------|-------|
| E Town | E Town | main_stage | 330 | Main hub, curated content |
| regen hub | Regen Hub | side_venue | 30 | Workshops, track sessions |
| Terrible turtle | Terrible Turtle | side_venue | 65 | Creative Track home |
| Riverside | Riverside | lounge | TBD | Flexible space |
| Velvet Elk Lounge | Velvet Elk Lounge | offsite | TBD | Evening events? |
| Avanti | Avanti | offsite | TBD | TBD |

### 3.2 Tracks

Create from tracks CSV:

| Track Name | Slug | Lead |
|------------|------|------|
| Privacy | privacy | Chair / Nuke |
| Creativity | creativity | Rene |
| PGF | pgf | Sejal Rekhan |
| Ethereum Localism | eth-localism | Benjamin / Sara |
| d/acc | dacc | Owocki |
| DeSci | desci | Rodrigo |
| DAO Tooling | dao-tooling | Timothy |
| AI & Society | ai-society | Deepa |
| Onchain Organizations | onchain-orgs | Graham Novak |
| Hackathon | hackathon | Aaron |

### 3.3 Time Slots

**Strategy: Create venue-specific time slots from the programming grid.**

For each venue, parse the schedule and create time slots:

```
Friday @ E Town:
  - 10:00-10:30 | "Check-in" | slot_type: checkin
  - 10:30-11:00 | "Opening" | slot_type: session
  - 11:05-11:30 | "Morning Session 1" | slot_type: session
  ...etc

Friday @ regen hub:
  - 11:15-11:45 | "Session 1" | slot_type: session
  - 11:50-12:20 | "Session 2" | slot_type: session
  ...etc

Friday @ terrible turtle:
  - 10:30-11:10 | "Creative Track Kickoff" | slot_type: session
  - 11:15-11:45 | "Creative Track" | slot_type: session
  - 15:55-16:25 | "Unconference" | slot_type: unconference
  ...etc
```

### 3.4 Sessions

**Two-phase approach:**

**Phase 1: Pre-populate curated sessions**
- Parse speaker names from programming CSV
- Create sessions with `session_type: 'curated'` and `is_votable: false`
- Link to venue + time slot
- Status: `scheduled`

**Phase 2: Create unconference placeholder slots**
- For each "unconference" entry in the grid, create an empty time slot
- Don't create sessions - those will come from participant proposals
- These are the slots where quadratic voting determines what gets scheduled

---

## 4. The Unconference Mechanism

### How It Should Work

1. **Admin seeds the schedule** with curated sessions and open unconference slots
2. **Participants propose sessions** targeting unconference slots
3. **Quadratic voting** determines which proposals win each slot
4. **Admin approves/schedules** winning proposals into the slots

### Data Flow

```
Seed Data:
┌─────────────────────────────────────────────────────┐
│ time_slot: Sunday 11:15-11:45 @ regen hub           │
│ slot_type: 'unconference'                           │
│ (no session attached yet)                           │
└─────────────────────────────────────────────────────┘
          │
          ▼ Participants propose
┌─────────────────────────────────────────────────────┐
│ session: "Zero Knowledge for Beginners"             │
│ session_type: 'proposed'                            │
│ preferred_time_slot_id: (the unconference slot)     │
│ status: 'pending'                                   │
│ total_votes: accumulating via QV                    │
└─────────────────────────────────────────────────────┘
          │
          ▼ Voting closes, admin reviews
┌─────────────────────────────────────────────────────┐
│ session: "Zero Knowledge for Beginners"             │
│ time_slot_id: (now assigned)                        │
│ venue_id: regen hub                                 │
│ status: 'scheduled'                                 │
└─────────────────────────────────────────────────────┘
```

---

## 5. Implementation Plan

### Step 1: Schema Migration
- [ ] Create migration file for schema changes
- [ ] Add `tracks` table
- [ ] Extend `venues` with style, address, notes
- [ ] Extend `time_slots` with venue_id, day_label, slot_type
- [ ] Extend `sessions` with track_id, session_type, is_votable

### Step 2: Create Import Script
- [ ] Parse venues CSV → insert venues
- [ ] Parse tracks CSV → insert tracks
- [ ] Parse programming CSV → extract unique time slots per venue per day
- [ ] Parse programming CSV → create curated sessions for named speakers
- [ ] Mark unconference slots appropriately

### Step 3: Seed Data Files
- [ ] `seed_venues.sql` - All 6 venues
- [ ] `seed_tracks.sql` - All 9+ tracks
- [ ] `seed_timeslots.sql` - All time blocks per venue per day
- [ ] `seed_curated_sessions.sql` - Pre-scheduled speakers/workshops

### Step 4: Admin UI Updates
- [ ] Add track management to admin panel
- [ ] Add time slot visibility in schedule view
- [ ] Show unconference vs curated distinction

---

## 6. Open Questions

1. **What are the actual dates?** The CSV shows "Feb 12, 2026" in seed.sql but programming shows Friday/Saturday/Sunday. Need confirmed event dates.

2. **Venue addresses?** We have names but no physical locations for mapping/directions.

3. **Track sessions vs. unconference?** Some slots show "Creative Track" - are these fixed track sessions or open for proposals within that track?

4. **Off-site venues** (Velvet Elk, Avanti, Riverside) - Are these part of the unconference or separate events?

5. **Session duration flexibility** - Most slots appear to be 25-30 minutes. Should we standardize or support variable durations?

---

## 7. Recommended Next Steps

1. **Confirm event dates** with production team
2. **Approve schema changes** before implementing
3. **Clarify track session handling** - fixed vs. votable within track
4. **Run schema migration** on new Supabase instance
5. **Execute import script** to populate venues, tracks, and time slots
6. **Manual review** of curated sessions before going live

---

*Strategy document created: 2026-02-05*
*Data source: .claude/EthBoulder Event *.csv files*
