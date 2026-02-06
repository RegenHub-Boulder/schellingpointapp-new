# Supabase Database Schema

## Core Tables (15 total)

### Users & Events
1. **users** - User profiles
   - Primary key: id (uuid)
   - email (unique, not null), smart_wallet_address (unique, not null)
   - display_name, bio, avatar_url
   - ens_address, payout_address
   - topics array
   - created_at, updated_at
   - NOTE: passkey columns (pubkey_x, pubkey_y, credential_id, invite_code) were removed in migrations 013-014

1b. **user_passkeys** - WebAuthn passkey credentials (1:M with users)
   - Primary key: id (uuid)
   - user_id (FK → users.id, CASCADE delete)
   - pubkey_x, pubkey_y (secp256r1 coordinates)
   - credential_id (unique, base64url WebAuthn credential)
   - created_at
   - Unique constraints: (credential_id), (pubkey_x, pubkey_y)
   - Indexes: idx_user_passkeys_pubkey, idx_user_passkeys_credential_id, idx_user_passkeys_user_id

2. **events** - Event metadata
   - slug, dates, access control
   - voting credits configs
   - budget pool, treasury address

3. **event_access** - Access control per user per event
   - is_admin, checked_in, burner_card_id

### Sessions
4. **sessions** - Session proposals
   - Status workflow: pending→approved→rejected/merged/scheduled
   - venue/time slot references

5. **session_hosts** - Many-to-many hosts
   - is_primary flag, invitation status

6. **venues** - Rooms/spaces with capacity and features

7. **time_slots** - Time blocks for scheduling

### Voting & Stats
8. **attestations** - Indexes EAS on-chain attestations
   - uid, schema_uid, attester_address
   - data as JSONB

9. **session_pre_vote_stats** - Aggregated pre-vote data
   - total_votes, total_voters
   - vote_distribution JSONB

10. **user_pre_vote_balance** - Per-user pre-vote credit tracking
    - event_id, user_id compound unique

11. **voter_overlap** - Scheduling algorithm input
    - shared_voters % between session pairs

12. **session_attendance_stats** - Aggregated attendance votes with QF scores

13. **user_attendance_balance** - Per-user attendance credit tracking

### Distribution & Mergers
14. **distributions** - Budget distribution batches
    - status: pending/processing/completed/failed

15. **distribution_items** - Individual payouts to hosts
    - amount, qf_score, percentage, recipient_address

16. **merger_requests** - Session merge proposals with counter-proposal support

## Passkey Migrations
- Migration 010: Added passkey columns to users table (initial)
- Migration 012: Created separate `user_passkeys` table (1:M)
- Migration 013: Dropped passkey columns from users table (pubkey_x, pubkey_y, credential_id)
- Migration 014: Dropped invite_code from users table

## RLS Policies
- Users: Everyone views, users update own profile
- Events: Everyone views, admins only modify
- Sessions: Participants view, hosts/admins modify
- Votes: Aggregates visible, individual votes private
- Event access: User-scoped visibility

## Migration Files
Located in `/supabase/migrations/` (migrations 001-014)
