# Passkey Authentication System

## Architecture Decision
Chose passkeys + custom contract over:
- Safe wallets (too complex, extra deployment per user)
- Web3Auth/Privy (centralization concerns, cost)
- EAS attestations (overkill, more gas, added complexity)

## Core Components
- WebAuthn passkeys (secp256r1) for identity
- RIP-7212 precompile on Base for r1 signature verification
- Ephemeral k1 signers authorized by passkey for seamless UX
- Simple contract (SchellingPointVotes) emits events
- Off-chain QF calculation from events
- Supabase Edge Functions as relayer

## Key Insight
Passkey authorizes ephemeral signer once (Face ID), then signer can cast many votes instantly (no biometric prompts).

## Contract Storage
- `signers[identityHash][signerAddress] => expiry`
- `nonces[identityHash] => uint256` (replay protection)
- Events: SignerAuthorized, Vote

## Identity
`identityHash = keccak256(pubKeyX, pubKeyY)` - computed on the fly, not stored separately.

## Gas Costs on Base
~80k for auth, ~50k per vote ≈ $0.0001 each

## Authentication Flow

### 1. Registration (/app/register/page.tsx)
1. User visits /register?code=INVITE_CODE
2. Creates WebAuthn passkey using navigator.credentials.create()
3. P-256 public key coordinates extracted from CBOR-encoded attestationObject
4. Credential ID stored in localStorage
5. Public key registered on backend via /api/register

### 2. Session Authorization (useVoting hook)
1. Generates ephemeral wallet (valid 7 days)
2. Creates authorization message: keccak256(abi.encodePacked(signer, expiry))
3. User authenticates with Face ID/Touch ID to sign with passkey
4. WebAuthn signature formatted from DER to raw r||s format
5. Backend validates and calls contract.authorizeSigner()
6. Ephemeral wallet private key stored in localStorage

### 3. Voting (useVoting hook)
1. Uses stored ephemeral wallet (no Face ID needed)
2. Builds message: keccak256(abi.encodePacked(topicId, amount, nonce))
3. Signs with ephemeral wallet using standard ECDSA
4. Backend validates session is authorized on-chain before relaying

## Three-Gate Security Model

The system uses a localStorage-based architecture with NO JWT tokens or server-side sessions:

### Gate 1: Registration (Database Validation)
- User registers at `/register?code=INVITE_CODE`
- Creates WebAuthn passkey (P-256) via `navigator.credentials.create()`
- Public key coordinates (X, Y) extracted from CBOR attestationObject
- Backend `/api/register` validates invite code, stores pubkey in `user_passkeys` table (1:M with users), burns code
- A user can have multiple passkeys (multi-device support) — each stored as a separate row in `user_passkeys`
- **localStorage stores**: `{ credentialId, userId, pubKeyX, pubKeyY }`

### Gate 2: Authorization (On-chain Signer)
- `useVoting` hook calls `authorizeSession()` when needed
- Generates ephemeral wallet (valid 7 days)
- Creates authorization message: `keccak256(abi.encodePacked(signer, expiry, chainId, contractAddress))`
- User authenticates with Face ID/Touch ID to sign with passkey
- WebAuthn DER signature formatted to raw r||s format
- Backend `/api/authorize` validates passkey exists in DB, calls `contract.authorizeSigner()`
- **localStorage stores**: `{ privateKey, address, expiry }`

### Gate 3: Voting (On-chain Expiry Check)
- `/api/vote` checks `signers(identityHash, signer)` on-chain for valid expiry
- Only relays votes if both gate 1 and gate 2 pass

## State Management Architecture

**NO JWT/SESSION middleware** - state management is entirely client-side:
- `hasPasskey()` checks localStorage for passkeyInfo
- `hasValidSession()` checks localStorage sessionKey expiry
- No HTTP cookies, no auth headers, no middleware
- Component-level state with React.useState (no Redux/Context/Zustand)
