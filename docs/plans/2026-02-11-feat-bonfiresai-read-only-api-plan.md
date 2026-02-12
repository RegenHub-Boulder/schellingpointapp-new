---
title: "feat: Add read-only REST API for BonfiresAI knowledge graph"
type: feat
date: 2026-02-11
brainstorm: docs/brainstorms/2026-02-11-bonfiresai-read-api-brainstorm.md
---

# feat: Add Read-Only REST API for BonfiresAI Knowledge Graph

## Overview

Add a read-only REST API at `/api/v1/*` so BonfiresAI can ingest Schelling Point event data into their knowledge graph. The API uses simple API key authentication and exposes sessions, profiles, tracks, venues, timeslots, and a combined schedule endpoint. Responses are flat by default with optional `?include=` for nested relationships.

## Problem Statement / Motivation

BonfiresAI is building a knowledge graph that integrates with Schelling Point event data. They need a stable, documented API to read sessions, participants, tracks, venues, and schedule information. Currently, data is only accessible via direct Supabase PostgREST calls from the browser — there is no server-mediated API for external consumers.

## Proposed Solution

### Architecture

```
BonfiresAI  --x-api-key-->  /api/v1/*  --service role-->  Supabase (PostgreSQL)
```

- Next.js App Router API routes at `src/app/api/v1/`
- Shared API key validation utility at `src/lib/api/auth.ts`
- Uses `createAdminClient()` from `src/lib/supabase/server.ts` (service role key, bypasses RLS)
- Explicit column SELECT lists per endpoint (never `SELECT *`)

### File Structure

```
src/
  lib/
    api/
      auth.ts              # API key validation + error helpers
      response.ts          # Standard response/error envelope helpers
  app/
    api/
      v1/
        sessions/
          route.ts         # GET /api/v1/sessions
          [id]/
            route.ts       # GET /api/v1/sessions/:id
        profiles/
          route.ts         # GET /api/v1/profiles
          [id]/
            route.ts       # GET /api/v1/profiles/:id
        tracks/
          route.ts         # GET /api/v1/tracks
          [id]/
            route.ts       # GET /api/v1/tracks/:id
        venues/
          route.ts         # GET /api/v1/venues
          [id]/
            route.ts       # GET /api/v1/venues/:id
        timeslots/
          route.ts         # GET /api/v1/timeslots
        schedule/
          route.ts         # GET /api/v1/schedule
```

## Implementation Phases

### Phase 1: Foundation (API key auth + response helpers)

**Files:**
- `src/lib/api/auth.ts` — API key validation
- `src/lib/api/response.ts` — Standard response envelope and error helpers

**API key validation:**
- Read `x-api-key` header from request
- Compare against `process.env.API_KEY_BONFIRESAI` using `crypto.timingSafeEqual()` (timing-safe)
- Return `{ authorized: false }` or `{ authorized: true }` — caller handles 401 response

**Standard response envelope:**
```typescript
// Success (list)
{ "data": [...], "count": 42 }

// Success (single)
{ "data": { ... } }

// Error
{ "error": { "code": "NOT_FOUND", "message": "Session not found" } }
```

**Standard error codes:**
- `401` — `UNAUTHORIZED` (missing or invalid API key)
- `400` — `BAD_REQUEST` (invalid UUID, invalid include, invalid filter value)
- `404` — `NOT_FOUND` (entity not found by ID)
- `405` — `METHOD_NOT_ALLOWED` (POST/PUT/DELETE/PATCH to read-only endpoints)

**UUID validation helper:**
- Validate `:id` params are valid UUIDs before querying
- Return 400 with clear message for malformed IDs

**Cache header helper:**
- Add `Cache-Control: public, max-age=60` to all responses

**New env var:**
- `API_KEY_BONFIRESAI` — server-side only (no `NEXT_PUBLIC_` prefix)

---

### Phase 2: Core Resource Endpoints

Each endpoint follows the same pattern:
1. Validate API key (401 if invalid)
2. Parse query params (`?include=`, `?status=`, `?day=`)
3. Validate params (400 for invalid includes/filters/UUIDs)
4. Query Supabase with explicit column list
5. Strip sensitive fields
6. Return wrapped response

#### Endpoint: Sessions

**`GET /api/v1/sessions`**
- Default filter: `status IN ('approved', 'scheduled')` (matches frontend behavior, prevents leaking pending/rejected)
- Optional: `?status=approved,scheduled,pending` to override
- Valid status values: `pending`, `approved`, `rejected`, `scheduled`
- Valid includes: `host`, `track`, `venue`, `timeslot`
- Returns 400 for invalid include values

**Returned fields:**
```
id, title, description, format, duration, host_name, topic_tags, status,
is_self_hosted, custom_location, session_type, is_votable,
total_votes, total_credits, voter_count,
created_at, updated_at
```
Plus nested objects when `?include=` is used.

**`GET /api/v1/sessions/:id`**
- Always returns nested host, track, venue, timeslot (no `?include=` needed)
- 404 if not found

**Host include note:** `host_id` can be NULL for curated sessions (they only have `host_name`). When host is null, return `"host": null`. The `host_name` field is always on the session itself.

#### Endpoint: Profiles

**`GET /api/v1/profiles`**

**Returned fields (explicit allowlist):**
```
id, display_name, bio, avatar_url, affiliation, building,
telegram, ens, interests, is_admin, created_at
```

**Excluded fields:**
- `email` — PII, privacy
- `vote_credits` — internal state
- `onboarding_completed` — internal UI state

`is_admin` is kept because it identifies organizers, which is useful for the knowledge graph.

**`GET /api/v1/profiles/:id`**
- Same field list
- Valid includes: `sessions` (sessions where host_id matches this profile)
- 404 if not found

#### Endpoint: Tracks

**`GET /api/v1/tracks`**

**Returned fields:**
```
id, name, slug, description, color, lead_name, is_active, created_at
```

**Excluded fields:**
- `lead_email` — PII, mirrors profile email exclusion

**`GET /api/v1/tracks/:id`**
- Valid includes: `sessions`
- 404 if not found

#### Endpoint: Venues

**`GET /api/v1/venues`**

**Returned fields:**
```
id, name, slug, capacity, features, style, address, notes, is_primary, created_at
```

**`GET /api/v1/venues/:id`**
- Valid includes: `timeslots`
- 404 if not found

#### Endpoint: Timeslots

**`GET /api/v1/timeslots`**
- Optional: `?day=2026-02-13` (filter by `day_date`)
- Valid includes: `venue`

**Returned fields:**
```
id, start_time, end_time, label, is_break, day_date, slot_type,
venue_id, created_at
```

---

### Phase 3: Schedule Endpoint

**`GET /api/v1/schedule`**
- Optional: `?day=2026-02-13` (filter to single day)
- Pre-joined composite view: timeslots grouped by day, each with their sessions

**Response shape:**
```json
{
  "data": [
    {
      "day": "2026-02-13",
      "slots": [
        {
          "id": "...",
          "start_time": "2026-02-13T09:00:00-07:00",
          "end_time": "2026-02-13T10:00:00-07:00",
          "label": "Morning Session 1",
          "is_break": false,
          "slot_type": "session",
          "venue": { "id": "...", "name": "Main Hall" },
          "sessions": [
            {
              "id": "...",
              "title": "...",
              "host_name": "...",
              "format": "talk",
              "track": { "id": "...", "name": "Privacy", "color": "#..." }
            }
          ]
        },
        {
          "id": "...",
          "label": "Lunch Break",
          "is_break": true,
          "slot_type": "break",
          "sessions": []
        }
      ]
    }
  ]
}
```

Includes break slots (empty sessions array) so the knowledge graph has the full schedule structure.

---

## Technical Considerations

### Security
- **Timing-safe key comparison** — use `crypto.timingSafeEqual()` to prevent timing attacks
- **Explicit column SELECTs** — never `SELECT *`. This prevents future columns (e.g., a `phone` field added to profiles) from being accidentally exposed
- **No CORS headers** — this is server-to-server; BonfiresAI calls from their backend, not a browser. If they need browser access later, add CORS explicitly
- **Strip `lead_email` from tracks** — same PII treatment as profile emails
- **Service role client** — `createAdminClient()` bypasses RLS, which is necessary since API key auth is separate from Supabase auth. Explicit column lists are the safety net

### Performance
- Dataset is small (~100s of records for a single event) — no pagination needed
- `Cache-Control: public, max-age=60` on all responses
- Supabase PostgREST handles joins efficiently via the `select=` syntax
- The admin client already exists; no new connections or pooling needed

### `createAdminClient()` Cookie Dependency
The existing `createAdminClient()` in `src/lib/supabase/server.ts` calls `await cookies()`, which is a Next.js function expecting a request context. This works in API routes but adds unnecessary overhead for cookie-less API-key requests. Two options:
1. **Keep as-is** — it works, cookies() returns empty in API routes, simpler to maintain one client factory
2. **Create a lightweight client** — a new `createApiClient()` that uses `@supabase/supabase-js` directly without the SSR cookie wrapper

**Recommendation:** Keep as-is for now. If it causes issues, extract a simpler client later. YAGNI.

### Query Parameter Validation
- `?include=` — validate against per-endpoint allowlist, return 400 for unknowns
- `?status=` — validate against enum (`pending`, `approved`, `rejected`, `scheduled`)
- `?day=` — validate as ISO date format (YYYY-MM-DD)
- `:id` — validate as UUID v4 format

## Acceptance Criteria

### Functional
- [x] All 10 route handlers created and returning correct data
- [x] API key auth rejects requests without valid `x-api-key` header (401)
- [x] `?include=` parameter adds nested relationships on supported endpoints
- [x] Invalid includes return 400 with error message listing valid options
- [x] Profile responses never contain `email`, `vote_credits`, or `onboarding_completed`
- [x] Track responses never contain `lead_email`
- [x] Sessions default to `approved` + `scheduled` status filter
- [x] Schedule endpoint groups by day with nested timeslots and sessions
- [x] UUID path params validated, 400 for malformed IDs
- [x] POST/PUT/DELETE/PATCH return 405

### Non-Functional
- [x] All endpoints use explicit column SELECT lists (no `SELECT *`)
- [x] API key comparison is timing-safe
- [x] `Cache-Control: public, max-age=60` on all responses
- [x] `API_KEY_BONFIRESAI` env var documented

## Dependencies & Risks

**Dependencies:**
- `API_KEY_BONFIRESAI` env var must be set in production (Vercel env vars)
- BonfiresAI needs to be given the API key and endpoint documentation

**Risks:**
- **Low:** `createAdminClient()` cookie dependency in API routes — should work but untested in this context
- **Low:** Future schema changes could add sensitive columns — mitigated by explicit column lists

## Open Questions (Deferred to v2)

- Rate limiting — defer until needed; single trusted partner, small dataset
- Pagination — dataset too small to warrant it now
- Webhooks / change notifications — BonfiresAI can poll; add webhooks if they need real-time
- `?fields=` sparse fieldsets — defer; includes are enough for now
- `?updated_since=` incremental sync — defer; full re-fetch is fast with small dataset
- `favorite_count` on sessions — requires DB trigger; defer unless BonfiresAI requests it
- OpenAPI/Swagger docs — defer; this plan + a simple README is enough for one partner

## References

- Brainstorm: `docs/brainstorms/2026-02-11-bonfiresai-read-api-brainstorm.md`
- Existing API route pattern: `src/app/api/auth/session/route.ts`
- Supabase server client: `src/lib/supabase/server.ts`
- Database schema: `supabase/migrations/20260205000000_mvp_schema.sql`
- Schema extensions: `supabase/migrations/20260205100000_ethboulder_schema_extensions.sql`
- Speaker seed data: `supabase/migrations/20260209000000_ethboulder_speaker_sessions.sql`
