# Schelling Point - Project Overview

## Purpose
Schelling Point is a web2.5 unconference platform that uses quadratic voting for democratic session scheduling and budget distribution.

## Core Voting Mechanisms
1. **Pre-Event Voting** (100 credits default) - participants signal sessions they want to attend to inform scheduling
2. **Attendance Voting** (100 credits default) - participants vote during event via taps to determine session budget distribution

## Technology Stack

### Frontend
- Next.js 14.2 (React 18.3, TypeScript 5)
- Radix UI (accordion, checkbox, dialog, dropdown, progress, radio, select, tabs, tooltip)
- Tailwind CSS 3.4.1
- Framer Motion 11.0.8
- Lucide React Icons

### Database
- Supabase PostgreSQL with Row Level Security (RLS)

### Testing
- Playwright 1.57

### Blockchain (Base L2)
- WebAuthn passkeys (secp256r1) for identity
- RIP-7212 precompile for P256 signature verification
- Custom SchellingPointVotes contract for on-chain voting
- Ephemeral k1 signers for seamless UX

## Authentication Architecture
Uses passkey-based authentication (NOT Safe wallets):
- WebAuthn passkeys for identity
- Ephemeral session keys authorized by passkey
- Supabase Edge Functions as relayer
- No external auth providers (no Web3Auth/Privy)

## Project Status
- Frontend MVP mostly complete with component library
- Database schema fully designed with migrations
- Smart contract implemented and tested
- API routes created for passkey auth and voting
