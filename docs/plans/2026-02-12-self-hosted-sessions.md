# Self-Hosted Sessions Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Let proposers specify a time range + location for self-hosted sessions, make them visible in the public schedule with filtering, allow users to toggle self-hosted on their own sessions, and show a Get Directions button.

**Architecture:** Two new nullable TIMESTAMPTZ columns (`self_hosted_start_time`, `self_hosted_end_time`) on the `sessions` table. Self-hosted sessions use these columns for time instead of `time_slot_id`. The schedule page includes self-hosted `scheduled` sessions alongside venue-assigned ones, with a dedicated filter. The Edit Session modal gets a self-hosted toggle so users can convert later.

**Tech Stack:** Next.js 14, Supabase (Postgres + REST), shadcn/ui, Tailwind CSS

---

## Shared Constants

These constants are used across multiple tasks. Define them once and import or duplicate as needed.

```typescript
const EVENT_DAYS = [
  { value: '2026-02-13', label: 'Friday, Feb 13' },
  { value: '2026-02-14', label: 'Saturday, Feb 14' },
  { value: '2026-02-15', label: 'Sunday, Feb 15' },
]

const TIME_OPTIONS: { value: string; label: string }[] = []
for (let h = 9; h <= 22; h++) {
  for (const m of [0, 30]) {
    if (h === 22 && m === 30) continue
    const hh = String(h).padStart(2, '0')
    const mm = String(m).padStart(2, '0')
    const label = `${h > 12 ? h - 12 : h}:${mm} ${h >= 12 ? 'PM' : 'AM'}`
    TIME_OPTIONS.push({ value: `${hh}:${mm}`, label })
  }
}
```

Helper to combine day + time into ISO TIMESTAMPTZ (Denver timezone):
```typescript
function buildTimestamp(day: string, time: string): string {
  return `${day}T${time}:00-07:00`
}
```

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260213100003_add_self_hosted_times.sql`
- Modify: `supabase/ethboulder_full_migration.sql` (add columns to CREATE TABLE)
- Modify: `supabase/schema.sql` (add columns to CREATE TABLE)

**Step 1: Create the incremental migration**

```sql
-- Add self-hosted time range columns
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS self_hosted_start_time TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS self_hosted_end_time TIMESTAMPTZ;
```

**Step 2: Update `supabase/schema.sql`**

Add after line 70 (`custom_location TEXT,`):
```sql
  self_hosted_start_time TIMESTAMPTZ,
  self_hosted_end_time TIMESTAMPTZ,
```

**Step 3: Update `supabase/ethboulder_full_migration.sql`**

Find the sessions CREATE TABLE block and add the same two columns after `custom_location`.

**Step 4: Run migration in Supabase SQL editor**

Execute the migration SQL in the Supabase dashboard SQL editor.

**Step 5: Commit**

```bash
git add supabase/migrations/20260213100003_add_self_hosted_times.sql supabase/schema.sql supabase/ethboulder_full_migration.sql
git commit -m "feat: add self_hosted_start_time/end_time columns to sessions"
```

---

### Task 2: Proposal Form — Day/Time Pickers for Self-Hosted

**Files:**
- Modify: `src/app/propose/page.tsx`

**Context:** The proposal form already has `isSelfHosted` state, a "Self-Hosted" toggle, and a `customLocation` textarea. We need to ADD day + start/end time pickers that appear when self-hosted is selected.

**Step 1: Add state variables**

After the existing `customLocation` state (~line 76), add:
```typescript
const [selfHostedDay, setSelfHostedDay] = React.useState('')
const [selfHostedStartTime, setSelfHostedStartTime] = React.useState('')
const [selfHostedEndTime, setSelfHostedEndTime] = React.useState('')
```

**Step 2: Add EVENT_DAYS, TIME_OPTIONS constants, and buildTimestamp helper**

Add before the component (near the top of the file, after imports). Use the constants from the "Shared Constants" section above.

**Step 3: Update validation**

In the submit handler, after the existing `customLocation` validation (~line 108), add:
```typescript
if (isSelfHosted && selfHostedDay && (!selfHostedStartTime || !selfHostedEndTime)) {
  setError('Please provide both start and end times for your self-hosted session')
  return
}
```

**Step 4: Include new fields in POST payload**

In the fetch body (~line 141-142), update to:
```typescript
is_self_hosted: isSelfHosted,
custom_location: isSelfHosted ? customLocation.trim() || null : null,
self_hosted_start_time: isSelfHosted && selfHostedDay && selfHostedStartTime
  ? buildTimestamp(selfHostedDay, selfHostedStartTime) : null,
self_hosted_end_time: isSelfHosted && selfHostedDay && selfHostedEndTime
  ? buildTimestamp(selfHostedDay, selfHostedEndTime) : null,
```

**Step 5: Add day + time picker UI**

Inside the `{isSelfHosted && (` block, BEFORE the existing location textarea, add:
```tsx
{/* Day Picker */}
<div className="space-y-2 pt-2">
  <label className="text-sm font-medium">
    Which day? <span className="text-xs text-muted-foreground">(optional)</span>
  </label>
  <div className="flex flex-wrap gap-2">
    {EVENT_DAYS.map((day) => (
      <button
        key={day.value}
        type="button"
        onClick={() => setSelfHostedDay(selfHostedDay === day.value ? '' : day.value)}
        className={cn(
          'px-3 py-2 rounded-lg border text-sm transition-colors',
          selfHostedDay === day.value
            ? 'border-primary bg-primary/10 font-medium'
            : 'hover:border-muted-foreground/50'
        )}
      >
        {day.label}
      </button>
    ))}
  </div>
</div>

{/* Time Range */}
{selfHostedDay && (
  <div className="space-y-2">
    <label className="text-sm font-medium flex items-center gap-2">
      <Clock className="h-4 w-4" />
      Time Range
    </label>
    <div className="flex items-center gap-2">
      <select
        value={selfHostedStartTime}
        onChange={(e) => setSelfHostedStartTime(e.target.value)}
        className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
      >
        <option value="">Start time</option>
        {TIME_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
      <span className="text-muted-foreground">to</span>
      <select
        value={selfHostedEndTime}
        onChange={(e) => setSelfHostedEndTime(e.target.value)}
        className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm"
      >
        <option value="">End time</option>
        {TIME_OPTIONS.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>
    </div>
  </div>
)}
```

Note: `Clock` is already imported in this file.

**Step 6: Reset new state in "Propose Another" flow**

In the success reset block, add:
```typescript
setSelfHostedDay('')
setSelfHostedStartTime('')
setSelfHostedEndTime('')
```

**Step 7: Verify build**

Run: `npm run build`
Expected: builds without errors

**Step 8: Commit**

```bash
git add src/app/propose/page.tsx
git commit -m "feat: add day/time pickers for self-hosted sessions on proposal form"
```

---

### Task 3: Edit Session Modal — Self-Hosted Toggle

**Files:**
- Modify: `src/components/EditSessionModal.tsx`

**Context:** The edit modal currently has no self-hosted controls. We need to add a toggle that lets users convert their session to self-hosted (or back) and set day/time/location.

**Step 1: Expand the session prop interface**

Update `EditSessionModalProps.session` to include self-hosted fields:
```typescript
session: {
  id: string
  title: string
  description: string | null
  format: string
  topic_tags: string[] | null
  track_id?: string | null
  is_self_hosted?: boolean
  custom_location?: string | null
  self_hosted_start_time?: string | null
  self_hosted_end_time?: string | null
}
```

**Step 2: Add state variables and constants**

Add EVENT_DAYS, TIME_OPTIONS, and buildTimestamp at the top of the file (same as Task 2).

Add a helper to parse existing timestamps back to day + time:
```typescript
function parseTimestamp(iso: string | null | undefined): { day: string; time: string } {
  if (!iso) return { day: '', time: '' }
  const d = new Date(iso)
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const dayNum = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return { day: `${year}-${month}-${dayNum}`, time: `${hh}:${mm}` }
}
```

Inside the component, add state:
```typescript
const [isSelfHosted, setIsSelfHosted] = React.useState(session.is_self_hosted || false)
const [customLocation, setCustomLocation] = React.useState(session.custom_location || '')
const [selfHostedDay, setSelfHostedDay] = React.useState(() => parseTimestamp(session.self_hosted_start_time).day)
const [selfHostedStartTime, setSelfHostedStartTime] = React.useState(() => parseTimestamp(session.self_hosted_start_time).time)
const [selfHostedEndTime, setSelfHostedEndTime] = React.useState(() => parseTimestamp(session.self_hosted_end_time).time)
```

Update the `useEffect` reset block to include these new fields.

**Step 3: Include self-hosted fields in PATCH body**

In `handleSave`, update `patchBody` to include:
```typescript
is_self_hosted: isSelfHosted,
custom_location: isSelfHosted ? customLocation.trim() || null : null,
self_hosted_start_time: isSelfHosted && selfHostedDay && selfHostedStartTime
  ? buildTimestamp(selfHostedDay, selfHostedStartTime) : null,
self_hosted_end_time: isSelfHosted && selfHostedDay && selfHostedEndTime
  ? buildTimestamp(selfHostedDay, selfHostedEndTime) : null,
```

If switching TO self-hosted, also clear venue/timeslot:
```typescript
if (isSelfHosted) {
  patchBody.venue_id = null
  patchBody.time_slot_id = null
}
```

**Step 4: Add self-hosted toggle UI**

Add AFTER the Track section and BEFORE the Tags section. Import `MapPin` and `Clock` from lucide-react:

```tsx
{/* Self-Hosted Toggle */}
<div className="space-y-3">
  <label className="text-sm font-medium">Hosting</label>
  <div className="grid grid-cols-2 gap-2">
    <button
      type="button"
      onClick={() => setIsSelfHosted(false)}
      className={cn(
        'p-3 rounded-lg border text-left transition-colors',
        !isSelfHosted
          ? 'border-primary bg-primary/10'
          : 'hover:border-muted-foreground/50'
      )}
    >
      <div className="font-medium text-sm">Official Venue</div>
      <div className="text-xs text-muted-foreground">Assigned by admin</div>
    </button>
    <button
      type="button"
      onClick={() => setIsSelfHosted(true)}
      className={cn(
        'p-3 rounded-lg border text-left transition-colors',
        isSelfHosted
          ? 'border-primary bg-primary/10'
          : 'hover:border-muted-foreground/50'
      )}
    >
      <div className="font-medium text-sm">Self-Hosted</div>
      <div className="text-xs text-muted-foreground">Your own location</div>
    </button>
  </div>

  {isSelfHosted && (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      {/* Day Picker */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Day</label>
        <div className="flex flex-wrap gap-1.5">
          {EVENT_DAYS.map((day) => (
            <button
              key={day.value}
              type="button"
              onClick={() => setSelfHostedDay(selfHostedDay === day.value ? '' : day.value)}
              className={cn(
                'px-2.5 py-1.5 rounded-md border text-xs transition-colors',
                selfHostedDay === day.value
                  ? 'border-primary bg-primary/10 font-medium'
                  : 'hover:border-muted-foreground/50'
              )}
            >
              {day.label}
            </button>
          ))}
        </div>
      </div>

      {/* Time Range */}
      {selfHostedDay && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Time Range</label>
          <div className="flex items-center gap-2">
            <select
              value={selfHostedStartTime}
              onChange={(e) => setSelfHostedStartTime(e.target.value)}
              className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">Start</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">to</span>
            <select
              value={selfHostedEndTime}
              onChange={(e) => setSelfHostedEndTime(e.target.value)}
              className="flex-1 rounded-md border bg-background px-2 py-1.5 text-sm"
            >
              <option value="">End</option>
              {TIME_OPTIONS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Location */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Location / Address</label>
        <Textarea
          value={customLocation}
          onChange={(e) => setCustomLocation(e.target.value)}
          placeholder="Address or directions for attendees..."
          rows={2}
          maxLength={300}
        />
      </div>
    </div>
  )}
</div>
```

**Step 5: Pass self-hosted fields from SessionDetailClient**

In `src/app/sessions/[id]/SessionDetailClient.tsx`, find where `<EditSessionModal>` is rendered and ensure the `session` prop includes:
```typescript
session={{
  id: session.id,
  title: session.title,
  description: session.description,
  format: session.format,
  topic_tags: session.topic_tags,
  track_id: session.track?.id || null,
  is_self_hosted: session.is_self_hosted,
  custom_location: session.custom_location,
  self_hosted_start_time: session.self_hosted_start_time,
  self_hosted_end_time: session.self_hosted_end_time,
}}
```

**Step 6: Verify build**

Run: `npm run build`

**Step 7: Commit**

```bash
git add src/components/EditSessionModal.tsx src/app/sessions/[id]/SessionDetailClient.tsx
git commit -m "feat: add self-hosted toggle with day/time/location to edit session modal"
```

---

### Task 4: Session Detail — Get Directions + Time Range

**Files:**
- Modify: `src/app/sessions/[id]/SessionDetailClient.tsx`

**Context:** The session detail page already shows a "Self-Hosted Location" section (~line 742-758) but lacks the Get Directions button and time range display.

**Step 1: Add time range display**

Inside the self-hosted branch of the venue card (~line 748, after the Badge), add:
```tsx
{session.self_hosted_start_time && (
  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
    <Clock className="h-4 w-4" />
    <span>
      {new Date(session.self_hosted_start_time).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
      {' '}
      {new Date(session.self_hosted_start_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
      {session.self_hosted_end_time && (
        <> – {new Date(session.self_hosted_end_time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</>
      )}
    </span>
  </div>
)}
```

**Step 2: Add Get Directions button**

After the `custom_location` paragraph (~line 752), add:
```tsx
{session.custom_location && (
  <a
    href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(session.custom_location)}`}
    target="_blank"
    rel="noopener noreferrer"
    className="inline-flex items-center gap-1.5 mt-2 px-3 py-1.5 text-sm font-medium rounded-md border hover:bg-accent transition-colors"
  >
    <MapPin className="h-3.5 w-3.5" />
    Get Directions
  </a>
)}
```

This matches the exact pattern used for venue Get Directions (~line 773-780).

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/app/sessions/[id]/SessionDetailClient.tsx
git commit -m "feat: add Get Directions button and time range to self-hosted session detail"
```

---

### Task 5: Schedule Page — Include Self-Hosted Sessions + Filter

**Files:**
- Modify: `src/app/schedule/page.tsx`

**Context:** Currently this page only shows venue-assigned scheduled sessions. Self-hosted sessions are completely invisible. We need to:
1. Fetch self-hosted fields
2. Include self-hosted sessions in the display
3. Add a "Self-Hosted" filter toggle
4. Show self-hosted sessions grouped by their time in time-view, and under a "Self-Hosted" group in venue-view

**Step 1: Update the Session interface**

Add to the Session interface:
```typescript
is_self_hosted?: boolean
custom_location?: string | null
self_hosted_start_time?: string | null
self_hosted_end_time?: string | null
```

**Step 2: Update the fetch query**

Change the sessions fetch URL select to include the new fields:
```
sessions?status=eq.scheduled&select=id,title,description,format,duration,host_name,is_self_hosted,custom_location,self_hosted_start_time,self_hosted_end_time,venue:venues(name),time_slot:time_slots(id,label,start_time,end_time),track:tracks(id,name,color)
```

**Step 3: Add filter state**

Add alongside `trackFilter`:
```typescript
const [showSelfHosted, setShowSelfHosted] = React.useState(true)
```

**Step 4: Update filtering logic**

Replace the `filteredSessions` useMemo to handle self-hosted sessions:
```typescript
const filteredSessions = React.useMemo(() => {
  let filtered = sessions.filter((session) => {
    // Self-hosted sessions use self_hosted_start_time for day grouping
    if (session.is_self_hosted) {
      if (!showSelfHosted) return false
      if (!session.self_hosted_start_time) return false
      const slotDate = getDateKey(session.self_hosted_start_time)
      if (slotDate !== selectedDay) return false
    } else {
      if (!session.time_slot) return false
      const slotDate = getDateKey(session.time_slot.start_time)
      if (slotDate !== selectedDay) return false
    }
    if (trackFilter !== 'all' && session.track?.id !== trackFilter) return false
    return true
  })
  if (search) {
    const searchLower = search.toLowerCase()
    filtered = filtered.filter(
      (s) =>
        s.title.toLowerCase().includes(searchLower) ||
        s.description?.toLowerCase().includes(searchLower) ||
        s.host_name?.toLowerCase().includes(searchLower)
    )
  }
  return filtered
}, [sessions, selectedDay, trackFilter, showSelfHosted, search])
```

**Step 5: Update sessionsBySlot to handle self-hosted**

Self-hosted sessions don't have a time_slot. We'll create a synthetic group for them. Update the `sessionsBySlot` memo:
```typescript
const sessionsBySlot = React.useMemo(() => {
  const grouped: Record<string, Session[]> = {}
  filteredSessions.forEach((session) => {
    if (session.is_self_hosted) {
      // Group self-hosted under a synthetic key
      const key = 'self-hosted'
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(session)
    } else if (session.time_slot) {
      const slotId = session.time_slot.id
      if (!grouped[slotId]) grouped[slotId] = []
      grouped[slotId].push(session)
    }
  })
  return grouped
}, [filteredSessions])
```

**Step 6: Update sessionsByVenue to handle self-hosted**

In the venue-sort memo, use "Self-Hosted" as the venue name for self-hosted sessions:
```typescript
const venueName = session.is_self_hosted ? 'Self-Hosted' : (session.venue?.name || 'Unassigned')
```

**Step 7: Add Self-Hosted filter toggle**

In the controls area, after the sort toggle buttons and before the track filter, add:
```tsx
<button
  onClick={() => setShowSelfHosted(!showSelfHosted)}
  className={cn(
    'px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1.5 min-h-[36px] border',
    showSelfHosted
      ? 'bg-orange-500/10 border-orange-500/50 text-orange-700 dark:text-orange-400'
      : 'border-border text-muted-foreground hover:bg-muted'
  )}
>
  <MapPin className="h-3.5 w-3.5" />
  Self-Hosted
</button>
```

**Step 8: Render self-hosted group in time view**

After rendering the `filteredSlots.map(...)` block, render the self-hosted group:
```tsx
{/* Self-hosted sessions (no time slot) */}
{sessionsBySlot['self-hosted'] && sessionsBySlot['self-hosted'].length > 0 && (
  <div>
    <div className="sticky top-[104px] z-10 bg-background/95 backdrop-blur-sm py-1.5 -mx-4 px-4 sm:mx-0 sm:px-0 mb-2">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-orange-600 dark:text-orange-400 font-semibold text-sm">
          <MapPin className="h-3.5 w-3.5" />
          <span>Self-Hosted</span>
        </div>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {sessionsBySlot['self-hosted'].map((session) => (
        <Link key={session.id} href={`/sessions/${session.id}`}>
          <Card className="h-full card-hover border-orange-500/30 hover:border-orange-500/50">
            <CardContent className="p-3">
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-snug line-clamp-2 flex-1">{session.title}</h3>
                  <Badge variant="secondary" className="text-[10px] bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/30 flex-shrink-0">
                    Self-Hosted
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {session.self_hosted_start_time && (
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3 flex-shrink-0" />
                      <span>{formatTime(session.self_hosted_start_time)}</span>
                    </div>
                  )}
                  {session.host_name && (
                    <div className="flex items-center gap-1 truncate">
                      <User className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{session.host_name}</span>
                    </div>
                  )}
                  {session.custom_location && (
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{session.custom_location}</span>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  </div>
)}
```

**Step 9: Verify build**

Run: `npm run build`

**Step 10: Commit**

```bash
git add src/app/schedule/page.tsx
git commit -m "feat: show self-hosted sessions in schedule with filter toggle"
```

---

### Task 6: SessionCard — Self-Hosted Time/Location Display

**Files:**
- Modify: `src/components/SessionCard.tsx`

**Context:** The SessionCard already shows a "Self-Hosted" badge (~line 175-178) but doesn't show the time or location. Add the self-hosted time display.

**Step 1: Add fields to the session interface**

Add to the Session interface in SessionCard:
```typescript
self_hosted_start_time?: string | null
self_hosted_end_time?: string | null
```

**Step 2: Show time for self-hosted sessions**

In the scheduled info section (~line 171-190), update the self-hosted branch to show time:
```tsx
{session.is_self_hosted ? (
  <span className="flex items-center gap-1">
    <Badge variant="secondary" className="text-xs">Self-Hosted</Badge>
    {session.custom_location && (
      <span className="truncate text-xs">{session.custom_location}</span>
    )}
  </span>
) : session.venue ? (
  <span>{session.venue.name}</span>
) : null}
```

And for the time display (~line 183-188), also show self-hosted time:
```tsx
{(session.time_slot?.start_time || session.self_hosted_start_time) && (
  <div className="flex items-center gap-1.5">
    <Clock className="h-4 w-4" />
    <span>{formatTime(session.time_slot?.start_time || session.self_hosted_start_time!)}</span>
  </div>
)}
```

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/components/SessionCard.tsx
git commit -m "feat: show self-hosted time and location on SessionCard"
```

---

### Task 7: API Routes — Include New Fields

**Files:**
- Modify: `src/app/api/v1/sessions/route.ts`
- Modify: `src/app/api/v1/sessions/[id]/route.ts`

**Step 1: Update SESSION_FIELDS in the list route**

Add `self_hosted_start_time,self_hosted_end_time` to the SESSION_FIELDS string.

**Step 2: Update SESSION_DETAIL_SELECT in the detail route**

Add `self_hosted_start_time,self_hosted_end_time` to the first string in the array.

**Step 3: Verify build**

Run: `npm run build`

**Step 4: Commit**

```bash
git add src/app/api/v1/sessions/route.ts src/app/api/v1/sessions/[id]/route.ts
git commit -m "feat: include self-hosted time fields in API session responses"
```

---

## Verification Checklist

1. Run `npm run build` — should pass with no errors
2. Run migration in Supabase SQL editor
3. `/propose` — select Self-Hosted, verify day chips + time dropdowns appear
4. Submit a self-hosted session with day/time/location
5. As admin, approve and schedule the self-hosted session
6. `/schedule` — verify self-hosted session appears with orange styling
7. Click "Self-Hosted" toggle — verify filter works
8. Click into self-hosted session detail — verify time range and Get Directions button
9. As session host, open Edit Session — verify self-hosted toggle, day/time/location fields
10. Toggle a non-self-hosted session to self-hosted, save, verify changes persist
