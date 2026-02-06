# Quadratic Voting Implementation

## Mathematical Model
Credits spent = (Total votes)²

| Votes | Total Credits | Marginal Cost |
|-------|---------------|---------------|
| 1     | 1 (1²)        | 1             |
| 2     | 4 (2²)        | +3            |
| 3     | 9 (3²)        | +5            |
| 4     | 16 (4²)       | +7            |

## Utility Functions (src/lib/utils.ts)

```typescript
// Calculate total cost for n votes
calculateQuadraticCost(votes) = votes²

// Calculate cost to add one more vote
calculateNextVoteCost(currentVotes) = 2 * currentVotes + 1

// Calculate max votes possible with credits
calculateMaxVotes(availableCredits) = floor(sqrt(credits))
// Example: 100 credits → 10 votes max

// Time formatting
formatTimeRemaining(deadline) // countdown formatting

// Address formatting
truncateAddress(address) // wallet address formatting

// Display formatters
formatCurrency, formatPercentage, formatCredits
```

## Two Voting Phases

### Pre-Event Voting
- **Purpose**: Signal demand to influence scheduling
- **Budget**: 100 credits default (configurable)
- **Timing**: After proposals close until deadline (24h before event)
- **Mental model**: "Concentrate votes on must-have sessions"
- **Output**: Feeds into scheduling algorithm

### Attendance Voting (Tap-to-Vote)
- **Purpose**: Distribute budget based on actual value delivered
- **Budget**: 100 fresh credits (separate from pre-votes)
- **Interface**: 140x140px circular button with scale animation
- **Feedback**: Ripple animation, shows votes/credits
- **Output**: QF scores for distribution

## Quadratic Funding Distribution

```
QF Score = (Σ √individual_votes)²
```

### Example
- Session A: Voter1=4, Voter2=1, Voter3=1 → QF = (2+1+1)² = 16
- Session B: Voter1=1, Voter2=4, Voter3=0 → QF = (1+2+0)² = 9
- Session C: Voter1=1, Voter2=1, Voter3=4 → QF = (1+1+2)² = 16

```
Session payout = (Session QF / Total QF) × Total Budget × (1 - Platform Fee)
```

## Design Philosophy
- **Prevents plutocracy**: Can't efficiently dump votes on one session
- **Captures intensity**: More votes = stronger signal, but diminishing returns
- **Encourages breadth**: Spreading votes is credit-efficient
- **Privacy**: Only aggregates exposed, not individual votes

## TypeScript Types
```typescript
interface PreVote {
  id, eventId, sessionId, userId, voteCount, creditsSpent
}

interface AttendanceVote {
  id, eventId, sessionId, userId, voteCount, creditsSpent,
  voteMethod: 'app' | 'burner_card' | 'manual'
}

interface UserVoteBalance {
  totalCredits, spentCredits, remainingCredits // per event
}
```
