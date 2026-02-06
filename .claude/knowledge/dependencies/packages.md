# Project Dependencies

## Frontend Core
- **Next.js 14.2** - React framework
- **React 18.3** - UI library
- **TypeScript 5** - Type safety

## UI Libraries
- **Radix UI** - Accessible component primitives
  - accordion, checkbox, dialog, dropdown
  - progress, radio, select, tabs, tooltip
- **Tailwind CSS 3.4.1** - Utility-first CSS
- **Framer Motion 11.0.8** - Animation library
- **Lucide React** - Icon library
- **class-variance-authority** - Component variants

## Database
- **@supabase/supabase-js ^2.89.0** - Supabase client

## Blockchain & WebAuthn
- **ethers ^6.16.0** - Ethereum library v6
  - Contract interaction
  - Wallet creation
  - Message signing
- **@simplewebauthn/browser ^13.2.2** - WebAuthn client utilities
- **cbor-web ^10.0.11** - CBOR decoding for WebAuthn attestation parsing
  - Custom `extractPublicKey()` in `src/lib/webauthn.ts` handles P-256 key extraction

## Authentication Strategy: No JWT

**Important**: The project deliberately avoids JWT/session middleware:
- No jsonwebtoken or jwt-decode libraries
- No express-session or next-auth
- Authentication is passkey-based with ephemeral signers

State is managed entirely client-side via localStorage:
- Passkey info: `{ credentialId, userId, pubKeyX, pubKeyY }`
- Session key: `{ privateKey, address, expiry }`
- No HTTP cookies, no auth headers, no middleware

**Design principle for future login flow**:
- Follow same localStorage pattern for consistency
- Use existing Gate 1 (database passkey validation)
- Store session data in localStorage matching ephemeral wallet pattern
- NO jwt library needed - continue using localStorage + contract state

## Testing
- **@playwright/test ^1.57.0** - E2E testing
- **Foundry** - Smart contract testing
  - forge, anvil, cast

## Build & Dev
- Next.js build system
- ESLint for linting

## Smart Contract (Foundry)
- **Solidity 0.8.30**
- **EVM Version**: cancun
- **Network**: Base Sepolia / Base Mainnet

## Note on CBOR
The cbor-web library is specifically needed because WebAuthn attestationObject is CBOR-encoded. We extract P-256 public key coordinates (x, y - 32 bytes each) from the COSE-formatted credential public key.
