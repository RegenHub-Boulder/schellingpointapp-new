# API Routes

## API Route Security Pattern

All routes follow a consistent multi-gate validation pattern:

```
1. Input validation (required fields presence)
2. Gate 1: getUserByPasskey() validates passkey registered in Supabase
   - Returns User | null
   - If invalid: return 401 Unauthorized
3. Gate 2 (optional): On-chain state validation (only for /api/vote)
   - Check signers(identityHash, signer) for valid expiry
   - If invalid: return 403 Forbidden
4. Contract interaction via ethers.js
5. Success response with txHash or data
```

Error handling: Console.error with detailed logging, return error message in response.

## Implemented Routes (Passkey Auth System)

### POST /api/register
Registers a new user with passkey credentials.
- **Input**: `{ code, pubKeyX, pubKeyY }`
- **Process**: Gets user by invite code, calls `registerPasskey()` which sets pubkey_x, pubkey_y, burns code
- **Returns**: `{ success: true, userId }`

### POST /api/authorize
Authorizes an ephemeral signer for a passkey.
- **Input**: `{ pubKeyX, pubKeyY, signer, expiry, authenticatorData, clientDataJSON, r, s }`
- **Gate 1**: `getUserByPasskey` validates passkey in DB
- **Process**: Calls `contract.authorizeSigner()`, verifies authorization readable on-chain (RPC lag handling)
- **Returns**: `{ success: true, txHash }`

### POST /api/vote
Casts a vote using an authorized signer.
- **Input**: `{ pubKeyX, pubKeyY, signer, topicId, amount, signature }`
- **Gate 1**: `getUserByPasskey` validates passkey in DB
- **Gate 2**: `contract.signers()` checks signer authorized with valid expiry
- **Process**: Calls `contract.vote()`
- **Returns**: `{ success: true, txHash }`

### GET /api/nonce
Gets current nonce for signing.
- **Query**: `?pubKeyX=...&pubKeyY=...`
- **Process**: Read-only contract call via `contract.getNonce()`
- **Returns**: Current nonce for vote signature creation

## Database Service Layer
Located at `/src/lib/db/users.ts`:
```typescript
interface User {
  id, email, invite_code, pubkey_x, pubkey_y,
  payout_address, display_name
}

// Functions
getUserByInviteCode(code)
getUserByPasskey(pubKeyX, pubKeyY)
registerPasskey(code, pubKeyX, pubKeyY)
```

## Planned Endpoints (Not Yet Implemented)

### Authentication
- `POST /api/auth/login` - Send magic link
- `POST /api/auth/verify` - Verify magic link, deploy wallet
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/me` - Update profile

### Event Access
- `GET /api/events/:slug/access` - Check access
- `POST /api/events/:slug/access/grant` - Admin grants access
- `POST /api/events/:slug/access/check-in` - Mark checked in
- `POST /api/events/:slug/access/link-card` - Link burner card

### Sessions
- `GET /api/events/:slug/sessions` - List sessions
- `POST /api/events/:slug/sessions` - Propose session
- `PATCH /api/events/:slug/sessions/:id` - Update session
- `POST /api/events/:slug/sessions/:id/approve` - Approve
- `DELETE /api/events/:slug/sessions/:id` - Delete

### Pre-Event Voting
- `GET /api/events/:slug/pre-votes` - Get user's votes
- `POST /api/events/:slug/pre-votes` - Cast vote
- `GET /api/events/:slug/pre-votes/balance` - Credit balance
- `GET /api/events/:slug/pre-votes/overlap` - Voter overlap matrix

### Attendance Voting
- `GET /api/events/:slug/attendance-votes` - Get votes
- `POST /api/events/:slug/attendance-votes` - Cast vote
- `GET /api/events/:slug/attendance-votes/stats` - Session stats
- `GET /api/events/:slug/attendance-votes/distribution` - Preview QF

### Scheduling & Distribution
- `POST /api/events/:slug/schedule/generate` - Run algorithm
- `POST /api/events/:slug/distribution/calculate` - Calculate QF
- `POST /api/events/:slug/distribution/execute` - Execute on-chain
