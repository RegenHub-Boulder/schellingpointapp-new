# Schelling Point MVP - Claude Code Instructions

## Project Overview

Multi-tenant unconference platform with quadratic voting for session selection. Users can create events, propose sessions, vote on proposals, and organizers can schedule the final program.

## Current Development Phase

**Active Work**: Multi-tenant implementation (Phases 3-8)

**Start Here**: Read `docs/IMPLEMENTATION_HANDOFF.md` for current state and next actions.

**Master Plan**: `docs/MULTI_TENANT_IMPLEMENTATION_PLAN.md` contains all task breakdowns with IDs (P1.1.1, P4.2.3, etc.)

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Styling**: Tailwind CSS + shadcn/ui
- **Email**: Resend
- **Payments**: Stripe (planned)

## Key Architectural Decisions

1. **Multi-tenant via event_id columns** - All tables scoped by event_id, not schema-per-tenant
2. **Role-based access via event_members** - Roles: owner, admin, moderator, track_lead, volunteer, attendee
3. **RLS for isolation** - Row-Level Security policies enforce event boundaries
4. **Admin client bypasses RLS** - Use `createAdminClient()` for operations needing elevated access
5. **CSS custom properties for theming** - Event themes inject via CSS variables

## Important Patterns

### Supabase Clients
```typescript
// For user-scoped operations (respects RLS)
import { createClient } from '@/lib/supabase/server'

// For admin operations (bypasses RLS) - use for APIs
import { createAdminClient } from '@/lib/supabase/server'
```

### Event Context
```typescript
// Get current event
const event = useEvent()

// Get user's role in event
const { role, isAdmin, isMember, can } = useEventRole()

// Check specific permission
if (can('approveProposals')) { ... }
```

### API Route Pattern
```typescript
export async function POST(request: Request) {
  const user = await getUserFromRequest(request)
  if (!user) return unauthorized()

  const supabase = await createAdminClient()
  // ... database operations
}
```

## File Structure

```
src/
├── app/
│   ├── create/          # Event creation wizard
│   ├── e/[slug]/        # Event pages (multi-tenant)
│   │   ├── admin/       # Event admin pages
│   │   ├── sessions/    # Session listing/detail
│   │   └── propose/     # Session proposal
│   └── api/             # API routes
├── components/          # Shared components
├── contexts/            # React contexts (EventContext)
├── hooks/               # Custom hooks (useAuth)
├── lib/                 # Utilities
│   ├── supabase/        # Supabase clients
│   ├── permissions.ts   # Role permissions
│   └── events/          # Event helpers
└── types/               # TypeScript types
```

## Common Tasks

### Create a new migration
```bash
npx supabase migration new <name>
# Edit supabase/migrations/[timestamp]_<name>.sql
npx supabase db push
```

### Add a new event-scoped table
1. Add `event_id UUID REFERENCES events(id) NOT NULL`
2. Add index on `event_id`
3. Create RLS policies checking event_members
4. Add to IMPLEMENTATION_HANDOFF.md

### Test event creation flow
1. Go to `/create`
2. Complete wizard steps
3. Verify redirect to `/e/[slug]/admin`
4. Verify owner membership in event_members

## Current Bugs/Limitations

- Private events can't receive members (no invitation system yet)
- Email templates still have hardcoded "EthBoulder" references
- No notification system yet (Phase 4)

## Don't

- Don't use `createServerClient` from `@supabase/ssr` for admin operations (doesn't bypass RLS)
- Don't forget event_id when creating new tables
- Don't hardcode event-specific values (EthBoulder, specific dates, etc.)
