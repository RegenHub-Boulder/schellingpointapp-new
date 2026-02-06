# Testing Infrastructure

## Playwright E2E Tests

Located in `/tests/auth-flow.spec.ts`

### Current Test Coverage

1. **Auth Flow** - Complete user journey landing → sessions
   - Verifies auth modal opens
   - Tests email magic link flow (demo simulation)
   - Tests wallet connection flow
   - Verifies profile setup modal appears
   - Tests profile form completion
   - Tests onboarding tutorial walkthrough
   - Verifies navigation to sessions page

2. **Wallet Auth Flow**
   - Wallet connection UI flow
   - Success state verification

3. **Header Navigation**
   - "Enter Event" button opens auth

4. **View Sessions**
   - "View Sessions" button navigates without auth

5. **Landing Page**
   - Event information displays
   - FAQ accordion functionality

6. **Sessions Page**
   - Sessions list displays

### Test Selectors
Uses data-testid attributes:
- `auth-modal`, `email-auth-btn`
- `profile-setup-modal`, `onboarding-modal`

### Playwright Config
- Browser support: Chromium, Firefox, WebKit

### Current Limitation
Tests verify UI flows but not backend integration since API endpoints use demo/simulation logic.

## Foundry Smart Contract Tests

Located in `/contracts/test/SchellingPointVotes.t.sol`

### P256 Precompile Testing Strategy
The P256 precompile at `0x...100` only exists on Base networks.

**Local Testing Solution:**
- Use `vm.store()` cheatcodes to manually set authorization state
- Bypasses P256 signature check
- Tests all voting logic, expiry checks, nonce increments

**Full Integration Testing:**
```bash
forge test --fork-url https://sepolia.base.org
```

### Test Results
- 9 tests pass locally (P256 bypassed)
- 1 test (authorizeSigner) skipped unless on Base chain
