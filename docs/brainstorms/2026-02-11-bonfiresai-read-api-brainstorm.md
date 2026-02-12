# BonfiresAI Read-Only API Integration

**Date:** 2026-02-11
**Status:** Brainstorm complete
**Stakeholders:** Schelling Point team, BonfiresAI team

## What We're Building

A read-only REST API (`/api/v1/*`) that exposes Schelling Point app data to BonfiresAI for building a knowledge graph. The API will live in the existing Next.js app as API routes, authenticated with a simple API key.

### Data Exposed

All public data across 6 resources (individual vote/favorite data excluded):

| Resource | Key Fields | Notes |
|----------|-----------|-------|
| **Sessions** | title, description, format, duration, host_name, topic_tags, status, total_votes, voter_count, session_type | Core content for the graph |
| **Profiles** | display_name, bio, affiliation, building, telegram, ens, interests | Excludes `email` for privacy |
| **Tracks** | name, slug, description, color, lead_name | Thematic categories |
| **Venues** | name, slug, capacity, features, style, address | Physical locations |
| **Time Slots** | start_time, end_time, label, day_date, slot_type | Schedule structure |
| **Schedule** | Combined time_slots + sessions view | Pre-joined for convenience |

### Relationships (valuable for knowledge graph)

- Session -> Host (profile)
- Session -> Track
- Session -> Venue
- Session -> Time Slot
- Profile -> Sessions (as host)
- Track -> Sessions
- Venue -> Time Slots -> Sessions

## Why This Approach

### RESTful Resource Endpoints with Optional Includes

Chosen over mega-endpoints or data dumps because:

1. **Familiar pattern** — BonfiresAI team can use standard REST tooling
2. **Flexible** — They can fetch flat tables or nested/joined data via `?include=` parameter
3. **Granular** — They only fetch what they need, reducing payload size
4. **Cacheable** — Individual resource endpoints cache well

### Authentication: Simple API Key

- Single API key stored as `API_KEY_BONFIRESAI` env var
- Passed via `x-api-key` header
- Validated in a shared middleware function
- No need for OAuth/JWT complexity for a single trusted partner

### Hosted in Existing App

- No new deployment infrastructure
- Shares existing Supabase connection (`createAdminClient()` already exists)
- API routes in `/src/app/api/v1/` directory

## Key Decisions

1. **API key auth** over OAuth/direct Supabase access — simple, secure enough for trusted partner
2. **All public profile fields** exposed (excluding email) — maximizes graph richness
3. **Both flat and nested responses** via `?include=` query parameter
4. **Next.js API routes** in existing app — no new infrastructure
5. **BonfiresAI-only scope** — one API key, no multi-tenancy needed
6. **Aggregate vote data only** — `total_votes`, `voter_count`, `total_credits` from sessions table; individual vote records are private

## API Endpoints

```
Headers: x-api-key: <BONFIRESAI_API_KEY>

GET /api/v1/sessions
GET /api/v1/sessions?include=host,track,venue,timeslot
GET /api/v1/sessions?status=approved,scheduled
GET /api/v1/sessions/:id

GET /api/v1/profiles
GET /api/v1/profiles/:id
GET /api/v1/profiles/:id?include=sessions

GET /api/v1/tracks
GET /api/v1/tracks/:id?include=sessions

GET /api/v1/venues
GET /api/v1/venues/:id

GET /api/v1/timeslots
GET /api/v1/timeslots?day=2026-02-13

GET /api/v1/schedule
GET /api/v1/schedule?day=2026-02-13
```

## Open Questions

1. **Rate limiting** — Do we need it for a single trusted partner, or defer until needed?
2. **Pagination** — The dataset is small (EthBoulder event). Probably not needed now but should we design for it?
3. **Webhook/push** — Does BonfiresAI want to be notified when data changes, or is polling sufficient?
4. **Field filtering** — Should we support `?fields=title,description` sparse fieldsets, or is include enough?
5. **API documentation** — Should we generate OpenAPI/Swagger docs, or is this brainstorm + a simple README enough?

## Implementation Notes

- Use `createAdminClient()` from `src/lib/supabase/server.ts` (bypasses RLS) for server-side queries
- Create a shared API key validation middleware
- Each route handler: validate key -> query Supabase -> shape response -> return JSON
- Exclude `email` from all profile responses at the API layer
- Return proper HTTP status codes (401 for bad key, 404 for not found, etc.)
