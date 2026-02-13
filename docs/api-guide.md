# Schelling Point API Guide

Read-only REST API for accessing Schelling Point event data.

**Base URL:** `https://schellingpoint.app/api/v1`

## Authentication

All requests require an API key passed via the `x-api-key` header.

```bash
curl -H "x-api-key: YOUR_API_KEY" https://schellingpoint.app/api/v1/sessions
```

Missing or invalid keys return `401 Unauthorized`.

## Response Format

**Success (list):**
```json
{
  "data": [ ... ],
  "count": 42
}
```

**Success (single resource):**
```json
{
  "data": { ... }
}
```

**Error:**
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "Session not found"
  }
}
```

**Status codes:** `200` success, `400` bad request, `401` unauthorized, `404` not found, `405` method not allowed.

All responses include `Cache-Control: public, max-age=60`.

---

## Endpoints

### Sessions

Sessions are proposals, talks, workshops, and other scheduled activities.

**List sessions**
```
GET /api/v1/sessions
```

Returns approved and scheduled sessions by default, ordered by vote count (descending).

| Param | Example | Description |
|-------|---------|-------------|
| `include` | `host,track,venue,timeslot` | Embed related objects (comma-separated) |
| `status` | `approved,scheduled` | Filter by status (comma-separated). Valid: `pending`, `approved`, `rejected`, `scheduled` |

**Example — sessions with all relationships:**
```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/sessions?include=host,track,venue,timeslot"
```

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "title": "Zero-Knowledge Proofs for Identity",
      "description": "An exploration of ZK-based identity solutions...",
      "format": "talk",
      "duration": 30,
      "host_name": "Alice Smith",
      "topic_tags": ["privacy", "identity", "zk-proofs"],
      "status": "scheduled",
      "is_self_hosted": false,
      "custom_location": null,
      "session_type": "curated",
      "is_votable": true,
      "total_votes": 12,
      "total_credits": 48,
      "voter_count": 8,
      "host_id": "...",
      "venue_id": "...",
      "time_slot_id": "...",
      "track_id": "...",
      "created_at": "2026-02-09T00:00:00+00:00",
      "updated_at": "2026-02-09T00:00:00+00:00",
      "host": {
        "id": "...",
        "display_name": "Alice Smith",
        "bio": "Cryptography researcher...",

        "affiliation": "EFF",
        "building": "Privacy Tech",
        "telegram": "@alice",
        "ens": "alice.eth",
        "interests": ["privacy", "cryptography"]
      },
      "track": {
        "id": "...",
        "name": "Privacy & Security",
        "slug": "privacy-security",
        "color": "#8B5CF6"
      },
      "venue": {
        "id": "...",
        "name": "Main Hall",
        "slug": "main-hall"
      },
      "time_slot": {
        "id": "...",
        "start_time": "2026-02-13T10:00:00-07:00",
        "end_time": "2026-02-13T10:30:00-07:00",
        "label": "Morning Session 1",
        "is_break": false,
        "day_date": "2026-02-13",
        "slot_type": "session"
      }
    }
  ],
  "count": 1
}
```

**Note:** `host` will be `null` for curated sessions that don't have a linked profile — check `host_name` on the session itself for the speaker name.

Without `?include=`, the response contains only the flat session fields (no nested `host`, `track`, `venue`, or `time_slot` objects).

---

**Get session by ID**
```
GET /api/v1/sessions/:id
```

Returns a single session with all relationships embedded (host, track, venue, time_slot). No `?include=` needed.

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/sessions/550e8400-e29b-41d4-a716-446655440000"
```

---

### Profiles

Participants and speakers.

**List profiles**
```
GET /api/v1/profiles
```

Returns all profiles ordered by display name.

**Fields returned:**
`id`, `display_name`, `bio`, `affiliation`, `building`, `telegram`, `ens`, `interests`, `is_admin`, `created_at`

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/profiles"
```

---

**Get profile by ID**
```
GET /api/v1/profiles/:id
```

| Param | Example | Description |
|-------|---------|-------------|
| `include` | `sessions` | Embed the sessions this person is hosting |

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/profiles/PROFILE_UUID?include=sessions"
```

```json
{
  "data": {
    "id": "...",
    "display_name": "Alice Smith",
    "bio": "Cryptography researcher...",
    "affiliation": "EFF",
    "interests": ["privacy", "cryptography"],
    "is_admin": false,
    "sessions": [
      {
        "id": "...",
        "title": "Zero-Knowledge Proofs for Identity",
        "format": "talk",
        "status": "scheduled",
        "total_votes": 12
      }
    ]
  }
}
```

---

### Tracks

Thematic categories that group sessions (e.g., Privacy, DeSci, Public Goods Funding).

**List tracks**
```
GET /api/v1/tracks
```

**Fields returned:**
`id`, `name`, `slug`, `description`, `color`, `lead_name`, `is_active`, `created_at`

---

**Get track by ID**
```
GET /api/v1/tracks/:id
```

| Param | Example | Description |
|-------|---------|-------------|
| `include` | `sessions` | Embed the sessions in this track |

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/tracks/TRACK_UUID?include=sessions"
```

---

### Venues

Physical locations where sessions take place.

**List venues**
```
GET /api/v1/venues
```

**Fields returned:**
`id`, `name`, `slug`, `capacity`, `features`, `style`, `address`, `notes`, `is_primary`, `created_at`

---

**Get venue by ID**
```
GET /api/v1/venues/:id
```

| Param | Example | Description |
|-------|---------|-------------|
| `include` | `timeslots` | Embed the time slots assigned to this venue |

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/venues/VENUE_UUID?include=timeslots"
```

---

### Time Slots

Schedule blocks that sessions are assigned to. Each time slot belongs to a venue.

**List time slots**
```
GET /api/v1/timeslots
```

| Param | Example | Description |
|-------|---------|-------------|
| `day` | `2026-02-13` | Filter to a specific day (YYYY-MM-DD) |
| `include` | `venue` | Embed the venue object |

**Fields returned:**
`id`, `start_time`, `end_time`, `label`, `is_break`, `day_date`, `slot_type`, `venue_id`, `created_at`

`slot_type` values: `session`, `break`, `checkin`, `unconference`, `track`

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/timeslots?day=2026-02-13&include=venue"
```

---

### Schedule

Pre-joined composite view — time slots grouped by day with their venues and sessions. This is the most useful endpoint for building a complete event schedule.

**Get schedule**
```
GET /api/v1/schedule
```

| Param | Example | Description |
|-------|---------|-------------|
| `day` | `2026-02-13` | Filter to a specific day (YYYY-MM-DD) |

```bash
curl -H "x-api-key: YOUR_API_KEY" \
  "https://schellingpoint.app/api/v1/schedule?day=2026-02-13"
```

```json
{
  "data": [
    {
      "day": "2026-02-13",
      "slots": [
        {
          "id": "...",
          "start_time": "2026-02-13T09:00:00-07:00",
          "end_time": "2026-02-13T09:30:00-07:00",
          "label": "Check-in & Coffee",
          "is_break": true,
          "slot_type": "checkin",
          "venue": { "id": "...", "name": "Main Hall", "slug": "main-hall" },
          "sessions": []
        },
        {
          "id": "...",
          "start_time": "2026-02-13T10:00:00-07:00",
          "end_time": "2026-02-13T10:30:00-07:00",
          "label": "Morning Session 1",
          "is_break": false,
          "slot_type": "session",
          "venue": { "id": "...", "name": "Main Hall", "slug": "main-hall" },
          "sessions": [
            {
              "id": "...",
              "title": "Zero-Knowledge Proofs for Identity",
              "description": "An exploration of ZK-based identity solutions...",
              "format": "talk",
              "duration": 30,
              "host_name": "Alice Smith",
              "status": "scheduled",
              "session_type": "curated",
              "total_votes": 12,
              "time_slot_id": "...",
              "track": {
                "id": "...",
                "name": "Privacy & Security",
                "color": "#8B5CF6"
              }
            }
          ]
        }
      ]
    }
  ]
}
```

Break slots are included with an empty `sessions` array so you have the full schedule structure.

---

## Data Model Relationships

```
Profile --hosts--> Session
Track   --groups-> Session
Venue   --has----> Time Slot --assigned--> Session
```

- A **session** belongs to one track, one venue, and one time slot
- A **profile** can host multiple sessions
- A **venue** has multiple time slots across multiple days
- A **track** groups multiple sessions by theme
- **Vote data** is aggregated on sessions: `total_votes`, `total_credits`, `voter_count`

## Enum Values

| Field | Values |
|-------|--------|
| `session.format` | `talk`, `workshop`, `discussion`, `panel`, `demo`, `fireside`, `ceremony` |
| `session.status` | `pending`, `approved`, `rejected`, `scheduled` |
| `session.session_type` | `curated`, `proposed`, `workshop`, `track_reserved` |
| `time_slot.slot_type` | `session`, `break`, `checkin`, `unconference`, `track` |

## Suggested Sync Strategy

For building a knowledge graph, we recommend:

1. **Initial sync:** Call each list endpoint once to pull all data. Use `?include=` on sessions to get relationships in one pass.
2. **Incremental refresh:** Poll the sessions endpoint periodically (e.g., every 5 minutes) to pick up new proposals, status changes, and vote count updates.
3. **Schedule is read-only:** The schedule changes infrequently (only when organizers assign sessions to time slots), so polling less often is fine.

Responses are cached for 60 seconds, so polling more frequently than once per minute won't yield new data.
