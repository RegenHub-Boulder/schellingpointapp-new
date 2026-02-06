# Schelling Point Knowledge Map

> Last updated: 2025-12-19

## Architecture
- [Project Overview](architecture/project-overview.md) - Tech stack, purpose, and status
- [Passkey Auth System](architecture/passkey-auth-system.md) - WebAuthn authentication flow, three-gate security model, localStorage state management

## Database
- [Supabase Schema](database/supabase-schema.md) - 15 tables with RLS policies, passkey migration

## Frontend
- [Component Structure](frontend/component-structure.md) - UI components, page organization, auth component flow

## Patterns
- [Quadratic Voting](patterns/quadratic-voting.md) - Voting mechanics, QF distribution, utility functions

## API
- [Routes](api/routes.md) - Multi-gate security pattern, implemented endpoints, planned endpoints

## Blockchain
- [Smart Contract](blockchain/smart-contract.md) - SchellingPointVotes contract, RIP-7212, deployment

## Dependencies
- [Packages](dependencies/packages.md) - Frontend, blockchain, WebAuthn dependencies, No JWT strategy

## Testing
- [Playwright Setup](testing/playwright-setup.md) - E2E tests and Foundry contract tests

## Config
- [Environment Variables](config/environment-variables.md) - Required env vars for frontend, backend, and deployment
