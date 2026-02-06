### [14:38] [architecture] Authentication System Comparison: Main vs Feature Branch
**Details**: ## Main Branch (Supabase Email OTP)
**Authentication Approach**: Traditional OAuth/Email magic links via Supabase
- Uses `@supabase/supabase-js` for authentication
- Sign-in flow: Email → OTP magic link → `/auth/callback?code=...` → session established
- Session managed by Supabase built-in auth (`supabase.auth.getSession()`, `onAuthStateChange()`)
- Context: `src/context/auth-context.tsx` (singular "context")
- Location: `src/contexts/AuthContext.tsx` provides user/session state only
- AuthModal: Multi-step choose → email/wallet → email-sent → success
- Auth callback: Exchanges Supabase code for session via `exchangeCodeForSession()`
- No JWT, no blockchain interaction, stateless frontend
- Hooks: use-event, use-favorites, use-participants, etc. (domain-specific)

## Feature Branch (Passkey + Blockchain + JWT)
**Authentication Approach**: WebAuthn passkeys + ephemeral blockchain signers + JWT
- Three-gate security model:
  1. Gate 1: Database passkey validation (`getUserByPasskey`)
  2. Gate 2: On-chain signer authorization (`contract.signers()`)
  3. Gate 3: Voting requires both gates + ephemeral signer signing
- Registration: Create passkey via WebAuthn → register with backend → stores pubkey_x/y
- Session: Authorize ephemeral signer (7-day expiry) via passkey Face ID → get JWT
- Voting: Uses ephemeral signer to sign votes (no additional Face ID needed)
- Context: `src/contexts/AuthContext.tsx` (plural "contexts") - manages JWT + signer state
- Includes: `src/lib/jwt.ts` for JWT signing/verification using jose library
- Login Page: Recovers passkey via discoverable credentials OR uses localStorage
- Register Page: Creates passkey → registers → completes auth flow
- Key Hooks: `useAuth()` (from context), `useAuthFlow()` (three-step: recover/authorize/login)
- localStorage Storage: passkeyInfo (credentialId, userId, pubKeyX, pubKeyY), sessionKey (privateKey, address, expiry), authToken (JWT)
- API Routes: /api/register, /api/authorize, /api/login, /api/login/challenge, /api/auth/me, /api/auth/lookup

## Key Differences

### Authentication Storage
- Main: Supabase session (HTTP cookies via SDK)
- Feature: localStorage (passkeyInfo + sessionKey + authToken JWT) + NO cookies/middleware

### Authorization Model
- Main: Supabase JWT from OTP verification
- Feature: Custom JWT containing passkey coords + signer address/expiry

### Blockchain Integration
- Main: None
- Feature: Full integration - authorizeSigner() + vote() contract calls

### Pages
- Main: `/app/auth/callback` (handles magic link exchange)
- Feature: `/app/login` and `/app/register` (full passkey flows)

### Context API
- Main: Simple context with signInWithEmail/signOut methods
- Feature: Complex context with login/logout/refreshUser, tracks token + signerAddress + signerExpiry

### Hooks
- Main: useAuth hook only (provides user/session/methods)
- Feature: useAuth (context export) + useAuthFlow (multi-step orchestration)

## Merge Implications

To merge main → feature/passkey-auth-voting:
1. Main's Supabase auth pages won't be used (would conflict with /app/login, /app/register)
2. Main's auth callback route won't be used (passkey flow is different)
3. Main's simple auth modal would need to be adapted or deprecated
4. Main's domain-specific hooks (use-events, use-votes) should remain unaffected (different directories)
5. Main's AuthProvider pattern differs significantly - feature has stronger state management with JWT tracking

To merge feature → main:
1. Replace email OTP with passkey auth (breaking change for existing users)
2. Add blockchain contract interaction (new dependency: ethers, simplewebauthn)
3. Remove Supabase auth SDK usage, replace with custom JWT + localStorage
4. Migrate from simple session-based to complex passkey + ephemeral signer model
5. Add new API routes for blockchain interaction (/api/authorize, /api/login challenge pattern)

## Migration Path Recommendation
Keep both auth systems separate during merge:
- Feature branch keeps all passkey auth in `/app/login`, `/app/register`
- Main's email OTP auth could stay in `/app/auth` (different URL space)
- Use a URL parameter or environment variable to switch between auth modes
- Eventually deprecate one authentication method
**Files**: src/contexts/AuthContext.tsx, src/app/login/page.tsx, src/app/register/page.tsx, src/app/api/authorize/route.ts, src/app/api/login/route.ts, src/lib/jwt.ts, src/hooks/useAuthFlow.ts
---

### [22:52] [database] Supabase Database Schema - Current State (13 Tables)
**Details**: Complete schema with 13 tables organized by domain:

USERS & IDENTITY:
- users: Core profile (id, email, display_name, bio, avatar_url, topics[], payout_address, ens_address, invite_code, created_at, updated_at)
- user_passkeys: WebAuthn passkey storage supporting multiple keys per user (id, user_id, pubkey_x, pubkey_y, credential_id, created_at)
  - Indexes: (pubkey_x, pubkey_y), (credential_id), (user_id)
  - Constraints: unique pubkey pair, unique credential_id per user
  - Migration history: Originally in users table (migrations 010-012), then dropped (migration 013)

EVENTS:
- events: Event config (slug, name, description, start_date, end_date, location, banner_image_url, access_mode, nft_contract_address, nft_chain_id, pre_vote_credits=100, attendance_vote_credits=100, proposal_deadline, pre_vote_deadline, voting_opens_at, total_budget_pool, payment_token_address, platform_fee_percent=5%, treasury_wallet_address, schedule_published, schedule_locked, distribution_executed, created_at, updated_at)
- event_access: User access control (event_id, user_id, email, wallet_address, access_granted, is_admin, checked_in, checked_in_at, burner_card_id, created_at; unique constraint on event_id+user_id)

SCHEDULING:
- venues: Physical spaces (event_id, name, capacity, features[], description, display_order, created_at)
- time_slots: Time blocks (event_id, start_time, end_time, is_available, label, display_order, created_at)

SESSIONS:
- sessions: Session proposals (event_id, title, description, format['talk'|'workshop'|'discussion'|'panel'|'demo'], duration, max_participants, technical_requirements[], topic_tags[], status['pending'|'approved'|'rejected'|'merged'|'scheduled'], rejection_reason, merged_into_session_id, venue_id, time_slot_id, is_locked, created_at, updated_at)
- session_hosts: Hosts M:M relationship (session_id, user_id, is_primary, status['pending'|'accepted'|'declined'], created_at; unique session_id+user_id)

VOTING & STATS (Pre-Event):
- session_pre_vote_stats: Aggregated pre-votes (session_id, total_votes, total_voters, total_credits_spent, vote_distribution JSONB, last_updated; unique session_id)
- user_pre_vote_balance: Per-user pre-vote tracking (event_id, user_id, credits_spent, credits_remaining=100, last_updated; unique event_id+user_id)
- voter_overlap: Scheduling algorithm input (event_id, session_a_id, session_b_id, shared_voters, overlap_percentage, last_calculated; unique event_id+session_a+session_b)

VOTING & STATS (Attendance):
- session_attendance_stats: Aggregated attendance votes (session_id, total_votes, total_voters, total_credits_spent, qf_score, vote_distribution JSONB, last_updated; unique session_id)
- user_attendance_balance: Per-user attendance tracking (event_id, user_id, credits_spent, credits_remaining=100, sessions_voted_count, last_updated; unique event_id+user_id)

MERGERS & DISTRIBUTION:
- merger_requests: Session merge proposals (event_id, requesting_session_id, target_session_id, requested_by_user_id, status['pending'|'accepted'|'declined'|'admin_suggested'], message, response_message, created_at, responded_at; unique requesting+target sessions)
- distributions: QF distribution batches (event_id, total_pool, platform_fee, distributable_amount, tx_hash, status['pending'|'executing'|'completed'|'failed'], executed_at, created_at)
- distribution_items: Individual payouts (distribution_id, session_id, recipient_address, amount, qf_score, percentage, created_at)

ATTESTATIONS (Optional, not yet used):
- attestations: EAS on-chain indexing (attestation_uid, schema_uid, attester_address, recipient_address, event_id, session_id, attestation_type, data JSONB, tx_hash, block_number, created_at, indexed_at; indexes on event, session, attester, type, uid, block_number)

RLS POLICIES:
- Users: Public viewable, self-update only
- Events: Public viewable, admin-only modify
- Sessions: Viewable by event participants, hosts/admins modify, hosts delete pending-only
- Voting stats: Viewable by participants, service-role manages
- User balances: User views own only, service-role manages
- Voter overlap: Admin-only view
- Distributions: Participants view, admins manage
- Helper functions: is_event_admin(), has_event_access(), is_session_host()

TypeScript generation: Autogenerated types in src/types/supabase.ts from Supabase schema
**Files**: supabase/migrations/20251218163708_001_users.sql, 20251218205721_010_passkey_auth.sql, 20251219120000_012_user_passkeys.sql, 20251219130000_013_drop_user_passkey_columns.sql, src/lib/db/users.ts, src/types/supabase.ts
---

### [00:28] [architecture] Smart Contract Architecture - No Test Suite
**Details**: The SchellingPointVotes contract is a complete Solidity implementation, but currently has NO test directory in /workspace/project/contracts/test/. The QUICKSTART.md mentions "Comprehensive test suite (9 passing tests)" but no test files exist in the contracts directory. This appears to be a documentation inconsistency - test files may have been planned but not yet created. The contract is production-ready with deployment scripts and has been deployed multiple times (broadcast history shows deployments to Base Sepolia chain 84532).
**Files**: contracts/foundry.toml, contracts/src/SchellingPointVotes.sol, contracts/script/Deploy.s.sol, contracts/script/DeployDryRun.s.sol
---

### [00:29] [architecture] Authentication System Architecture - Three-Phase Flow with JWT
**Details**: The authentication system has evolved to use a three-phase flow with JWT tokens instead of the previous localStorage-only approach:

PHASE 1: PASSKEY REGISTRATION OR RECOVERY
- Registration (/app/register/page.tsx): Creates WebAuthn passkey via navigator.credentials.create() with P-256 (alg -7)
- Login (/app/login/page.tsx): Recovers passkey via navigator.credentials.get() with discoverable credentials
- Database: user_passkeys table stores (user_id, pubkey_x, pubkey_y, credential_id)
- API: /api/auth/lookup - Finds user by credential_id, returns pubkey coordinates

PHASE 2: EPHEMERAL SIGNER AUTHORIZATION
- useAuthFlow.ts: authorizeSession() generates ephemeral wallet (7-day validity)
- Challenge: keccak256(abi.encode(signer, expiry, chainId, contractAddress))
- User signs with WebAuthn passkey (Face ID required)
- DER signature parsed to r,s format in useAuthFlow.ts (lines 133-158)
- /api/authorize: Gate 1 checks passkey in DB, calls contract.authorizeSigner(), waits for on-chain state
- Returns txHash; localStorage stores { privateKey, address, expiry }

PHASE 3: JWT LOGIN
- /api/login/challenge: Returns signed challenge (timestamp:nonce:signature format via challenge-store.ts)
- /api/login: Gate 1 verifies passkey, Gate 2 verifies signer authorized on-chain, signs JWT
- JWT payload: { sub, pubKeyX, pubKeyY, displayName, email, signerAddress, signerExpiry }
- Returns token stored in localStorage; valid 24h
- /api/auth/me: Validates JWT, returns user data + signer info

STORAGE MODEL:
- localStorage keys: 'passkeyInfo', 'sessionKey', 'authToken'
- passkeyInfo: { credentialId, userId, pubKeyX, pubKeyY }
- sessionKey: { privateKey, address, expiry }
- authToken: JWT string

AuthContext tracks: user, token, signerAddress, signerExpiry, isLoggedIn (all three valid)
useVoting.ts: Unchanged - still uses localStorage, expects valid sessionKey from auth flow
**Files**: src/app/register/page.tsx, src/app/login/page.tsx, src/hooks/useAuthFlow.ts, src/contexts/AuthContext.tsx, src/app/api/authorize/route.ts, src/app/api/login/route.ts, src/lib/jwt.ts, src/lib/challenge-store.ts
---

### [00:29] [api] API Routes - Authentication and Authorization Flow
**Details**: POST /api/register - Register new user with passkey
- Input: { code, pubKeyX, pubKeyY, credentialId }
- Flow: Validate invite code → registerPasskey() inserts into user_passkeys + nulls invite_code
- Returns: { success, userId }

POST /api/authorize - Authorize ephemeral signer on-chain
- Input: { pubKeyX, pubKeyY, signer, expiry, authenticatorData, clientDataJSON, r, s }
- Gate 1: getUserByPasskey() validates passkey in user_passkeys table
- Process: Calls contract.authorizeSigner() with WebAuthn components
- Verification: Polls contract.signers() up to 5 times with 500ms delays for RPC lag
- Returns: { success, txHash }

POST /api/authorize/challenge - NOT YET IMPLEMENTED for authorize phase
- Currently authorize uses direct challenge from useAuthFlow (not server-generated)

POST /api/login/challenge - Get login challenge
- Process: generateChallenge() creates signed challenge (timestamp:nonce:signature)
- Returns: { challengeId, challenge } where challenge is the nonce
- TTL: 5 minutes; no server-side storage (cryptographically signed)

POST /api/login - Login with ephemeral signer to get JWT
- Input: { pubKeyX, pubKeyY, signer, challengeId, signature }
- Verification: getAndConsumeChallenge() validates signature + expiry
- Gate 1: getUserByPasskey() checks passkey in DB
- Gate 2: contract.signers() checks signer authorized with valid expiry
- Process: signJWT() creates 24h token
- Returns: { success, token, user }

POST /api/vote - Cast vote with authorized signer
- Input: { pubKeyX, pubKeyY, signer, topicId, amount, signature }
- Gate 1: getUserByPasskey() validates passkey
- Gate 2: contract.signers() checks signer authorized with valid expiry
- Process: contract.vote([pubKeyX, pubKeyY], signer, topicId, amount, signature)
- Returns: { success, txHash }

GET /api/nonce - Get current nonce for signing
- Query: ?pubKeyX=...&pubKeyY=...
- Process: Read-only contract.getNonce([pubKeyX, pubKeyY])
- Returns: { nonce }

GET /api/auth/me - Validate JWT and get user info
- Header: Authorization: Bearer [token]
- Process: verifyJWT() validates signature + expiry (24h)
- Returns: { user, signerAddress, signerExpiry }

POST /api/auth/lookup - Find user by credential ID (for login discovery)
- Input: { credentialId }
- Process: getUserWithPasskeyByCredentialId() joins user_passkeys + users
- Returns: { userId, pubKeyX, pubKeyY, credentialId }

KEY PATTERNS:
- All routes validate input first (400)
- Gate 1: getUserByPasskey (401)
- Gate 2: On-chain signer check (403)
- Errors logged with console.error
- Contract calls via ethers.js with SCHELLING_POINT_VOTES_ABI
**Files**: src/app/api/register/route.ts, src/app/api/authorize/route.ts, src/app/api/vote/route.ts, src/app/api/nonce/route.ts, src/app/api/login/route.ts, src/app/api/login/challenge/route.ts, src/app/api/auth/me/route.ts, src/app/api/auth/lookup/route.ts
---

### [00:29] [dependency] WebAuthn Integration - Browser and Server Flow
**Details**: BROWSER-SIDE (src/lib/webauthn.ts):
- extractPublicKey(attestationObject) - CBOR decode attestation, extract P-256 coordinates
  * Parses attestedCredentialData from authData
  * Decodes COSE key format (get(-2) = x, get(-3) = y)
  * Returns: { pubKeyX, pubKeyY } as hex strings (0x...)
- formatWebAuthnSignature(derSig) - Convert DER to raw r||s format (already done in useAuthFlow)
- arrayBufferToHex, hexToArrayBuffer, arrayBufferToBase64, base64ToArrayBuffer, base64url variants

REGISTRATION FLOW (/app/register/page.tsx):
1. navigator.credentials.create() with:
   - challenge: new Uint8Array(32) (hardcoded, should be random)
   - rp: { name: 'Schelling Point', id: hostname }
   - user: { id: Uint8Array(16), name: user-{code}, displayName: User {code} }
   - pubKeyCredParams: [{ type: 'public-key', alg: -7 }] (P-256/ES256)
   - authenticatorSelection: { authenticatorAttachment: 'platform', requireResidentKey: true, userVerification: 'required' }
   - attestation: 'direct'
2. Extract pubKeyX, pubKeyY, credentialId (base64url)
3. POST /api/register with { code, pubKeyX, pubKeyY, credentialId }

AUTHENTICATION (useAuthFlow.ts authorizeSession):
1. Generate ephemeral wallet (ethers.Wallet.createRandom())
2. Build challenge: keccak256(abi.encode(signer, expiry, chainId, contract))
3. navigator.credentials.get() with allowCredentials = [existing credential]
4. Parse DER signature r,s (manually in lines 133-158)
5. POST /api/authorize

LOGIN (useAuthFlow.ts login):
1. Sign challenge with ephemeral signer (not WebAuthn)
2. POST /api/login with challenge signature

NOTES:
- P-256 keys are 32 bytes (256 bits) each
- DER parsing handles variable length fields and leading zeros
- Coordinates returned as 0x{hex} strings for API transmission
- No precompile verification on frontend (server-side only)
**Files**: src/lib/webauthn.ts, src/app/register/page.tsx, src/hooks/useAuthFlow.ts
---

### [00:29] [pattern] Client State Management Pattern - No Redux/Context for Auth
**Details**: UPDATED PATTERN (January 2026):

AuthContext is now used for global state management:
- Defined in src/contexts/AuthContext.tsx
- Exported via src/hooks/useAuth.ts
- Provides: user, token, signerAddress, signerExpiry, isLoading, isLoggedIn
- Methods: login(), logout(), refreshUser()

State Components:
1. Token validation on mount (checkExistingSession) - validates with /api/auth/me
2. Signer expiry check (hasValidSigner) - checks signerExpiry > now
3. Login check - requires: user + token + valid signer
4. Token refresh with login retry fallback

localStorage still used for:
- 'passkeyInfo': Passkey coordinates (needed for API calls)
- 'sessionKey': Ephemeral signer private key (needed for vote signing)
- 'authToken': JWT (also in context via token)

Flow to "logged in":
1. User creates/recovers passkey → stored in localStorage
2. authorizeSession() → stores sessionKey in localStorage
3. login() via /api/login → stores token in localStorage + context
4. AuthContext detects token + signerExpiry → sets isLoggedIn = true

NOT USED:
- Redux, Zustand, or other global state managers
- Server sessions or HTTP-only cookies
- JWT middleware (validation per-route)
- useReducer or useState outside of components

Voting relies on:
- localStorage for passkeyInfo + sessionKey
- useVoting hook to sign and call /api/vote
- No AuthContext dependency needed for votes (works with localStorage)
**Files**: src/contexts/AuthContext.tsx, src/hooks/useAuth.ts, src/hooks/useVoting.ts
---

### [00:29] [gotcha] Message Signing Differences - WebAuthn vs Ephemeral Signer
**Details**: TWO DIFFERENT SIGNING APPROACHES used in the same system:

WEBAUTHN SIGNING (authorizeSession in useAuthFlow):
- Device signs with stored passkey (P-256)
- Challenge is server-provided keccak256 hash
- Signature comes back DER-encoded from WebAuthn
- Must manually parse DER to get r,s format for contract
- Used for: Authorizing ephemeral signer on-chain (contract.authorizeSigner)

EPHEMERAL SIGNER (vote and login):
- Browser signs with in-memory private key (k1/secp256k1)
- Challenge is either:
  * Login: Server-provided signed challenge (nonce only)
  * Vote: Computed locally from vote parameters
- Signature returned in serialized format from ethers.SigningKey
- ethers.Signature.from() converts to standard format
- Used for: Voting (contract.vote) and login (/api/login)

KEY DIFFERENCE IN MESSAGE FORMAT:

Login message (login):
- Raw sign: messageHash = keccak256(toUtf8Bytes("login:" + nonce))
- NOT EIP-191 prefixed (explicit comment in useAuthFlow line 88)

Vote message (castVote in useVoting):
- Raw sign: messageHash = keccak256(abi.encode(['string', 'bytes32', 'uint256', 'uint256', 'uint256', 'uint256', 'address'], ['vote', identityHash, topicId, amount, nonce, chainId, contract]))
- Includes contextual info (chainId, contract) to prevent replay attacks

Authorize message (authorizeSession):
- Challenge: keccak256(abi.encode(['address', 'uint256', 'uint256', 'address'], [signer, expiry, chainId, contract]))
- Built on frontend, passed to WebAuthn as Uint8Array buffer

CRITICAL: WebAuthn signature handling in useAuthFlow (lines 133-158) manually parses DER because:
- navigator.credentials.get() returns DER-encoded signatures
- Contract expects r,s as separate uint256 values
- Need to strip leading zeros and pad to 32 bytes
**Files**: src/hooks/useAuthFlow.ts, src/hooks/useVoting.ts
---

### [00:46] [architecture] Authentication Context and Route Protection Structure
**Details**: ## Auth System Overview

The application uses a **passkey-based authentication system with JWT tokens and ephemeral signers**. Here's the complete structure:

### Core Auth Context (/src/contexts/AuthContext.tsx)
- **AuthProvider**: Wraps app at root via `<Providers>` in layout.tsx
- **useAuth() hook**: Exported for components to access auth state
- **Storage**: Uses localStorage with NO server-side sessions
  - `authToken`: JWT stored in localStorage
  - `passkeyInfo`: Passkey credentials (credentialId, userId, pubKeyX, pubKeyY)
  - `sessionKey`: Ephemeral signer (privateKey, address, expiry)

### Auth State (AuthContextValue from /src/types/auth.ts)
```typescript
{
  user: AuthUser | null,           // { id, displayName, email, payoutAddress }
  token: string | null,            // JWT token
  signerAddress: string | null,    // Ephemeral wallet address
  signerExpiry: number | null,     // Unix timestamp (7 days)
  isLoading: boolean,              // True during session check
  isLoggedIn: boolean,             // user && token && hasValidSigner
  login: () => Promise<void>,      // Login with passkey
  logout: () => void,              // Clear localStorage + state
  refreshUser: () => Promise<void> // Validate token with /api/auth/me
}
```

### Auth Flow (useAuthFlow hook from /src/hooks/useAuthFlow.ts)
1. **Register**: Create WebAuthn passkey → /api/register
2. **Login/Authorize**: Two-step flow:
   - Step 1: `recoverPasskeyInfo()` - discoverable credentials or check localStorage
   - Step 2: `authorizeSession()` - Generate ephemeral wallet, Face ID sign, call /api/authorize
   - Step 3: `login()` - Sign challenge with ephemeral wallet, call /api/login to get JWT
3. Status: idle → recovering → authorizing → logging-in → success/error

### Initialization Flow
- App mounts → Providers wraps with AuthProvider
- AuthProvider useEffect checks for stored `authToken`
- Validates token via `/api/auth/me`
- Sets isLoading=false after check
- Restores user, token, signer info from localStorage

### Event Layout Route Protection
File: `/src/app/event/layout.tsx`
- **Currently uses**: useAuth hook to check isLoggedIn
- **Loading state**: Shows spinner if authLoading=true
- **Error state**: Shows error message
- **NOT BLOCKING**: Layout doesn't redirect unauthenticated users
- Calculates credits from balance or voting config
- Passes user info to Navbar component

### Admin Layout Structure
File: `/src/app/admin/layout.tsx`
- **NO auth protection**: Layout renders without checking user role
- Uses Radix UI components
- Has sidebar navigation with 8 main items + 2 tablet items
- "Back to Event" link goes to /event/sessions
- **Needs protection**: Should check admin role

### Login Page
File: `/src/app/login/page.tsx`
- **Redirects if logged in**: useEffect redirects to /event if isLoggedIn=true
- Supports two flows:
  - With existing passkey: 1-step (authorize)
  - Without passkey: 2-step (discover + authorize)
- Shows step indicators for multi-step flow
- Has error handling and "Try Again" button

## KEY FINDINGS FOR ROUTE PROTECTION

1. **No route middleware exists** - layouts check auth manually
2. **No role-based access control** - is_admin field exists in DB but never checked on frontend
3. **Auth check pattern**: `const { isLoggedIn } = useAuth()` then conditionally render
4. **Event layout doesn't block unauthenticated** - renders content with undefined user
5. **Admin layout has NO auth check at all** - completely unprotected
6. **JWT flow**: localStorage authToken + /api/auth/me validation
7. **Signer validation**: On-chain expiry check via contract.signers()
8. **Missing**: No middleware or redirect logic for protected routes
**Files**: /src/contexts/AuthContext.tsx, /src/types/auth.ts, /src/hooks/useAuthFlow.ts, /src/app/layout.tsx, /src/app/providers.tsx, /src/app/event/layout.tsx, /src/app/admin/layout.tsx, /src/app/login/page.tsx
---

### [21:53] [auth] Authentication Flow Architecture and Issues
**Details**: The Schelling Point auth system has three separate flows:

1. **Registration Flow** (/register?code=INVITE_CODE):
   - User creates WebAuthn passkey
   - POST /api/register stores passkey in DB, burns invite code
   - Then calls completeAuthFlow() which: authorizes ephemeral signer (Gate 2 on-chain) → gets JWT (login)
   - Success → redirects to /event/sessions
   - Profile setup is NOT triggered automatically

2. **Login Flow** (/login):
   - Recovers passkey via discoverable credentials OR uses localStorage passkeyInfo
   - Calls loginFlow() which: completeAuthFlow() (authorize signer → get JWT)
   - Success → redirects to /event/sessions
   - Profile setup is NOT triggered automatically

3. **Landing Page Flow** (/):
   - AuthModal has onComplete callback (never called - no handler in auth-modal.tsx)
   - AuthModal buttons route directly: "Register with invite code" → /register, "Sign in with Passkey" → /login
   - ProfileSetup modal on landing page is managed by authStep state but never triggered
   - The auth-modal.tsx doesn't call its onComplete prop - it just routes away

**Key Issues Found**:
1. AuthModal.tsx never calls onComplete prop despite it being defined - just routes to /register or /login
2. Auth-modal button text says "Register with invite code" but actually navigates to /register (confusing UX)
3. No profile setup flow after registration - happens auto on landing page demo but NOT in register or login pages
4. Post-auth routing goes directly to /event, bypassing profile setup entirely
5. Profile setup component exists but only used on landing page demo, not in actual auth flow
6. useAuthFlow.completeAuthFlow() completes both authorization AND login in one call, so user redirects immediately
**Files**: src/app/page.tsx, src/app/register/page.tsx, src/app/login/page.tsx, src/components/auth/auth-modal.tsx, src/hooks/useAuthFlow.ts, src/contexts/AuthContext.tsx
---

### [22:00] [gotcha] Auth redirect race condition fix
**Details**: The register and login pages had a race condition: useAuthFlow's status became 'success' and triggered redirect to /event before AuthContext had updated isLoggedIn. Event layout would then kick user back to /login. Fix: Added refreshSession() to AuthContext that re-reads localStorage and validates with API. Register/login pages now: (1) call refreshSession() when status='success', (2) only redirect when isLoggedIn is true.
**Files**: src/contexts/AuthContext.tsx, src/app/register/page.tsx, src/app/login/page.tsx, src/types/auth.ts
---

### [19:27] [testing] Critical broken user flows identified
**Details**: E2E testing analysis revealed critical issues:

1. JWT Authentication Missing (BLOCKER):
   - verifyJWT() function doesn't exist
   - jsonwebtoken not in dependencies
   - All JWT-protected endpoints fail (pre-voting, session proposal)

2. Admin Role Check Missing (SECURITY):
   - /admin/layout.tsx only checks isLoggedIn, not is_admin
   - Any authenticated user can access admin pages

3. Session Proposal Auth Header Missing:
   - /event/propose/page.tsx doesn't send Authorization header
   - All proposals fail with 401

4. Distribution Execution is Fake:
   - Uses setTimeout(3000) instead of API call
   - /api/events/{slug}/distribution/execute doesn't exist

5. Favorites Not Persisted:
   - No database table for favorites
   - localStorage only for non-auth users
   - On-chain votes conflated with favorites (value=1)

6. Status Value Mismatch:
   - TypeScript: 'proposed'/'declined'
   - Database: 'pending'/'rejected'

7. Track Field Lost:
   - Collected in UI but not sent to API
   - Database has no track column
**Files**: src/app/admin/layout.tsx, src/app/event/propose/page.tsx, src/app/api/events/[slug]/votes/me/route.ts, src/app/admin/distribution/page.tsx
### [18:52] [auth] JWT vs Passkey Authentication Architecture
**Details**: The codebase uses a HYBRID authentication system combining JWTs with passkey-based authentication:

**JWT System** (/src/lib/jwt.ts):
- Signs JWTs with 24-hour expiry using HS256
- JWT payload includes: sub (user.id), pubKeyX, pubKeyY, displayName, email, signerAddress, signerExpiry
- Used for protecting API endpoints via Bearer tokens in Authorization headers
- NOT used for session management - purely for API authentication

**Passkey System**:
- WebAuthn P-256 passkeys (Face ID/Touch ID) for identity
- Public key coordinates (pubKeyX, pubKeyY) stored in user_passkeys table
- Serves as "Gate 1" validation on all sensitive API endpoints

**Ephemeral Signer**:
- Generated during authorization (7-day TTL)
- Private key stored in localStorage
- On-chain authorized via authorizeSigner contract call
- Serves as "Gate 2" validation for voting endpoints

**Multi-Gate Security**:
1. Registration: Email → Supabase session cookie → Passkey creation
2. Authorization: Generate ephemeral signer → Sign passkey auth message → Call contract → Store private key
3. Login: Get challenge → Sign with ephemeral signer → Verify on-chain → Issue JWT
4. Voting: JWT in Bearer header + on-chain signer expiry check

**Storage Locations**:
- localStorage.passkeyInfo: {credentialId, userId, pubKeyX, pubKeyY}
- localStorage.sessionKey: {privateKey, address, expiry}
- localStorage.authToken: JWT token (24h TTL)
- Supabase session cookie: From Supabase auth (magic link)
- user_passkeys table: persistently stores passkey credentials
**Files**: src/lib/jwt.ts, src/hooks/useAuthFlow.ts, src/contexts/AuthContext.tsx, src/app/api/login/route.ts
---

### [18:52] [api] API Route Authentication Protection Pattern
**Details**: All API routes follow a consistent multi-gate validation pattern:

**Gate 1 Routes** (passkey validation only - no JWT needed):
- POST /api/register: Validates Supabase session cookie, registers passkey
- POST /api/authorize: Validates passkey in DB via getUserByPasskey()
- POST /api/nonce: Read-only, no validation needed
- POST /api/auth/lookup: Accepts credentialId, returns user data
- POST /api/login/challenge: No validation, returns signed challenge

**Gate 1 + Gate 2 Routes** (passkey + on-chain signer):
- POST /api/vote: Checks passkey in DB + validates signer expiry on-chain
- POST /api/vote/batch: Same as /api/vote

**JWT-Protected Routes** (Bearer token validation):
- GET /api/auth/me: Validates JWT token, returns user from DB
- GET /api/events/:slug/sessions (with mine=true): Validates JWT, filters user's sessions
- POST /api/events/:slug/sessions: Validates JWT, creates session for user
- PATCH /api/profile: Validates JWT, updates user profile
- GET /api/profile: Validates JWT, returns user profile

**Auth Header Pattern**:
```typescript
// Routes check: Authorization: Bearer <jwt_token>
const authHeader = request.headers.get('Authorization')
if (!authHeader?.startsWith('Bearer ')) {
  return 401 Unauthorized
}
const token = authHeader.substring(7)
const payload = await verifyJWT(token)
if (!payload) return 401
```

**No Middleware**: No Next.js middleware file exists. Auth is per-route.
**Files**: src/app/api/vote/route.ts, src/app/api/profile/route.ts, src/app/api/events/[slug]/sessions/route.ts, src/app/api/login/route.ts
---

### [18:52] [frontend] Frontend Auth Flow and Credential Management
**Details**: **Registration Flow** (/src/app/register/page.tsx):
1. Send magic link via Supabase auth.signInWithOtp() → sets session cookie
2. User clicks link → /auth/callback exchanges code for session
3. User creates WebAuthn passkey via navigator.credentials.create()
4. Extract P-256 public key (pubKeyX, pubKeyY) from attestationObject
5. POST /api/register with {pubKeyX, pubKeyY, credentialId}
6. Store in localStorage.passkeyInfo
7. Call completeAuthFlow() from useAuthFlow hook

**completeAuthFlow() Steps** (useAuthFlow.ts):
1. authorizeSession(): Generate ephemeral wallet → Sign auth message with passkey (Face ID) → POST /api/authorize → store privateKey in localStorage.sessionKey
2. login(): Get challenge from /api/login/challenge → Sign with ephemeral key → POST /api/login → receive JWT → store in localStorage.authToken

**Login Flow** (useAuthFlow.ts loginFlow()):
1. Check for localStorage.passkeyInfo
2. If not found: recoverPasskeyInfo() - use discoverable credentials to find passkey
3. completeAuthFlow() - authorize and login

**useVoting Hook** (casting votes):
- Checks localStorage.passkeyInfo and localStorage.sessionKey
- Gets nonce from contract via /api/nonce
- Signs vote message with ephemeral private key from localStorage
- Sends to /api/vote with pubKeyX, pubKeyY, signer, signature

**AuthContext** (global auth state):
- checkExistingSession() on mount: validates stored authToken with /api/auth/me
- Sets isLoggedIn when JWT exists AND signer not expired
- Tracks needsSignerRefresh if < 24 hours remaining (7-day signer TTL)
**Files**: src/app/register/page.tsx, src/hooks/useAuthFlow.ts, src/hooks/useVoting.ts, src/contexts/AuthContext.tsx
---

### [18:52] [gotcha] Supabase Auth Dual-Use Pattern and Cleanup
**Details**: **Important Gotcha**: The project uses Supabase Auth (magic links) ONLY for initial email verification, then switches to passkey auth.

**Flow**:
1. Register page calls supabase.auth.signInWithOtp() - sets Supabase session cookie
2. Magic link callback (/auth/callback) exchanges code for session
3. User creates passkey and completes auth flow
4. **Key step** in /src/app/register/page.tsx: After success, it calls supabase.auth.signOut() to clear the Supabase session

**Why**: The project deliberately uses passkey auth instead of Supabase JWT. The Supabase cookie is only needed to:
- Authenticate POST /api/register so users can't register other users' passkeys
- Verify email ownership via OTP

**Code snippet from register page**:
```typescript
// After auth flow completes, sign out of Supabase and refresh session
React.useEffect(() => {
  if (status === 'success') {
    // Clean up Supabase session since we now use passkey auth
    supabase.auth.signOut().then(() => {
      refreshSession()
    })
  }
}, [status, refreshSession, supabase.auth])
```

**Result**: No Supabase JWT tokens are ever used in the app. Only localStorage.authToken (our custom JWT) is used.
**Files**: src/app/register/page.tsx, src/lib/db/users.ts
---

### [18:52] [voting] Complete Voting System Architecture and Implementation
**Details**: ## Core Voting System Overview

The voting system has TWO distinct voting implementations:

### 1. ON-CHAIN VOTING (useVoting.ts + useOnChainVotes.ts)
- Primary implementation using smart contract storage
- Uses Web3 passkey authentication (P-256 public keys)
- Ephemeral signers authorized by passkey
- Topic ID = keccak256(sessionUUID) - computed on the fly

**Key Flow:**
1. User casts vote via castVote() or batchVote() 
2. Frontend signs message with ephemeral wallet (k1/secp256k1)
3. API route /api/vote validates passkey (Gate 1) + checks signer expiry (Gate 2)
4. Relayer calls contract.vote() or contract.batchVote()
5. React Query caches result with optimistic updates

**Vote Value Semantics:**
- 0 = remove vote
- 1 = favorite (binary marker in pre-voting context)
- 1-100 = percentage allocation (for my-votes ranking)

### 2. OFF-CHAIN VOTING (use-votes.ts)
- Legacy/fallback implementation using off-chain API
- Separate from on-chain system
- Used for backward compatibility

## React Query Caching Architecture (useOnChainVotes.ts)

**useOnChainVotes Hook:**
- Fetches votes from contract.getVotes() via RPC
- Query key: `['votes', 'user', pubKeyX, pubKeyY, 'sessions', sessionIds.sort().join(',')]`
- staleTime: 60 seconds, gcTime: 5 minutes
- Maps topicIds ↔ sessionUUIDs transparently
- Returns votes object keyed by session UUID, not topicId

**useVoteMutation Hook:**
- Single vote: calls castVote({ sessionId, value })
- Batch votes: calls castBatchVotes([{ sessionId, value }...])
- Optimistic updates via onMutate before async call
- Rolls back on error
- Trusts optimistic update (no invalidation on success)
- Auto-increments nonce on-chain

**Query Key Factory:**
```typescript
voteKeys.all: ['votes']
voteKeys.user(pubKeyX, pubKeyY): ['votes', 'user', pubKeyX, pubKeyY]
voteKeys.sessions(pubKeyX, pubKeyY, sessionIds): [..., 'sessions', '...']
```

## API Routes for Voting

**POST /api/vote** - Single vote
- Input: { pubKeyX, pubKeyY, signer, topicId, value, signature }
- Gate 1: getUserByPasskey() validates user registered in Supabase
- Gate 2: contract.signers(identityHash, signer) validates expiry
- Calls: contract.vote([pubKeyX, pubKeyY], signer, topicId, value, signature)
- Returns: { success: true, txHash }

**POST /api/vote/batch** - Batch votes
- Input: { pubKeyX, pubKeyY, signer, topicIds[], values[], signature }
- Same gates as single vote
- Calls: contract.batchVote([pubKeyX, pubKeyY], signer, topicIds, values, signature)
- Returns: { success: true, txHash, votesCount }

**GET /api/nonce** - Get replay protection nonce
- Query: ?pubKeyX=...&pubKeyY=...
- Calls: contract.getNonce([pubKeyX, pubKeyY])
- Returns: { nonce: number }

## UI Components for Voting

### TapToVote (tap-to-vote.tsx)
- 140x140px circular button for attendance voting
- Shows ripple feedback animation on vote
- Calculates nextCost using calculateNextVoteCost()
- Disabled if remaining credits insufficient
- Props: votes, onVote, remainingCredits, disabled

### VoteCounter (vote-counter.tsx)
- +/- buttons for incrementing/decrementing votes
- Shows VoteDots visualization
- Displays current cost and next vote cost
- Used in session cards for pre-voting
- Props: votes, onVote(newVotes), remainingCredits

### VoteDots (vote-dots.tsx)
- Animated dot visualization of vote count
- maxDisplay: 10 dots (shows "+N" if exceeded)
- Sizes: sm, default, lg
- Filled dots = votes, empty dots = remaining display space

### CreditBar (credit-bar.tsx)
- Progress bar showing remaining credits
- Color changes: green → amber → red based on threshold (50%, 20%)
- Shows "Voting Credits Remaining: X/Y"
- Sizes: sm, default, lg

## Session Voting Integration

### Session Card (session-card.tsx)
- Displays VoteCounter for immediate pre-voting
- Props: session, remainingCredits, onVote(), onToggleFavorite()
- VoteCounter calls onVote(sessionId, votes) with new vote count

### Sessions Page (/app/event/sessions/page.tsx)
- Lists all approved sessions with voting enabled
- Uses useOnChainVotes with React Query caching
- Favorites tracked by: vote value === 1 (on-chain) or localStorage fallback
- handleVote() calls castVote() from use-votes.ts hook
- handleToggleFavorite() calls castOnChainVote({ sessionId, value: 1 or 0 })

## My-Votes Page (/app/event/my-votes/page.tsx)

**Complex Drag-and-Drop Ranking System:**
- Loads favorited sessions (where onChainVotes[sessionId] > 0)
- Drag to reorder ranked list
- Visual drop indicator shows insertion point
- Four curve types for distribution:
  - even: All equal (1/n each)
  - sqrt: Square root weighting (balanced)
  - linear: Linear decay (n, n-1, ..., 1)
  - exponential: Top-heavy (n², (n-1)², ...)
- Weights normalized to sum to exactly 100

**Batch Vote Process:**
1. User ranks favorites and selects curve
2. calculateWeights() computes percentages
3. "Save Allocation" button calls castBatchVotes()
4. Submits array of { sessionId, value: percentage } to on-chain vote

**Graph/Shape Visualization:**
- Distribution preview bar: stacked bar chart with color gradient
- Shows visual proportion of each session's allocation

## Live Voting Page (/app/event/live/page.tsx)

**Real-time Session Voting:**
- Shows currently live session (based on time slot)
- TapToVote interface for attendance voting
- Each tap increments votes by 1
- Status message while submitting: "Submitting vote on-chain..."
- Shows last tx hash with link to Basescan
- Displays today's votes in session list

**Voting Flow:**
1. User taps TapToVote button
2. Sets localVotes = newVotes
3. Calls castOnChainVote(topicId, 1) via useVoting hook
4. Updates off-chain stats via castOffChainVote() fallback
5. Shows error if either fails, reverts localVotes

## Quadratic Cost Calculation (utils.ts)

```typescript
calculateQuadraticCost(votes): votes²
calculateNextVoteCost(currentVotes): 2*currentVotes + 1
calculateMaxVotes(credits): floor(sqrt(credits))
```

Cost examples:
- 1 vote = 1 credit (costs 1)
- 2 votes = 4 credits (costs +3)
- 3 votes = 9 credits (costs +5)
- 10 votes = 100 credits

## Pre-Vote vs Attendance Vote Distinction

**Pre-Event Voting (sessions page + my-votes):**
- 100 credits (configurable in event)
- Value semantics: 1 = favorite (selection), 1-100 = percentage (allocation)
- Influences scheduling algorithm
- UI: VoteCounter (increment/decrement) + drag ranking

**Attendance Voting (live page):**
- 100 fresh credits (separate from pre-votes)
- Value semantics: count of taps/votes
- Determines session budget via quadratic funding
- UI: TapToVote (circular button with ripple feedback)

## localStorage State Management

**passkeyInfo:**
```json
{ credentialId, userId, pubKeyX, pubKeyY }
```

**sessionKey:**
```json
{ privateKey, address, expiry }
```

No JWT tokens, no HTTP auth headers - entirely localStorage-based.

## Message Signing Details

**Single vote message:**
```
keccak256(abi.encodePacked('vote', identityHash, topicId, value, nonce, CHAIN_ID, CONTRACT_ADDRESS))
```

**Batch vote message:**
```
keccak256(abi.encodePacked(
  'batchVote',
  identityHash,
  keccak256(abi.encodePacked(topicIds[])),
  keccak256(abi.encodePacked(values[])),
  nonce,
  CHAIN_ID,
  CONTRACT_ADDRESS
))
```

Signature format: r (32) || s (32) || v (1) = 65 bytes total
**Files**: src/hooks/useVoting.ts, src/hooks/useOnChainVotes.ts, src/hooks/use-votes.ts, src/components/voting/tap-to-vote.tsx, src/components/voting/vote-counter.tsx, src/components/voting/vote-dots.tsx, src/components/voting/credit-bar.tsx, src/app/event/my-votes/page.tsx, src/app/event/sessions/page.tsx, src/app/event/live/page.tsx, src/app/api/vote/route.ts, src/app/api/vote/batch/route.ts, src/app/api/nonce/route.ts, src/lib/utils.ts, src/lib/contracts/SchellingPointVotes.ts
---

### [18:54] [architecture] Complete Login and Registration Flow Architecture
**Details**: 
REGISTRATION FLOW (/src/app/register/page.tsx):

User Journey:
1. Landing page shows "Enter Event" button that triggers AuthModal
2. AuthModal shows two options:
   - "Sign in with Passkey" (for returning users)
   - "Register with Email" (for new users)
   
3. Register button navigates to /register page (RegisterContent component)
   Mode states: 'loading' | 'email' | 'email-sent' | 'passkey'
   
   Step 1 - EMAIL VERIFICATION:
   - User enters email
   - Supabase OTP magic link sent to email (via supabase.auth.signInWithOtp)
   - Email redirect URL: /auth/callback
   - User sees "Check Your Email" confirmation screen
   
   Step 2 - MAGIC LINK CALLBACK:
   - User clicks magic link in email
   - Routes to /auth/callback (route.ts)
   - Exchanges code for Supabase session (supabase.auth.exchangeCodeForSession)
   - Redirects back to /register page
   - Page detects Supabase session with getUser(), sets mode to 'passkey'
   
   Step 3 - PASSKEY CREATION:
   - User taps "Create Account with Face ID / Touch ID"
   - navigator.credentials.create() with P-256 (alg: -7)
   - Public key coordinates (X, Y) extracted from CBOR attestationObject via extractPublicKey()
   - Credential ID stored (arrayBufferToBase64Url)
   - Backend /api/register called with { pubKeyX, pubKeyY, credentialId }
   - Passkey info stored in localStorage
   
   Step 4 - AUTH FLOW COMPLETION:
   - useAuthFlow.completeAuthFlow() is called
   - Calls authorizeSession() - creates ephemeral wallet, requests Face ID auth with WebAuthn
   - Calls login() - gets JWT via /api/login endpoint
   - localStorage stores: passkeyInfo + sessionKey + authToken
   - AuthContext.refreshSession() is called
   - Redirects to /event/sessions

LOGIN FLOW (/src/app/login/page.tsx):

User Journey:
1. Triggered by AuthModal "Sign in with Passkey" button
2. Navigates to /login page (LoginPage component)

Step 1 - PASSKEY RECOVERY (if needed):
- Checks localStorage for passkeyInfo
- If not found, calls useAuthFlow.recoverPasskeyInfo()
- Uses navigator.credentials.get() with discoverable credentials (no allowCredentials)
- User selects passkey from device
- Backend /api/auth/lookup called to get user data (pubKeyX, pubKeyY)
- Passkey info stored in localStorage

Step 2 - SESSION AUTHORIZATION:
- Calls useAuthFlow.authorizeSession()
- Generates new ephemeral wallet
- Creates authorization message: keccak256(abi.encode(signer, expiry, chainId, contract))
- Requests WebAuthn signature (Face ID/Touch ID) with challenge
- Parses DER signature to extract r, s values
- Backend /api/authorize called with signature data
- sessionKey stored in localStorage

Step 3 - LOGIN TO GET JWT:
- Calls useAuthFlow.login()
- Gets challenge from /api/login/challenge
- Signs challenge with ephemeral signer (ECDSA)
- Sends to /api/login endpoint
- JWT stored in authToken localStorage
- AuthContext.refreshSession() confirms login state
- Redirects to /event

ADDITIONAL REGISTRATION STEPS:

After passkey auth completes, two optional flows exist (though currently not triggered):

Profile Setup (ProfileSetup component):
- 3-step modal form (not connected to current flow)
- Step 1: Display name (required), bio, interests, avatar
- Step 2: Email, location, socials (optional)
- Step 3: BurnerSetup (optional - link physical burner card)

Onboarding Tutorial (OnboardingTutorial component):
- 4-slide carousel explaining quadratic voting
- "Enter Event" button on final slide

AUTH MODAL (auth-modal.tsx):
- Simple modal with two options:
  - "Sign in with Passkey" → navigates to /login
  - "Register with Email" → navigates to /register
- Called from landing page when "Enter Event" clicked
- Can also show links to navigate between login/register flows

AUTHENTICATION STATE MANAGEMENT:

AuthContext (contexts/AuthContext.tsx):
- useAuth() hook provides auth state
- State: { user, token, signerAddress, signerExpiry, isLoading, isLoggedIn, needsSignerRefresh }
- isLoggedIn = !!user && !!token && (signerExpiry > now)
- localStorage keys:
  - authToken: JWT from backend
  - passkeyInfo: { credentialId, userId, pubKeyX, pubKeyY }
  - sessionKey: { privateKey, address, expiry }

useAuthFlow hook:
- Status states: 'idle' | 'recovering' | 'authorizing' | 'logging-in' | 'success' | 'error'
- Methods:
  - recoverPasskeyInfo(): discovers passkey via navigator.credentials.get()
  - authorizeSession(passkeyInfo): creates ephemeral signer on-chain
  - login(passkeyInfo, sessionKey): exchanges for JWT
  - completeAuthFlow(passkeyInfo): combines authorize + login
  - loginFlow(): full login with optional recovery

PROTECTED ROUTES:

Event Layout (/src/app/event/layout.tsx):
- Checks useAuth() isLoggedIn state
- If !isLoggedIn, redirects to /login
- Shows loading spinner while checking auth
- Navbar displays user menu with Profile/Settings/Admin/Sign out
- onSignOut prop calls logout() from AuthContext

UNAUTHENTICATED FLOWS:

Landing Page (src/app/page.tsx):
- Accessible to all users
- "Enter Event" button opens AuthModal (sets authStep to 'auth')
- "View Sessions" button navigates to /event/sessions (unprotected? needs verification)
- AuthModal, ProfileSetup, OnboardingTutorial are local state controlled
- No global auth state requirement

KEY DESIGN NOTES:
- NO JWT middleware or session cookies (entirely localStorage-based)
- Three-gate security: Supabase email verification → WebAuthn passkey → Ephemeral signer
- Passkey discovery supports users with multiple passkies (browser selects which one)
- Ephemeral signer valid 7 days, can be refreshed if < 24 hours remaining
- Error states show destructive/10 background with error messages
- Loading states use Loader2 spinner icon with "Loading..." text
- Step indicators show progress (1→2 or 2→1) during auth flow

**Files**: /workspace/project/src/app/register/page.tsx, /workspace/project/src/app/login/page.tsx, /workspace/project/src/contexts/AuthContext.tsx, /workspace/project/src/hooks/useAuthFlow.ts, /workspace/project/src/components/auth/auth-modal.tsx, /workspace/project/src/app/auth/callback/route.ts, /workspace/project/src/app/page.tsx, /workspace/project/src/app/event/layout.tsx
---

### [19:09] [gotcha] Favorites vs Voting Overlap and Confusion
**Details**: The codebase has both a "favorites" system and a voting system that have significant overlap and create user confusion:

**FAVORITES SYSTEM (Client-side localStorage):**
- Persists to localStorage via useFavorites hook: `schelling-point-favorites`
- Used in /event/my-schedule to show "My Schedule" (saved/hearted sessions)
- Heart icon toggle on session cards adds/removes from localStorage
- NOT stored in database or on-chain
- Separate from voting completely

**VOTING SYSTEM (On-chain):**
- Stores vote counts on-chain (SchellingPointVotes contract)
- Each vote is a session UUID → topic ID hash → vote amount
- My Votes (/event/my-votes) shows "favorites" but actually means "sessions with vote count > 0"
- Creates confusion: a "favorited" session for voting purposes is just one with any vote count

**THE CONFLICT:**
1. Toggling heart on session card in /event/sessions currently toggles on-chain vote (0 or 1) for logged-in users
2. /event/my-schedule uses localStorage favorites, NOT on-chain votes
3. /event/my-votes incorrectly uses the term "favorites" but actually filters sessions where onChainVotes[sessionId] > 0
4. Two separate favorite/bookmarking mechanisms exist with no synchronization

**WHAT VOTING.ADD BROKE:**
When voting was added, the heart toggle (onToggleFavorite) was changed from toggling localStorage to casting on-chain votes. But /event/my-schedule still uses localStorage useFavorites(), creating a disconnect where:
- Toggling heart on session card in /event/sessions adds on-chain vote
- But /event/my-schedule doesn't show it unless you manually mark it as localStorage favorite
- Users who vote on sessions don't see them in "My Schedule" unless they explicitly favorite

**FILES INVOLVED:**
- /src/app/event/sessions/page.tsx: handleToggleFavorite casts on-chain vote
- /src/app/event/my-schedule/page.tsx: Uses localStorage useFavorites(), filters by localStorage not votes
- /src/app/event/my-votes/page.tsx: Misuses "favorites" terminology, actually filters by vote count > 0
- /src/hooks/use-favorites.ts: Simple localStorage wrapper
- /src/hooks/useOnChainVotes.ts: Fetches votes from contract
**Files**: /src/app/event/sessions/page.tsx, /src/app/event/my-schedule/page.tsx, /src/app/event/my-votes/page.tsx, /src/hooks/use-favorites.ts, /src/hooks/useOnChainVotes.ts, /src/components/sessions/session-card.tsx
---

### [22:50] [auth] Login flow re-authorization bug and fix
**Details**: loginFlow() in useAuthFlow.ts was creating a new ephemeral wallet and calling authorizeSession() on every login, even when a valid sessionKey existed in localStorage. Fixed completeAuthFlow() to check for existing valid sessionKey before re-authorizing. Three login paths now: (1) has passkeyInfo + valid sessionKey → skip straight to challenge/login (no Face ID), (2) has passkeyInfo but no sessionKey → authorize new signer (one Face ID) → login, (3) no passkeyInfo → discoverable credentials recovery → authorize → login.
**Files**: src/hooks/useAuthFlow.ts, src/app/login/page.tsx, src/contexts/AuthContext.tsx
---

### [22:50] [auth] Logout clears sessionKey, keeps passkeyInfo
**Details**: Logout now clears authToken AND sessionKey from localStorage, but keeps passkeyInfo. This means after logout, user sees 1-step login flow (Face ID to create new ephemeral signer). Before this fix, logout kept sessionKey which was a private key leak on shared devices. Settings page logout was also broken (just console.log) - now fixed to use actual logout() from AuthContext.
**Files**: src/contexts/AuthContext.tsx, src/app/settings/page.tsx
---

### [01:03] [gotcha] Login challenge GET endpoint was being cached by Vercel
**Details**: The /api/login/challenge GET endpoint had no cache headers, so Next.js/Vercel was caching the response at the edge. This caused stale challenges (5+ minutes old) to be served, which then failed the 5-minute TTL check in getAndConsumeChallenge. Fix: added `export const dynamic = 'force-dynamic'` and `Cache-Control: no-store` header. This was the root cause of the intermittent "Invalid or expired challenge" login failures.
**Files**: src/app/api/login/challenge/route.ts, src/lib/challenge-store.ts
---

### [16:02] [database] user_passkeys table refactored out of users table
**Details**: Migration 012 (20251219120000_012_user_passkeys.sql) created a separate user_passkeys table to support multiple passkeys per user (1:M relationship). The migration:

1. Created user_passkeys table with columns:
   - id (UUID PK, default gen_random_uuid())
   - user_id (UUID FK to users.id, ON DELETE CASCADE)
   - pubkey_x (TEXT NOT NULL) - secp256r1 X coordinate
   - pubkey_y (TEXT NOT NULL) - secp256r1 Y coordinate  
   - credential_id (TEXT NOT NULL) - WebAuthn credential ID (base64url)
   - created_at (TIMESTAMPTZ DEFAULT NOW())

2. Constraints:
   - UNIQUE(credential_id) - each credential registered once
   - UNIQUE(pubkey_x, pubkey_y) - each pubkey pair is on-chain identity

3. Indexes created:
   - idx_user_passkeys_pubkey (pubkey_x, pubkey_y) - for auth lookup
   - idx_user_passkeys_credential_id - for discoverable login
   - idx_user_passkeys_user_id - for listing user's passkeys

4. Migration 013 (20251219130000_013_drop_user_passkey_columns.sql) then removed the old columns from users table:
   - Dropped pubkey_x, pubkey_y, credential_id from users
   - Dropped idx_users_pubkey, idx_users_credential_id indexes

5. Migration 014 (20251219140000_014_drop_invite_code.sql) also removed invite_code from users table

Current users table columns: email (unique, required), smart_wallet_address (unique, required), display_name, bio, avatar_url, ens_address, payout_address, topics (array), created_at, updated_at

TypeScript types in src/types/supabase.ts properly reflect this split with user_passkeys table definition and UserPasskey type exported from src/lib/db/users.ts.
**Files**: /workspace/project/supabase/migrations/20251219120000_012_user_passkeys.sql, /workspace/project/supabase/migrations/20251219130000_013_drop_user_passkey_columns.sql, /workspace/project/supabase/migrations/20251219140000_014_drop_invite_code.sql, /workspace/project/src/types/supabase.ts, /workspace/project/src/lib/db/users.ts
---

### [16:05] [database] user_passkeys table is separate from users
**Details**: Passkey credentials are stored in a separate `user_passkeys` table (1:M with users), NOT on the users table. Columns: id, user_id (FK), pubkey_x, pubkey_y, credential_id, created_at. Unique constraints on credential_id and (pubkey_x, pubkey_y). The pubkey_x, pubkey_y, credential_id, and invite_code columns were removed from the users table in migrations 013-014.
**Files**: supabase/migrations/20251219120000_012_user_passkeys.sql, supabase/migrations/20251219130000_013_drop_user_passkey_columns.sql
---

### [23:28] [auth] JWT auth system now exists (knowledge docs outdated)
**Details**: The knowledge docs claim "NO JWT/SESSION middleware" but this is outdated. The current implementation uses JWT tokens via the `jose` library stored in localStorage as `authToken`. The flow: challenge-response via ephemeral signer → JWT issued with payload {sub, pubKeyX, pubKeyY, displayName, email, signerAddress, signerExpiry}. API routes validate JWT via Authorization Bearer header. /api/auth/me refreshes user data from JWT. This is a hybrid model: JWT for API auth + localStorage for passkey/session key storage.
**Files**: src/contexts/AuthContext.tsx, src/app/api/login/route.ts, src/app/api/login/challenge/route.ts, src/lib/jwt.ts
---

### [23:54] [gotcha] Immutable storage layout change in SchellingPointQV contract
**Details**: When the `owner` variable in SchellingPointQV was changed from `address public owner` to `address public immutable owner`, the storage layout changed:

BEFORE (owner as storage variable):
- owner at slot 0
- signers mapping at slot 1
- nonces mapping at slot 2

AFTER (owner as immutable):
- owner stored in bytecode, NOT in storage
- signers mapping at slot 0 (shifted down)
- nonces mapping at slot 1 (shifted down)

The test file `/workspace/project/contracts/test/SchellingPointQV.t.sol` uses `vm.store()` to manually set signer authorization by writing directly to the signers mapping storage slot. The constant `SIGNERS_SLOT` had to be updated from 1 to 0 after making owner immutable.

The storage slot calculation for nested mappings still works the same way:
```solidity
bytes32 innerSlot = keccak256(abi.encode(identityHash, SIGNERS_SLOT));
bytes32 signerSlot = keccak256(abi.encode(signer, innerSlot));
vm.store(address(qv), signerSlot, bytes32(_expiry));
```

All 37 tests pass after this fix.
**Files**: /workspace/project/contracts/test/SchellingPointQV.t.sol, /workspace/project/contracts/src/SchellingPointQV.sol
---

### [23:56] [deployment] SchellingPointQV deployment on Base Sepolia
**Details**: Contract deployed to 0x1e3703d4e2135dE24450FDA5cf18c18c66711523 on Base Sepolia (chain 84532). Event ID: 101310439360068229198498235905453178362848215801890223219690675748118742731958 (keccak256("schelling-point-2025") cast to uint256). Budget: 100 credits. Deployer: 0x0257aD14F8bAeccd281f66D5f57473E5EFbeDF5C. Verification pending (needs BASESCAN_API_KEY).
**Files**: contracts/src/SchellingPointQV.sol, contracts/script/Deploy.s.sol
---

### [00:03] [api] SchellingPointQV contract ABI and new API routes
**Details**: The contract was overhauled from SchellingPointVotes to SchellingPointQV. Key changes:
- Contract address: 0x1e3703d4e2135dE24450FDA5cf18c18c66711523
- EVENT_ID constant: 101310439360068229198498235905453178362848215801890223219690675748118742731958
- New functions: createEvent, closeEvent, allocate, batchAllocate, getAllocations, getRemainingBudget
- New mappings: events(eventId), allocations(eventId, identityHash, topicId), totalSpent(eventId, identityHash)
- New events: Allocation, EventCreated, EventClosed (replaces Vote event)
- Old vote/batchVote functions replaced by allocate/batchAllocate (credit-based, event-scoped)
- New API routes: POST /api/vote/allocate (uses JWT auth + batchAllocate), GET /api/votes (reads allocations + remainingBudget)
- Old routes deleted: /api/vote, /api/vote/batch, /api/events/[slug]/votes, /api/events/[slug]/votes/me
- Existing routes (authorize, nonce, login) updated to import from SchellingPointQV with alias
- NOTE: src/hooks/useVoting.ts and src/hooks/useOnChainVotes.ts still import from old SchellingPointVotes (needs update in frontend task)
**Files**: src/lib/contracts/SchellingPointQV.ts, src/app/api/vote/allocate/route.ts, src/app/api/votes/route.ts, src/app/api/authorize/route.ts, src/app/api/nonce/route.ts, src/app/api/login/route.ts
---

### [00:15] [architecture] Voting system overhaul to SchellingPointQV
**Details**: The voting system was completely overhauled. Old contract SchellingPointVotes.sol replaced with SchellingPointQV.sol. Key changes: (1) Idempotent allocation system - no nonces needed, replays are no-ops. (2) On-chain budget enforcement per identity per event (100 credits default). (3) Delta-based credit tracking in batchAllocate. (4) Event lifecycle management (createEvent/closeEvent, onlyOwner). (5) Single useVotes hook replaces three old hooks (useVoting, useOnChainVotes, use-votes). (6) 2s frontend debounce with flush on navigation. (7) Heart/favorites are localStorage only, not on-chain. (8) Contract deployed to Base Sepolia at 0x1e3703d4e2135dE24450FDA5cf18c18c66711523. Event ID stored as env var NEXT_PUBLIC_EVENT_ID. Deployer wallet: 0x0257aD14F8bAeccd281f66D5f57473E5EFbeDF5C.
**Files**: contracts/src/SchellingPointQV.sol, src/hooks/useVotes.ts, src/lib/contracts/SchellingPointQV.ts, src/app/api/vote/allocate/route.ts, src/app/api/votes/route.ts
---

### [22:21] [architecture] eventId vs EVENT_SLUG identification system - redundant coupling
**Details**: CRITICAL FINDING: The voting system uses TWO identification systems for events, creating unnecessary coupling:

**Current Architecture (PROBLEMATIC):**
1. Frontend: Uses NEXT_PUBLIC_EVENT_ID (UUID from Supabase events.id) - sourced from environment variable
2. Frontend fallback: Uses process.env.NEXT_PUBLIC_EVENT_ID hardcoded to '' if not set (src/app/event/sessions/page.tsx:82, src/app/event/my-votes/page.tsx:20)
3. Smart Contract: Expects eventId as uint256 (not UUID)
4. API routes: Fetch event by slug, extract event.id, use it with contract

**The Redundancy Problem:**
- src/lib/config.ts defines EVENT_SLUG from NEXT_PUBLIC_EVENT_SLUG (defaults 'ethdenver-2025')
- useEvent hook (src/hooks/use-event.ts) fetches from /api/events/[slug] using EVENT_SLUG
- This returns event.id (UUID)
- useVotes hook needs this UUID passed as prop, but pages hardcode NEXT_PUBLIC_EVENT_ID instead
- Contract functions (batchAllocate, getAllocations, getRemainingBudget) receive eventId as uint256

**Smart Contract Storage (src/contracts/src/SchellingPointQV.sol):**
- mapping(uint256 => EventInfo) events - expects numeric eventId
- mapping(uint256 => mapping(bytes32 => mapping(bytes32 => uint256))) allocations - eventId is uint256
- createEvent(uint256 eventId, uint256 budget) - owner function to initialize event
- All allocation/read functions use eventId as first key

**API Routes:**
- /api/votes (src/app/api/votes/route.ts): Receives eventId as query param, passes to contract.getAllocations(pubKey, eventId, topicIds)
- /api/vote/allocate (src/app/api/vote/allocate/route.ts): Receives eventId in request body, passes to contract.batchAllocate(pubKey, signer, eventId, topicIds, credits, sig)
- /api/events/[slug] (src/app/api/events/[slug]/route.ts): Returns event.id (Supabase UUID)

**Frontend Implementation Gaps:**
- /src/app/event/sessions/page.tsx: Line 82 uses 'const eventId = process.env.NEXT_PUBLIC_EVENT_ID || \"\"' instead of fetching from useEvent
- /src/app/event/my-votes/page.tsx: Line 20 same hardcoded pattern
- /src/app/event/sessions/[id]/session-detail-client.tsx: Line 50 uses event?.id from useEvent (correct approach)
- /src/app/admin/sessions/page.tsx: Line 136 uses event?.id from useEvent (correct approach)

**The Type Mismatch:**
- Contract expects numeric eventId (uint256)
- Supabase events.id is UUID string
- Frontend environment variable NEXT_PUBLIC_EVENT_ID is likely undefined or UUID string
- This likely causes type coercion or parsing errors at runtime

**Recommendation:**
1. Always fetch event via useEvent hook using EVENT_SLUG
2. Extract event.id from the response
3. Pass event.id to useVotes instead of environment variable
4. Contract needs to accept either UUID string (convert to uint256 hash) OR migrate to use slug-based identification
5. Consider using keccak256(slug) as the on-chain eventId instead of numeric IDs
**Files**: src/app/api/votes/route.ts, src/app/api/vote/allocate/route.ts, src/hooks/useVotes.ts, src/app/event/sessions/page.tsx, src/app/event/my-votes/page.tsx, src/lib/config.ts, src/hooks/use-event.ts, contracts/src/SchellingPointQV.sol
---

### [04:06] [architecture] Three different event identifiers in the system
**Details**: The system has three distinct "event ID" concepts:

1. **On-chain eventId** (uint256) — `keccak256("schelling-point-2025")` = `101310439360068229198498235905453178362848215801890223219690675748118742731958`. Used by the SchellingPointQV contract for voting. Stored as `EVENT_ID` constant in `src/lib/contracts/SchellingPointQV.ts`. The event name string is defined as `EVENT_NAME` in `src/lib/config.ts`.

2. **Supabase event UUID** — `events.id` primary key. Used by `useEvent()` hook for metadata (dates, venues, budget config). Completely separate from on-chain voting.

3. **Event slug** — `events.slug` (e.g., 'ethdenver-2025'). Used for API routes like `/api/events/{slug}`. Configured via `EVENT_SLUG` in `src/lib/config.ts`.

The voting system (useVotes, /api/votes, /api/vote/allocate) uses the on-chain EVENT_ID as a server-side constant — it is NOT passed from the client. The contract's "event" = the whole unconference. The contract's "topics" = individual sessions (hashed from session UUIDs via `keccak256(toUtf8Bytes(sessionUuid))`).
**Files**: src/lib/config.ts, src/lib/contracts/SchellingPointQV.ts, src/hooks/useVotes.ts, src/app/api/votes/route.ts, src/app/api/vote/allocate/route.ts, contracts/script/Deploy.s.sol
---

