I'll create a comprehensive, professional PRD with the precision you need. Let me think through every mechanism carefully.

---

# Schelling Point

## Self-Organizing Unconference Platform

### Product Requirements Document v3.0

---

## 1\. Product Overview

### 1.1 What Is Schelling Point?

Schelling Point is a web2.5 platform that transforms how unconferences work by introducing two synchronized voting mechanisms:

1. **Pre-Event Voting** — Participants signal which sessions they want to attend, enabling intelligent scheduling  
2. **Attendance Voting** — Participants allocate fresh credits during the event via taps, determining how session budgets are distributed

Both phases use **quadratic voting**: each additional vote for a session costs exponentially more credits, creating nuanced preference signals rather than binary attendance.

### 1.2 Core Innovation

Traditional unconferences suffer from:

- Scheduling conflicts (popular sessions compete)  
- Unfair compensation (no connection between value and payment)  
- Poor signal quality (show of hands doesn't capture intensity)

Schelling Point solves this with **quadratic preference signaling** at two moments, creating a complete picture of demand (before) and delivered value (during).

### 1.3 Business Model

| Tier | Features | Revenue |
| :---- | :---- | :---- |
| **Free** | Core voting, scheduling, up to 100 participants | None |
| **Standard** | NFT gating, budget distribution, up to 500 participants | 5% of distributed funds |
| **Premium** | Burner cards, AI transcription, RAG chatbot, unlimited | 7% \+ transcription fees |
| **Enterprise** | White-label, custom integrations, SLA | Custom pricing |

---

## 2\. Voting Mechanism Design

### 2.1 Quadratic Voting Fundamentals

Both voting phases use the same mathematical model:

```
Credits spent = (Total votes for session)²

Vote 1 → 1 credit spent (1² = 1)
Vote 2 → 4 credits total (2² = 4, so 3 additional)
Vote 3 → 9 credits total (3² = 9, so 5 additional)
Vote 4 → 16 credits total (4² = 16, so 7 additional)
...
```

**Why quadratic?**

- Prevents plutocracy: Can't dump all votes on one session efficiently  
- Captures preference intensity: More votes \= stronger signal, but diminishing returns  
- Encourages breadth: Spreading votes is credit-efficient

### 2.2 Pre-Event Voting (Schedule Influence)

**Purpose:** Signal demand to inform scheduling algorithm

| Parameter | Default | Configurable |
| :---- | :---- | :---- |
| Credits per participant | 100 | Yes (50-200) |
| Voting period | Opens when proposals close | Yes |
| Deadline | 24h before event | Yes |
| Vote visibility | Hidden until deadline | Yes |
| Minimum to schedule | None (admin discretion) | Yes |

**User Mental Model:**

"I have 100 credits. Each session I vote for costs me votes². If I give 5 votes to one session, that costs 25 credits. If I spread 2 votes each across 5 sessions, that costs 20 credits total. I should concentrate votes on sessions I really want."

**Algorithm Input:**

- Sessions ranked by total quadratic votes  
- Voter overlap matrix (which sessions share voters)  
- Demand distribution across formats/durations

### 2.3 Attendance Voting (Budget Allocation)

**Purpose:** Distribute session budget based on delivered value

| Parameter | Default | Configurable |
| :---- | :---- | :---- |
| Credits per participant | 100 (fresh) | Yes |
| Voting method | App tap OR Burner card | Yes |
| Taps per session | Unlimited (credit-constrained) | No |
| When voting closes | Event end \+ 1 hour | Yes |

**Critical Design Decision:** Credits reset completely for attendance voting. This creates two independent signals:

1. Pre-votes \= "What I want to exist"  
2. Attendance votes \= "What delivered value"

**User Mental Model:**

"I have 100 fresh credits for voting during the event. When I attend a session, I tap to vote. Each tap is a vote, and votes cost quadratically. If a session is amazing, I can tap multiple times to give it more of the budget. But each additional tap costs more, so I should be thoughtful."

**Tap-to-Vote Interaction:**

```
┌─────────────────────────────────────────────────────┐
│  You're at: "DAO Governance Deep Dive"              │
│  Hosted by: Alice Chen                              │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │                                             │   │
│  │              [ TAP TO VOTE ]                │   │
│  │                                             │   │
│  │         Your votes: ●●●○○ (3 votes)         │   │
│  │         Credits spent: 9 of 100             │   │
│  │                                             │   │
│  │    Tap again: +1 vote (costs 7 more)        │   │
│  │                                             │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  Credits remaining: 91                              │
│  Sessions voted on today: 4                         │
└─────────────────────────────────────────────────────┘
```

### 2.4 Budget Distribution Formula

```
Session share = (Σ √individual_votes)² / Σ all_session_shares

Session payout = Session share × Total budget pool × (1 - platform_fee)
```

This is **quadratic funding** applied to the aggregated votes:

- Square root of each person's votes (diminishes whale influence)  
- Sum of square roots, then squared (rewards breadth of support)  
- Normalized across all sessions

**Example:**

| Session | Voter A | Voter B | Voter C | QF Score | Share |
| :---- | :---- | :---- | :---- | :---- | :---- |
| DAO Talk | 4 votes | 1 vote | 1 vote | (2+1+1)² \= 16 | 40% |
| Workshop | 1 vote | 4 votes | 0 | (1+2+0)² \= 9 | 22.5% |
| Panel | 1 vote | 1 vote | 4 votes | (1+1+2)² \= 16 | 40% |

---

## 3\. User Types & Permissions

### 3.1 Participant

**Can:**

- Sign in via wallet or email  
- View all sessions (proposed and scheduled)  
- Propose sessions  
- Vote in pre-event phase  
- Vote during attendance phase  
- Request session mergers  
- View their vote history  
- Receive budget distributions

**Cannot:**

- Approve/reject sessions  
- Modify schedule  
- Access admin analytics  
- Trigger distributions

### 3.2 Session Host

A participant who has proposed an approved session.

**Additional Capabilities:**

- Edit their session details (until scheduled)  
- Accept/decline/negotiate merger requests  
- Upload session materials (transcript, slides)  
- View detailed analytics for their session

### 3.3 Admin

**Full Control:**

- All participant capabilities  
- Configure event settings  
- Manage access lists (email/NFT)  
- Approve/reject sessions  
- Initiate merger suggestions  
- Run scheduling algorithm  
- Manually adjust schedule  
- Trigger budget distribution  
- Export all data  
- Access full analytics

### 3.4 Permission Matrix

| Action | Participant | Host | Admin |
| :---- | :---- | :---- | :---- |
| View sessions | ✓ | ✓ | ✓ |
| Propose session | ✓ | ✓ | ✓ |
| Pre-vote | ✓ | ✓ | ✓ |
| Attendance vote | ✓ | ✓ | ✓ |
| Request merger | ✓ | ✓ | ✓ |
| Accept merger | — | ✓ (own sessions) | ✓ |
| Edit session | — | ✓ (own sessions) | ✓ (all) |
| Approve session | — | — | ✓ |
| Run scheduler | — | — | ✓ |
| Adjust schedule | — | — | ✓ |
| Trigger distribution | — | — | ✓ |

---

## 4\. Detailed User Journeys

### 4.1 Journey: New Participant Onboarding

**Actors:** New participant, System **Precondition:** User has received event invite (email link or NFT) **Goal:** Successfully access event and understand how to participate

**Flow:**

```
Step 1: Landing
━━━━━━━━━━━━━━━
User clicks invite link → Event landing page

Page shows:
- Event name, dates, location
- Brief description
- "Enter Event" CTA button
- FAQ accordion (What is quadratic voting? How do I propose a session?)

Step 2: Authentication
━━━━━━━━━━━━━━━━━━━━━
User clicks "Enter Event" → Auth modal appears

┌──────────────────────────────────────┐
│         Enter [Event Name]           │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   🔐 Connect Wallet            │  │
│  └────────────────────────────────┘  │
│                                      │
│  ┌────────────────────────────────┐  │
│  │   ✉️  Continue with Email       │  │
│  └────────────────────────────────┘  │
│                                      │
│  By continuing, you agree to our     │
│  Terms of Service and Privacy Policy │
└──────────────────────────────────────┘

Path A: Wallet Connection
- User selects wallet provider (MetaMask, WalletConnect, Coinbase)
- Signs message to verify ownership
- System checks: NFT ownership OR wallet on whitelist
- If valid → proceed to Step 3
- If invalid → "You need a ticket" screen with purchase/mint link

Path B: Email Sign-In
- User enters email address
- Receives magic link (or enters code)
- Privy creates embedded wallet invisibly
- System checks: email on whitelist
- If valid → proceed to Step 3
- If invalid → "You're not on the list" screen with contact info

Step 3: First-Time Setup
━━━━━━━━━━━━━━━━━━━━━━━
User authenticated → Profile setup modal

┌──────────────────────────────────────┐
│         Welcome to [Event]!          │
│                                      │
│  Display name:                       │
│  ┌────────────────────────────────┐  │
│  │ Alice Chen                     │  │
│  └────────────────────────────────┘  │
│                                      │
│  Short bio (optional):               │
│  ┌────────────────────────────────┐  │
│  │ Web3 researcher @ Protocol Labs│  │
│  └────────────────────────────────┘  │
│                                      │
│  Topics you're interested in:        │
│  [Governance] [DeFi] [DAOs] [+]      │
│                                      │
│         [Complete Setup →]           │
└──────────────────────────────────────┘

Step 4: Onboarding Tutorial
━━━━━━━━━━━━━━━━━━━━━━━━━━━
User completes setup → Guided tutorial overlay

Tutorial cards (swipeable):

Card 1: "How This Unconference Works"
- Sessions are proposed by participants like you
- You vote to help decide what gets scheduled
- You vote again during the event to allocate budget

Card 2: "Quadratic Voting"
- You have 100 credits to spend
- Each vote costs more: 1→1, 2→4, 3→9 credits
- Spread votes = efficient, concentrate = strong signal
- [Interactive demo: try allocating votes]

Card 3: "Two Voting Phases"
- Now: Vote on proposed sessions (influences schedule)
- At event: Tap to vote (determines who gets paid)
- Both use fresh 100 credits

Card 4: "Ready to Explore"
- Browse sessions and cast your votes
- Propose a session if you have something to share
- [Enter Event →]

Step 5: Event Dashboard
━━━━━━━━━━━━━━━━━━━━━━━
User completes tutorial → Main event dashboard

Dashboard shows:
- Event status banner (Proposal phase / Voting phase / Live)
- Quick stats (X sessions proposed, Y participants, Z days until event)
- Navigation tabs: Sessions | Schedule | My Activity
- Floating action button: [+ Propose Session]
```

**Success Criteria:**

- User completes authentication in \<60 seconds  
- User understands voting mechanics (validated by tutorial completion)  
- User can navigate to sessions and begin participating

---

### 4.2 Journey: Session Proposal

**Actors:** Participant (potential host), Admin **Precondition:** User is authenticated, proposals are open **Goal:** Successfully submit a session proposal

**Flow:**

```
Step 1: Initiate Proposal
━━━━━━━━━━━━━━━━━━━━━━━━
User clicks [+ Propose Session] → Proposal form opens

Step 2: Basic Information
━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│  Propose a Session                    [Cancel]   │
├──────────────────────────────────────────────────┤
│                                                  │
│  Session Title *                                 │
│  ┌────────────────────────────────────────────┐  │
│  │ Building DAOs That Actually Work           │  │
│  └────────────────────────────────────────────┘  │
│  Keep it clear and specific (5-80 characters)    │
│                                                  │
│  Description *                                   │
│  ┌────────────────────────────────────────────┐  │
│  │ We'll explore practical governance         │  │
│  │ frameworks that have worked for DAOs       │  │
│  │ at different scales. I'll share case       │  │
│  │ studies from MakerDAO, Gitcoin, and       │  │
│  │ smaller community DAOs, then open for      │  │
│  │ collaborative discussion on patterns...    │  │
│  └────────────────────────────────────────────┘  │
│  What will happen? Who should attend? (50-500)   │
│                                                  │
│                              [Next: Format →]    │
└──────────────────────────────────────────────────┘

Step 3: Session Format
━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│  Propose a Session                    [Cancel]   │
├──────────────────────────────────────────────────┤
│  [← Back]                    Step 2 of 4         │
│                                                  │
│  Session Format *                                │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │   🎤 Talk    │  │ 🛠 Workshop  │             │
│  │  One speaker │  │  Hands-on   │             │
│  │  presents    │  │  activity   │             │
│  │  [Selected]  │  │             │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌──────────────┐  ┌──────────────┐             │
│  │ 💬 Discussion│  │  👥 Panel   │             │
│  │  Facilitated │  │  Multiple   │             │
│  │  conversation│  │  speakers   │             │
│  └──────────────┘  └──────────────┘             │
│                                                  │
│  ┌──────────────┐                               │
│  │  🖥 Demo     │                               │
│  │  Show how    │                               │
│  │  something   │                               │
│  │  works       │                               │
│  └──────────────┘                               │
│                                                  │
│  Duration *                                      │
│  ○ 30 min   ● 60 min   ○ 90 min                 │
│                                                  │
│                              [Next: Details →]   │
└──────────────────────────────────────────────────┘

Step 4: Additional Details
━━━━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│  Propose a Session                    [Cancel]   │
├──────────────────────────────────────────────────┤
│  [← Back]                    Step 3 of 4         │
│                                                  │
│  Technical Requirements (optional)               │
│  ☑ Projector/screen                             │
│  ☐ Whiteboard                                   │
│  ☐ Audio system (for larger rooms)              │
│  ☐ Specific seating arrangement                 │
│  ☐ Other: _______________                       │
│                                                  │
│  Maximum Participants (optional)                 │
│  ┌────────────────────────────────────────────┐  │
│  │ 30                                         │  │
│  └────────────────────────────────────────────┘  │
│  Leave blank for no limit (venue capacity)       │
│                                                  │
│  Topic Tags                                      │
│  [Governance] [DAOs] [+Add tag]                  │
│                                                  │
│  Co-hosts (optional)                             │
│  ┌────────────────────────────────────────────┐  │
│  │ Search participants...                     │  │
│  └────────────────────────────────────────────┘  │
│  They'll be notified and can accept/decline      │
│                                                  │
│                              [Next: Review →]    │
└──────────────────────────────────────────────────┘

Step 5: Review & Submit
━━━━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│  Propose a Session                    [Cancel]   │
├──────────────────────────────────────────────────┤
│  [← Back]                    Step 4 of 4         │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │  PREVIEW                                   │  │
│  │                                            │  │
│  │  Building DAOs That Actually Work          │  │
│  │  ─────────────────────────────────         │  │
│  │  🎤 Talk  •  60 min  •  Max 30 people      │  │
│  │                                            │  │
│  │  We'll explore practical governance        │  │
│  │  frameworks that have worked for DAOs      │  │
│  │  at different scales...                    │  │
│  │                                            │  │
│  │  Host: Alice Chen                          │  │
│  │  Tags: Governance, DAOs                    │  │
│  │  Needs: Projector                          │  │
│  └────────────────────────────────────────────┘  │
│                                                  │
│  ⓘ Your session will be reviewed by the         │
│    event organizers before appearing to          │
│    other participants.                           │
│                                                  │
│  ┌────────────────────────────────────────────┐  │
│  │           Submit Proposal                  │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘

Step 6: Confirmation
━━━━━━━━━━━━━━━━━━━━

┌──────────────────────────────────────────────────┐
│               🎉 Session Proposed!               │
│                                                  │
│  "Building DAOs That Actually Work"              │
│                                                  │
│  Status: Pending Review                          │
│                                                  │
│  What happens next:                              │
│  1. Organizers review your proposal              │
│  2. You'll be notified when approved             │
│  3. Participants can then vote on your session   │
│                                                  │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ View Session │  │ Back to Sessions         │  │
│  └──────────────┘  └──────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

**Admin Side:**

- Admin receives notification of new proposal  
- Reviews in admin dashboard  
- Can: Approve / Request Changes / Decline  
- On approval, session enters voting pool  
- Proposer notified of status change

---

### 4.3 Journey: Pre-Event Voting

**Actors:** Participant **Precondition:** User authenticated, voting period open, sessions approved **Goal:** Allocate pre-vote credits across sessions

**Flow:**

```
Step 1: Access Voting Interface
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User navigates to Sessions tab → Voting interface loads

Step 2: Browse & Vote
━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────┐
│  PRE-EVENT VOTING                                          │
│  Help decide what gets scheduled • Closes in 2d 14h        │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Credits: ████████████████████░░░░░  80/100 remaining     │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Filter: [All Formats ▼] [All Durations ▼] [Search]  │   │
│  │ Sort by: [Most Voted ▼]                             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🎤 Building DAOs That Actually Work                │   │
│  │  Alice Chen • 60 min                                │   │
│  │                                                     │   │
│  │  We'll explore practical governance frameworks...   │   │
│  │                                                     │   │
│  │  [Governance] [DAOs]                                │   │
│  │                                                     │   │
│  │  Your votes: [−] ●●●○○○○○○○ [+]                     │   │
│  │              3 votes (9 credits)                    │   │
│  │                                                     │   │
│  │  Next vote costs: 7 more credits                    │   │
│  │                                        [View Full →]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  🛠 Zero-Knowledge Proofs Workshop                  │   │
│  │  Bob Smith • 90 min                                 │   │
│  │                                                     │   │
│  │  Hands-on workshop building your first ZK...        │   │
│  │                                                     │   │
│  │  [Cryptography] [Technical]                         │   │
│  │                                                     │   │
│  │  Your votes: [−] ●○○○○○○○○○ [+]                     │   │
│  │              1 vote (1 credit)                      │   │
│  │                                                     │   │
│  │  Next vote costs: 3 more credits                    │   │
│  │                                        [View Full →]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  💬 The Future of Regenerative Finance              │   │
│  │  Carol Williams • 60 min                            │   │
│  │  ...                                                │   │
│  │                                                     │   │
│  │  Your votes: [−] ●●○○○○○○○○ [+]                     │   │
│  │              2 votes (4 credits)                    │   │
│  │                                                     │   │
│  │  Next vote costs: 5 more credits                    │   │
│  │                                        [View Full →]│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  [Load more sessions...]                                   │
│                                                            │
└────────────────────────────────────────────────────────────┘

Step 3: Adjust Votes
━━━━━━━━━━━━━━━━━━━━
User taps [+] or [−] → Vote count updates

On [+] tap:
- Check if user has enough credits
- If yes: increment vote, deduct credits, animate feedback
- If no: show "Not enough credits" tooltip, shake credit bar

On [−] tap:
- Decrement vote (minimum 0)
- Refund credits
- Animate feedback

Visual feedback:
- Vote dots fill/empty with animation
- Credit bar animates smoothly
- Cost preview updates in real-time

Step 4: View Session Detail
━━━━━━━━━━━━━━━━━━━━━━━━━━━
User taps [View Full →] → Session detail modal

┌────────────────────────────────────────────────────────────┐
│  Building DAOs That Actually Work                [Close X] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Host: Alice Chen                                          │
│  🎤 Talk  •  60 min  •  Max 30 participants                │
│                                                            │
│  ───────────────────────────────────────────────────────   │
│                                                            │
│  We'll explore practical governance frameworks that have   │
│  worked for DAOs at different scales. I'll share case      │
│  studies from MakerDAO, Gitcoin, and smaller community     │
│  DAOs, then open for collaborative discussion on patterns  │
│  that work and antipatterns to avoid.                      │
│                                                            │
│  Topics covered:                                           │
│  • Governance token distribution strategies                │
│  • Proposal frameworks and voting mechanisms               │
│  • Delegation and representative systems                   │
│  • Real-world failure modes and how to avoid them          │
│                                                            │
│  Best for: Anyone building or participating in DAOs        │
│  who wants practical, battle-tested insights.              │
│                                                            │
│  ───────────────────────────────────────────────────────   │
│                                                            │
│  Technical needs: Projector                                │
│  Tags: [Governance] [DAOs]                                 │
│                                                            │
│  ───────────────────────────────────────────────────────   │
│                                                            │
│  Your votes: [−] ●●●○○○○○○○ [+]   3 votes (9 credits)      │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              🔗 Propose Merger                       │  │
│  │   Have a similar session? Combine forces!           │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘

Step 5: Review Vote Portfolio
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User scrolls to bottom or taps "My Votes" → Portfolio view

┌────────────────────────────────────────────────────────────┐
│  YOUR VOTE PORTFOLIO                                       │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Credits used: 20/100                                      │
│  Sessions voted on: 4                                      │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Building DAOs...          ●●●○○○  3 votes  9 cr    │   │
│  │  ZK Workshop               ●○○○○○  1 vote   1 cr    │   │
│  │  Regenerative Finance      ●●○○○○  2 votes  4 cr    │   │
│  │  MEV Deep Dive             ●●○○○○  2 votes  4 cr    │   │
│  │                            ──────────────────────   │   │
│  │                            TOTAL:           18 cr   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  💡 Tip: You have 82 credits left. Consider voting on      │
│     more sessions to influence the schedule.               │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Real-time Updates:**

- Vote totals for each session update via WebSocket  
- Other users' votes are aggregated (not individual)  
- No voter identity revealed until after deadline (optional setting)

---

### 4.4 Journey: Session Merger (Participant-Initiated)

**Actors:** Participant (merger requester), Session Host (target) **Precondition:** User has proposed a session, views similar session **Goal:** Combine two sessions into a stronger collaborative session

**Flow:**

```
Step 1: Identify Merger Opportunity
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
User browses sessions → Sees similar topic
User opens session detail → Clicks [Propose Merger]

Step 2: Merger Proposal Form
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────┐
│  Propose Merger                                  [Cancel X]│
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Combining:                                                │
│                                                            │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  YOUR SESSION                                       │   │
│  │  "Practical DAO Governance Patterns"                │   │
│  │  🎤 Talk • 60 min                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          +                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  THEIR SESSION                                      │   │
│  │  "Building DAOs That Actually Work"                 │   │
│  │  Host: Alice Chen                                   │   │
│  │  🎤 Talk • 60 min                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                          ↓                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  MERGED SESSION                                     │   │
│  │                                                     │   │
│  │  Proposed title: *                                  │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ DAO Governance: Patterns & Practices          │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  │                                                     │   │
│  │  Merger type: *                                     │   │
│  │  ○ Co-presentation (split time equally)            │   │
│  │  ● Panel discussion (moderated multi-voice)        │   │
│  │  ○ Workshop progression (sequential activities)    │   │
│  │  ○ Structured dialogue (back-and-forth)            │   │
│  │                                                     │   │
│  │  Duration: *                                        │   │
│  │  ○ 60 min   ● 90 min                               │   │
│  │                                                     │   │
│  │  Why merge? (visible to other host)                │   │
│  │  ┌───────────────────────────────────────────────┐  │   │
│  │  │ Our sessions cover very similar ground and    │  │   │
│  │  │ I think our different perspectives would      │  │   │
│  │  │ create a richer experience together...        │  │   │
│  │  └───────────────────────────────────────────────┘  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                  Send Proposal                       │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
└────────────────────────────────────────────────────────────┘

Step 3: Notification to Target Host
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
System sends notification to Alice:

┌────────────────────────────────────────────────────────────┐
│  🔗 Merger Request                                         │
│                                                            │
│  Bob Smith wants to merge sessions with you!               │
│                                                            │
│  "Practical DAO Governance Patterns" (Bob's session)       │
│  + "Building DAOs That Actually Work" (your session)       │
│  → "DAO Governance: Patterns & Practices"                  │
│                                                            │
│  Format: Panel discussion (90 min)                         │
│                                                            │
│  Bob's message:                                            │
│  "Our sessions cover very similar ground and I think       │
│   our different perspectives would create a richer..."     │
│                                                            │
│  ┌────────────┐ ┌────────────┐ ┌────────────────────────┐  │
│  │  Accept    │ │  Decline   │ │  Counter-propose       │  │
│  └────────────┘ └────────────┘ └────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

Step 4A: Accept Merger
━━━━━━━━━━━━━━━━━━━━━━
Alice clicks [Accept] → Confirmation modal

"You're about to merge your session with Bob's.
 Both original sessions will be archived.
 A new co-hosted session will be created.
 Votes from both sessions will combine (with 10% bonus)."

[Cancel] [Confirm Merger]

On confirm:
- System creates new merged session
- Both hosts listed as co-hosts
- Original sessions marked as "Merged into [new session]"
- Votes from both sessions transfer to new session × 1.1
- Both hosts notified of successful merge
- Voters on original sessions notified their votes transferred

Step 4B: Counter-Propose
━━━━━━━━━━━━━━━━━━━━━━━━
Alice clicks [Counter-propose] → Edit merger details

Can modify:
- Title
- Merger type
- Duration
- Add message explaining changes

On submit:
- Original requester notified of counter-proposal
- They can accept, decline, or counter again
- Maximum 3 rounds of negotiation before admin escalation

Step 4C: Decline
━━━━━━━━━━━━━━━━
Alice clicks [Decline] → Reason modal (optional)

"Let Bob know why you're declining (optional):"
[Text field]

[Cancel] [Decline Merger]

On decline:
- Requester notified
- Both sessions continue independently
- Can propose again with different terms (once)
```

**Merger States:**

```
PROPOSED → NEGOTIATING → ACCEPTED → EXECUTED
              ↓
           DECLINED
```

**Vote Transfer Logic:** When merger executes:

```
new_session_votes = (original_A_votes + original_B_votes) × 1.1
```

The 10% bonus incentivizes collaboration.

---

### 4.5 Journey: Event Day Check-In & Burner Card

**Actors:** Participant, Check-in Staff **Precondition:** Participant authenticated, event day, burner cards enabled **Goal:** Link burner card to account for tap-to-vote

**Flow:**

```
Step 1: Arrive at Venue
━━━━━━━━━━━━━━━━━━━━━━
Participant arrives → Goes to check-in desk

Step 2: Identity Verification
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Staff: "Welcome! Can I see your ticket?"

Option A: QR Code
- Participant opens app → Profile → Check-in QR
- Staff scans QR code
- System verifies identity and ticket

Option B: Email Lookup
- Participant provides email
- Staff searches in admin interface
- Verifies against photo ID if required

Step 3: Burner Card Activation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Staff retrieves fresh burner card from stack
Staff taps card on activation reader

Staff Interface:
┌────────────────────────────────────────────────────────────┐
│  CHECK-IN: Alice Chen                                      │
│  ✓ Ticket verified                                         │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │        TAP BURNER CARD ON READER                     │  │
│  │                                                      │  │
│  │                   [ Ready... ]                       │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘

Card tapped:
┌────────────────────────────────────────────────────────────┐
│  CHECK-IN: Alice Chen                                      │
│  ✓ Ticket verified                                         │
│  ✓ Burner card linked: #4A7B2C                             │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                   ✓ COMPLETE                         │  │
│  │                                                      │  │
│  │        Card ready for tap-to-vote                    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  [Check in next participant]                               │
└────────────────────────────────────────────────────────────┘

Step 4: Participant Receives Card
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Staff hands card to participant with brief explanation:

"Here's your voting card. When you attend a session, 
tap it on the reader at the entrance. Each tap is a vote.
You can tap multiple times to give more votes, but each 
tap costs more credits. Check your app to see your balance."

Step 5: App Confirmation
━━━━━━━━━━━━━━━━━━━━━━━━
Participant's app updates:

┌────────────────────────────────────────────────────────────┐
│  🎉 You're checked in!                                     │
│                                                            │
│  Burner Card: #4A7B2C (linked)                             │
│  Voting Credits: 100                                       │
│                                                            │
│  Tap your card at session entrances to vote.               │
│  Each tap = 1 vote. Votes cost quadratically.              │
│                                                            │
│  [View Today's Schedule]                                   │
└────────────────────────────────────────────────────────────┘
```

**Alternative: App-Only Check-In (No Burner Card)**

If burner cards not enabled, participant simply:

1. Shows QR code or email  
2. Staff marks as checked in  
3. Participant uses in-app tap-to-vote button at sessions

---

### 4.6 Journey: Attendance Voting (Tap-to-Vote)

**Actors:** Participant **Precondition:** Checked in, at a session, has voting credits **Goal:** Allocate attendance votes to session

**Flow:**

```
Step 1: Enter Session
━━━━━━━━━━━━━━━━━━━━━
Participant enters session room
Sees NFC reader near entrance (if burner cards) OR opens app

Step 2A: Burner Card Tap
━━━━━━━━━━━━━━━━━━━━━━━
Participant taps card on reader

Reader feedback:
- Green LED flash
- Confirmation beep
- Small screen shows: "Vote recorded ✓"

Participant's app updates automatically:
┌────────────────────────────────────────────────────────────┐
│  🗳 Vote Recorded!                                         │
│                                                            │
│  "Building DAOs That Actually Work"                        │
│                                                            │
│  Your votes for this session: ●○○○○  1 vote                │
│  Credits spent: 1                                          │
│                                                            │
│  [Tap again to add another vote]                           │
│  Next vote costs: 3 more credits                           │
│                                                            │
│  ────────────────────────────────────                      │
│  Total credits remaining: 99                               │
└────────────────────────────────────────────────────────────┘

Step 2B: App-Based Tap
━━━━━━━━━━━━━━━━━━━━━
If no burner card, participant uses app:

Opens app → Current session detected (via time) OR manual select

┌────────────────────────────────────────────────────────────┐
│  NOW: Building DAOs That Actually Work                     │
│  10:00 AM - 11:00 AM • Main Hall                           │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                                                      │  │
│  │                 [ TAP TO VOTE ]                      │  │
│  │                                                      │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Your votes: ○○○○○○○○○○                                    │
│  Tap to cast your first vote (costs 1 credit)              │
│                                                            │
│  Credits remaining: 100                                    │
│                                                            │
└────────────────────────────────────────────────────────────┘

Step 3: Multiple Taps (Voting Intensity)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Participant can tap multiple times throughout session:

After 3 taps:
┌────────────────────────────────────────────────────────────┐
│  "Building DAOs That Actually Work"                        │
│                                                            │
│  Your votes: ●●●○○○○○○○  3 votes                           │
│  Credits spent on this session: 9                          │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐  │
│  │                                                      │  │
│  │                 [ TAP TO VOTE ]                      │  │
│  │                                                      │  │
│  │            +1 vote costs 7 more credits              │  │
│  │                                                      │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  Total credits remaining: 91                               │
│                                                            │
│  ─────────────────────────────────────────────────────     │
│  Sessions voted on today:                                  │
│  • Opening Keynote        ●●○○○○  2 votes                  │
│  • This session           ●●●○○○  3 votes                  │
│                                                            │
└────────────────────────────────────────────────────────────┘

Step 4: Credit Exhaustion Warning
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
When credits run low:

┌────────────────────────────────────────────────────────────┐
│  ⚠️ Low Credits                                            │
│                                                            │
│  You have 15 credits remaining.                            │
│                                                            │
│  Adding another vote here costs 11 credits.                │
│  You'll have 4 credits left for remaining sessions.        │
│                                                            │
│  [Vote Anyway]  [Save Credits]                             │
└────────────────────────────────────────────────────────────┘

Step 5: Session Summary
━━━━━━━━━━━━━━━━━━━━━━━
After session ends, participant can review:

┌────────────────────────────────────────────────────────────┐
│  Session Complete                                          │
│                                                            │
│  "Building DAOs That Actually Work"                        │
│  Your final votes: ●●●●○  4 votes (16 credits)             │
│                                                            │
│  Thanks for voting! Your votes help determine how          │
│  the session budget is distributed to hosts.               │
│                                                            │
│  [View Next Session]  [Browse Schedule]                    │
└────────────────────────────────────────────────────────────┘
```

---

### 4.7 Journey: Admin Schedule Generation

**Actors:** Admin **Precondition:** Pre-voting closed, sessions approved **Goal:** Generate optimal schedule using algorithm

**Flow:**

```
Step 1: Access Schedule Builder
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin logs in → Navigates to Event → Schedule tab

Step 2: Review Pre-Vote Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────┐
│  SCHEDULE BUILDER                                    [← Event Home]│
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Status: Pre-voting closed ✓  |  Sessions approved: 24  |          │
│          Participants: 156   |  Schedule: Not generated            │
│                                                                    │
│  ═════════════════════════════════════════════════════════════════ │
│  SESSION DEMAND                                                    │
│  ═════════════════════════════════════════════════════════════════ │
│                                                                    │
│  Rank │ Session                              │ Votes │ Voters │ Fmt │
│  ─────┼──────────────────────────────────────┼───────┼────────┼─────│
│  1    │ Building DAOs That Actually Work     │ 127   │ 68     │ 🎤  │
│  2    │ ZK Proofs Workshop                   │ 98    │ 42     │ 🛠   │
│  3    │ The Future of L2s                    │ 89    │ 51     │ 🎤  │
│  4    │ Regenerative Finance Panel           │ 84    │ 47     │ 👥  │
│  5    │ MEV Deep Dive                        │ 76    │ 38     │ 🎤  │
│  ...  │ ...                                  │ ...   │ ...    │ ... │
│  24   │ NFT Art Showcase                     │ 12    │ 9      │ 🖥   │
│                                                                    │
│  [View Full Ranking] [Export Data]                                 │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Step 3: Review Audience Clusters
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────┐
│  AUDIENCE CLUSTERS                                                 │
│  Sessions that share voters (should NOT overlap in schedule)       │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ⚠️ HIGH OVERLAP (>60% shared voters)                              │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  "Building DAOs" ←── 73% overlap ──→ "Governance Patterns"  │   │
│  │  These sessions must be in different time slots             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  "ZK Workshop" ←── 65% overlap ──→ "Cryptography 101"       │   │
│  │  These sessions must be in different time slots             │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  ✓ GOOD PARALLEL OPTIONS (<20% overlap)                            │
│                                                                    │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  "DAO Governance" ←── 12% ──→ "NFT Art" ←── 8% ──→ "DeFi"   │   │
│  │  These can safely run at the same time                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                    │
│  [View Full Cluster Analysis]                                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Step 4: Configure Constraints
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────┐
│  SCHEDULING CONSTRAINTS                                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Venues:                                                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Main Hall       │ 150 cap │ Projector, Audio │ All formats  │  │
│  │  Workshop Room A │ 40 cap  │ Whiteboard       │ Workshops    │  │
│  │  Workshop Room B │ 30 cap  │ Whiteboard       │ Workshops    │  │
│  │  Breakout 1      │ 25 cap  │ Basic AV         │ Discussions  │  │
│  │  Breakout 2      │ 20 cap  │ Basic AV         │ Discussions  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  [Edit Venues]                                                     │
│                                                                    │
│  Time Slots:                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  9:00 - 9:30    │ Opening / Keynote (locked)                 │  │
│  │  9:45 - 10:45   │ Session Block 1 (60 min)                   │  │
│  │  11:00 - 12:00  │ Session Block 2 (60 min)                   │  │
│  │  12:00 - 1:00   │ Lunch (locked)                             │  │
│  │  1:00 - 2:30    │ Session Block 3 (90 min)                   │  │
│  │  2:45 - 3:45    │ Session Block 4 (60 min)                   │  │
│  │  4:00 - 5:00    │ Session Block 5 (60 min)                   │  │
│  │  5:15 - 6:15    │ Closing / Social (locked)                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│  [Edit Time Slots]                                                 │
│                                                                    │
│  Manual Constraints:                                               │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  + "ZK Workshop" MUST be in Workshop Room A (needs setup)    │  │
│  │  + "Keynote" LOCKED to 9:00 AM Main Hall                     │  │
│  │  + Alice (host) unavailable 1:00-2:30 PM                     │  │
│  │  [+ Add Constraint]                                          │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Step 5: Run Algorithm
━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────┐
│  GENERATE SCHEDULE                                                 │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Algorithm will optimize for:                                      │
│  ✓ Minimize audience conflicts (cluster separation)                │
│  ✓ Match venue capacity to session demand                          │
│  ✓ Respect all manual constraints                                  │
│  ✓ Balance high-demand sessions across time slots                  │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │                   [ Run Algorithm ]                          │  │
│  │                                                              │  │
│  │            Estimated time: 15-30 seconds                     │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Admin clicks [Run Algorithm] →

┌────────────────────────────────────────────────────────────────────┐
│  GENERATING SCHEDULE...                                            │
│                                                                    │
│  ████████████░░░░░░░░░░░░░░░░  35%                                 │
│                                                                    │
│  ✓ Analyzing voter clusters                                        │
│  ✓ Calculating venue requirements                                  │
│  → Optimizing time slot assignments                                │
│  ○ Resolving conflicts                                             │
│  ○ Final validation                                                │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

Step 6: Review Generated Schedule
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────────────────┐
│  GENERATED SCHEDULE                                              [← Regenerate]   │
├────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                    │
│  Quality Score: 87/100                                                             │
│  ✓ No high-overlap conflicts  ✓ All constraints met  ⚠️ 2 warnings                │
│                                                                                    │
│  ══════════════════════════════════════════════════════════════════════════════   │
│                                                                                    │
│            │ Main Hall (150)  │ Workshop A (40)  │ Breakout 1 (25)  │ Breakout 2   │
│  ──────────┼──────────────────┼──────────────────┼──────────────────┼──────────────│
│  9:00 AM   │ 🔒 Opening       │                  │                  │              │
│            │                  │                  │                  │              │
│  ──────────┼──────────────────┼──────────────────┼──────────────────┼──────────────│
│  9:45 AM   │ DAO Governance   │ ZK Workshop      │ Community DAOs   │ DeFi Basics  │
│  (60 min)  │ 127 votes        │ 98 votes         │ 45 votes         │ 38 votes     │
│            │ ████████████     │ █████████        │ ████             │ ███          │
│  ──────────┼──────────────────┼──────────────────┼──────────────────┼──────────────│
│  11:00 AM  │ Future of L2s    │ MEV Workshop     │ NFT Art          │ Regen Panel  │
│  (60 min)  │ 89 votes         │ 52 votes         │ 12 votes         │ 84 votes     │
│            │ ████████         │ █████            │ █                │ ████████     │
│  ──────────┼──────────────────┼──────────────────┼──────────────────┼──────────────│
│  12:00 PM  │ 🔒 LUNCH         │ 🔒 LUNCH         │ 🔒 LUNCH         │ 🔒 LUNCH     │
│  ──────────┼──────────────────┼──────────────────┼──────────────────┼──────────────│
│  1:00 PM   │ Privacy Panel    │ Smart Contract   │ DAO Legal        │              │
│  (90 min)  │ 67 votes         │ Security (90min) │ 34 votes         │ [EMPTY]      │
│            │ ██████           │ 71 votes         │ ███              │              │
│  ...       │ ...              │ ...              │ ...              │ ...          │
│                                                                                    │
│  ══════════════════════════════════════════════════════════════════════════════   │
│                                                                                    │
│  Warnings:                                                                         │
│  ⚠️ "Regen Panel" (84 votes) assigned to Breakout 2 (20 cap) - may exceed          │
│     Consider moving to Main Hall in 11:00 slot                                     │
│  ⚠️ 4:00 PM Breakout 2 is empty - consider combining rooms                         │
│                                                                                    │
│  [Adjust Manually]  [Accept & Publish]                                             │
│                                                                                    │
└────────────────────────────────────────────────────────────────────────────────────┘

Step 7: Manual Adjustments
━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin can drag-drop sessions between slots/venues

On drag:
- System validates constraints in real-time
- Shows warning if creating conflict
- Recalculates quality score

Step 8: Publish Schedule
━━━━━━━━━━━━━━━━━━━━━━━━
Admin satisfied → Clicks [Accept & Publish]

┌────────────────────────────────────────────────────────────────────┐
│  PUBLISH SCHEDULE                                                  │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  You're about to publish the schedule for [Event Name].            │
│                                                                    │
│  • 24 sessions will be scheduled                                   │
│  • 156 participants will be notified                               │
│  • Schedule will appear on event page and in app                   │
│                                                                    │
│  Send notification to all participants?                            │
│  ● Yes, send push notification and email                           │
│  ○ No, publish quietly                                             │
│                                                                    │
│  [Cancel]  [Publish Schedule]                                      │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

On publish:
- Schedule locked (but can be edited with re-publish)
- Participants notified
- App shows "Schedule" tab as primary
- Session hosts notified of their time slots
```

---

### 4.8 Journey: Admin Budget Distribution

**Actors:** Admin **Precondition:** Event concluded, attendance votes collected **Goal:** Distribute session budget to hosts based on votes

**Flow:**

```
Step 1: Access Distribution Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin navigates to Event → Budget Distribution

Step 2: Review Attendance Results
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────┐
│  BUDGET DISTRIBUTION                                     [← Event Home]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Event Status: Concluded ✓                                             │
│  Session Budget Pool: $10,000 USDC                                     │
│  Platform Fee (5%): $500                                               │
│  Distributable Amount: $9,500                                          │
│                                                                        │
│  ═══════════════════════════════════════════════════════════════════   │
│  ATTENDANCE VOTING RESULTS                                             │
│  ═══════════════════════════════════════════════════════════════════   │
│                                                                        │
│  Participation: 142/156 participants voted (91%)                       │
│  Total votes cast: 847                                                 │
│  Total credits spent: 3,284                                            │
│                                                                        │
│  ───────────────────────────────────────────────────────────────────   │
│                                                                        │
│  Rank │ Session                        │ Votes │ Voters │ QF Score │ $ │
│  ─────┼────────────────────────────────┼───────┼────────┼──────────┼───│
│  1    │ DAO Governance (Alice, Bob)    │ 156   │ 52     │ 18.4%    │$1,748│
│  2    │ ZK Workshop (Carol)            │ 134   │ 38     │ 14.2%    │$1,349│
│  3    │ Future of L2s (David)          │ 98    │ 41     │ 11.8%    │$1,121│
│  4    │ Privacy Panel (Eve, Frank)     │ 89    │ 35     │ 10.1%    │ $960│
│  5    │ MEV Deep Dive (Grace)          │ 76    │ 28     │ 8.7%     │ $827│
│  ...  │ ...                            │ ...   │ ...    │ ...      │ ... │
│  24   │ NFT Art (Zara)                 │ 8     │ 6      │ 1.2%     │ $114│
│                                                                        │
│  [View Full Breakdown] [Export CSV]                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

Step 3: Preview Distribution Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Admin clicks on session row to see details:

┌────────────────────────────────────────────────────────────────────────┐
│  DAO Governance: Patterns & Practices                        [Close X]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Hosts: Alice Chen, Bob Smith (merged session)                         │
│  Time: 9:45 AM - 10:45 AM • Main Hall                                  │
│                                                                        │
│  Voting Breakdown:                                                     │
│  • Total votes received: 156                                           │
│  • Unique voters: 52                                                   │
│  • Average votes per voter: 3.0                                        │
│  • Max votes from single voter: 6                                      │
│                                                                        │
│  Quadratic Funding Calculation:                                        │
│  √1 + √2 + √3 + √4 + √2 + ... (52 voters) = 42.8                       │
│  (42.8)² = 1,832 (session QF score)                                    │
│  1,832 / 9,967 (total) = 18.4% share                                   │
│                                                                        │
│  Payout: $1,748                                                        │
│  • Alice Chen: $874 (50%)                                              │
│  • Bob Smith: $874 (50%)                                               │
│                                                                        │
│  Payout addresses:                                                     │
│  Alice: 0x1234...5678 ✓ (verified)                                     │
│  Bob: 0xabcd...ef01 ✓ (verified)                                       │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

Step 4: Initiate Distribution
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────┐
│  INITIATE DISTRIBUTION                                                 │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Ready to distribute $9,500 to 28 session hosts.                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  DISTRIBUTION SUMMARY                                            │  │
│  │                                                                  │  │
│  │  Total pool:           $10,000.00 USDC                           │  │
│  │  Platform fee (5%):    -  $500.00                                │  │
│  │  ────────────────────────────────                                │  │
│  │  To hosts:              $9,500.00                                │  │
│  │                                                                  │  │
│  │  Recipients: 28 wallets                                          │  │
│  │  Est. gas: ~$2.50 (Base network)                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  Distribution will execute via smart contract on Base.                 │
│  All transactions are transparent and verifiable on-chain.             │
│                                                                        │
│  ☑ I have reviewed all payouts and confirm they are correct            │
│                                                                        │
│  [Cancel]  [Execute Distribution]                                      │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

Step 5: Execution & Confirmation
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Admin clicks [Execute Distribution] →

┌────────────────────────────────────────────────────────────────────────┐
│  EXECUTING DISTRIBUTION...                                             │
│                                                                        │
│  ████████████████████░░░░░░░░░░  65%                                   │
│                                                                        │
│  ✓ Smart contract call initiated                                       │
│  ✓ Transaction submitted (tx: 0x789...abc)                             │
│  → Waiting for confirmation...                                         │
│  ○ Notifying recipients                                                │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘

Completion:

┌────────────────────────────────────────────────────────────────────────┐
│  ✓ DISTRIBUTION COMPLETE                                               │
│                                                                        │
│  $9,500.00 distributed to 28 hosts                                     │
│                                                                        │
│  Transaction: 0x789def...abc123                                        │
│  [View on Block Explorer]                                              │
│                                                                        │
│  All session hosts have been notified via email.                       │
│                                                                        │
│  [Download Report]  [Back to Event]                                    │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5\. Technical Architecture

### 5.1 System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │   Web App       │  │   Mobile PWA    │  │  Admin Panel    │              │
│  │   (Next.js)     │  │   (Same app)    │  │  (Next.js)      │              │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘              │
│           │                    │                    │                       │
│           └────────────────────┼────────────────────┘                       │
│                                │                                            │
├────────────────────────────────┼────────────────────────────────────────────┤
│                         AUTHENTICATION                                      │
│                                │                                            │
│                    ┌───────────┴───────────┐                                │
│                    │        Privy          │                                │
│                    │  (Wallet + Email)     │                                │
│                    │  Account Abstraction  │                                │
│                    └───────────┬───────────┘                                │
│                                │                                            │
├────────────────────────────────┼────────────────────────────────────────────┤
│                           API LAYER                                         │
│                                │                                            │
│  ┌─────────────────────────────┴─────────────────────────────┐              │
│  │                   Next.js API Routes                      │              │
│  │                   /api/events, /api/sessions, etc.        │              │
│  └─────────────────────────────┬─────────────────────────────┘              │
│                                │                                            │
│  ┌─────────────────┐           │           ┌─────────────────┐              │
│  │ Supabase Edge   │◄──────────┴──────────►│ External APIs   │              │
│  │ Functions       │                       │ (Email, etc.)   │              │
│  │ (Heavy compute) │                       └─────────────────┘              │
│  └─────────────────┘                                                        │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                           DATA LAYER                                        │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                         Supabase                                    │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌────────────┐  │    │
│  │  │ PostgreSQL  │  │  Realtime   │  │   Auth      │  │  Storage   │  │    │
│  │  │ (Data)      │  │ (WebSocket) │  │ (Sessions)  │  │  (Files)   │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘  └────────────┘  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                         BLOCKCHAIN LAYER                                    │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                      Base Network (L2)                              │    │
│  │  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐   │    │
│  │  │ Ticket NFT       │  │ Treasury         │  │ (Future:         │   │    │
│  │  │ Contract         │  │ Contract         │  │  Burner Wallet)  │   │    │
│  │  │ (Access gating)  │  │ (Fund distrib)   │  │                  │   │    │
│  │  └──────────────────┘  └──────────────────┘  └──────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                      HARDWARE LAYER (Optional)                              │
│                                                                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │  Burner Cards   │  │  NFC Readers    │  │  Check-in       │              │
│  │  (NFC wallets)  │  │  (At sessions)  │  │  Stations       │              │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Data Flow Diagrams

#### Pre-Event Voting Flow

```
┌──────────┐         ┌──────────┐         ┌──────────┐         ┌──────────┐
│  User    │         │  Next.js │         │ Supabase │         │ Realtime │
│  Browser │         │  API     │         │ Database │         │ (other   │
│          │         │          │         │          │         │  users)  │
└────┬─────┘         └────┬─────┘         └────┬─────┘         └────┬─────┘
     │                    │                    │                    │
     │ 1. Click [+] vote  │                    │                    │
     │───────────────────>│                    │                    │
     │                    │                    │                    │
     │                    │ 2. Validate        │                    │
     │                    │    - User auth     │                    │
     │                    │    - Credits avail │                    │
     │                    │    - Voting open   │                    │
     │                    │                    │                    │
     │                    │ 3. Upsert vote     │                    │
     │                    │───────────────────>│                    │
     │                    │                    │                    │
     │                    │                    │ 4. Trigger         │
     │                    │                    │    realtime        │
     │                    │                    │───────────────────>│
     │                    │                    │                    │
     │                    │ 5. Return success  │                    │
     │                    │<───────────────────│                    │
     │                    │                    │                    │
     │ 6. Update UI       │                    │                    │
     │<───────────────────│                    │                    │
     │    - New vote count│                    │                    │
     │    - Credits update│                    │                    │
     │                    │                    │                    │
     │                    │                    │    7. Broadcast    │
     │                    │                    │       vote update  │
     │                    │                    │       (aggregated) │
     │                    │                    │<───────────────────│
     │                    │                    │                    │
```

#### Attendance Voting Flow (Burner Card)

```
┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│  Burner  │  │  NFC     │  │  Edge    │  │ Supabase │  │  User    │
│  Card    │  │  Reader  │  │ Function │  │ Database │  │  App     │
└────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘
     │             │             │             │             │
     │ 1. Tap      │             │             │             │
     │────────────>│             │             │             │
     │             │             │             │             │
     │             │ 2. Read     │             │             │
     │             │    card ID  │             │             │
     │             │    + venue  │             │             │
     │             │────────────>│             │             │
     │             │             │             │             │
     │             │             │ 3. Lookup   │             │
     │             │             │    card →   │             │
     │             │             │    user     │             │
     │             │             │───────────>│             │
     │             │             │             │             │
     │             │             │ 4. Validate │             │
     │             │             │    - Credits│             │
     │             │             │    - Session│             │
     │             │             │      active │             │
     │             │             │             │             │
     │             │             │ 5. Record   │             │
     │             │             │    vote     │             │
     │             │             │───────────>│             │
     │             │             │             │             │
     │             │ 6. Success  │             │             │
     │             │<────────────│             │             │
     │             │             │             │             │
     │ 7. Beep +   │             │             │             │
     │    LED      │             │             │             │
     │<────────────│             │             │             │
     │             │             │             │ 8. Push     │
     │             │             │             │    update   │
     │             │             │             │────────────>│
     │             │             │             │             │
```

### 5.3 Database Schema

```sql
-- =====================================================
-- CORE TABLES
-- =====================================================

-- Events: Top-level container for an unconference
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  
  -- Dates
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  
  -- Access configuration
  access_type TEXT NOT NULL CHECK (access_type IN ('nft', 'email', 'open')),
  nft_contract_address TEXT,  -- If access_type = 'nft'
  nft_chain_id INTEGER,       -- Chain where NFT lives
  
  -- Voting configuration
  pre_vote_credits INTEGER DEFAULT 100,
  attendance_vote_credits INTEGER DEFAULT 100,
  pre_vote_deadline TIMESTAMPTZ,
  
  -- Budget
  session_budget_amount NUMERIC(18, 6),
  session_budget_token TEXT,  -- 'USDC', 'ETH', etc.
  treasury_contract_address TEXT,
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'proposals_open', 'voting_open', 
    'scheduled', 'live', 'concluded', 'distributed'
  )),
  
  -- Burner card config
  burner_cards_enabled BOOLEAN DEFAULT FALSE,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id)
);

-- Users: Authenticated participants
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  privy_id TEXT UNIQUE NOT NULL,
  email TEXT,
  wallet_address TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Event Access: Who can access which event
CREATE TABLE event_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- For email whitelist
  email TEXT,
  
  -- For NFT gating (verified on auth)
  wallet_address TEXT,
  
  -- Access status
  access_granted BOOLEAN DEFAULT FALSE,
  checked_in BOOLEAN DEFAULT FALSE,
  checked_in_at TIMESTAMPTZ,
  
  -- Burner card (if enabled)
  burner_card_id TEXT UNIQUE,
  burner_card_linked_at TIMESTAMPTZ,
  
  -- Reference to user (populated after auth)
  user_id UUID REFERENCES users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, email),
  UNIQUE(event_id, wallet_address)
);

-- =====================================================
-- SESSION TABLES
-- =====================================================

-- Sessions: Proposed and scheduled sessions
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN (
    'talk', 'workshop', 'discussion', 'panel', 'demo'
  )),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes IN (30, 60, 90)),
  
  -- Requirements
  technical_requirements JSONB DEFAULT '[]',
  max_participants INTEGER,
  tags TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'proposed' CHECK (status IN (
    'proposed', 'approved', 'declined', 'merged', 'scheduled', 'completed'
  )),
  
  -- Merger tracking
  merged_into_id UUID REFERENCES sessions(id),
  merged_from_ids UUID[] DEFAULT '{}',
  
  -- Scheduling (populated when scheduled)
  venue_id UUID REFERENCES venues(id),
  time_slot_id UUID REFERENCES time_slots(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Session Hosts: Many-to-many for co-hosts
CREATE TABLE session_hosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'host' CHECK (role IN ('host', 'co-host')),
  payout_percentage NUMERIC(5, 2) DEFAULT 100.00,  -- For split payouts
  payout_wallet TEXT,  -- Override user's default wallet
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- =====================================================
-- VOTING TABLES
-- =====================================================

-- Pre-Event Votes: Influence scheduling
CREATE TABLE pre_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  vote_count INTEGER NOT NULL CHECK (vote_count >= 0),
  credits_spent INTEGER NOT NULL CHECK (credits_spent >= 0),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, session_id, user_id)
);

-- Attendance Votes: Determine budget distribution
CREATE TABLE attendance_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  vote_count INTEGER NOT NULL DEFAULT 1 CHECK (vote_count >= 0),
  credits_spent INTEGER NOT NULL CHECK (credits_spent >= 0),
  
  -- How the vote was cast
  vote_method TEXT NOT NULL CHECK (vote_method IN ('app', 'burner_card', 'manual')),
  burner_card_id TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(event_id, session_id, user_id)
);

-- =====================================================
-- SCHEDULING TABLES
-- =====================================================

-- Venues: Physical spaces
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  features JSONB DEFAULT '[]',  -- ['projector', 'whiteboard', etc.]
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Time Slots: When sessions can happen
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  slot_type TEXT DEFAULT 'session' CHECK (slot_type IN ('session', 'break', 'locked')),
  label TEXT,  -- 'Lunch', 'Opening', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- MERGER TABLES
-- =====================================================

-- Merger Requests: Track merger negotiations
CREATE TABLE merger_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- The sessions being merged
  source_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  target_session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- Proposed merged session details
  proposed_title TEXT NOT NULL,
  proposed_description TEXT,
  merger_type TEXT NOT NULL CHECK (merger_type IN (
    'co-presentation', 'panel', 'workshop-progression', 'dialogue'
  )),
  proposed_duration INTEGER NOT NULL,
  
  -- Who initiated
  requested_by UUID REFERENCES users(id),
  request_message TEXT,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'counter-proposed', 'accepted', 'declined', 'executed'
  )),
  
  -- If counter-proposed or declined
  response_message TEXT,
  
  -- Result
  resulting_session_id UUID REFERENCES sessions(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- DISTRIBUTION TABLES
-- =====================================================

-- Distributions: Track budget payouts
CREATE TABLE distributions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  
  -- Amounts
  total_pool NUMERIC(18, 6) NOT NULL,
  platform_fee NUMERIC(18, 6) NOT NULL,
  distributed_amount NUMERIC(18, 6) NOT NULL,
  
  -- Blockchain
  transaction_hash TEXT,
  chain_id INTEGER,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  
  initiated_by UUID REFERENCES users(id),
  initiated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Distribution Line Items: Individual payouts
CREATE TABLE distribution_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id UUID REFERENCES distributions(id) ON DELETE CASCADE,
  session_id UUID REFERENCES sessions(id),
  
  -- Recipient
  user_id UUID REFERENCES users(id),
  wallet_address TEXT NOT NULL,
  
  -- Calculation
  vote_count INTEGER NOT NULL,
  qf_score NUMERIC(18, 6) NOT NULL,
  percentage NUMERIC(8, 6) NOT NULL,
  amount NUMERIC(18, 6) NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending', 'sent', 'confirmed', 'failed'
  ))
);

-- =====================================================
-- INDEXES
-- =====================================================

CREATE INDEX idx_event_access_event ON event_access(event_id);
CREATE INDEX idx_event_access_email ON event_access(event_id, email);
CREATE INDEX idx_event_access_wallet ON event_access(event_id, wallet_address);
CREATE INDEX idx_event_access_burner ON event_access(burner_card_id);

CREATE INDEX idx_sessions_event ON sessions(event_id);
CREATE INDEX idx_sessions_event_status ON sessions(event_id, status);

CREATE INDEX idx_pre_votes_event_session ON pre_votes(event_id, session_id);
CREATE INDEX idx_pre_votes_user ON pre_votes(user_id);

CREATE INDEX idx_attendance_votes_event_session ON attendance_votes(event_id, session_id);
CREATE INDEX idx_attendance_votes_user ON attendance_votes(user_id);

CREATE INDEX idx_session_hosts_session ON session_hosts(session_id);
CREATE INDEX idx_session_hosts_user ON session_hosts(user_id);

-- =====================================================
-- VIEWS
-- =====================================================

-- Pre-vote aggregation view
CREATE VIEW session_pre_vote_stats AS
SELECT 
  s.id as session_id,
  s.event_id,
  COALESCE(SUM(v.vote_count), 0) as total_votes,
  COALESCE(COUNT(DISTINCT v.user_id), 0) as unique_voters,
  COALESCE(SUM(v.credits_spent), 0) as total_credits
FROM sessions s
LEFT JOIN pre_votes v ON s.id = v.session_id
WHERE s.status NOT IN ('declined', 'merged')
GROUP BY s.id, s.event_id;

-- Attendance vote aggregation view
CREATE VIEW session_attendance_stats AS
SELECT 
  s.id as session_id,
  s.event_id,
  COALESCE(SUM(v.vote_count), 0) as total_votes,
  COALESCE(COUNT(DISTINCT v.user_id), 0) as unique_voters,
  -- QF calculation: (sum of sqrt of individual votes)^2
  POWER(COALESCE(SUM(SQRT(v.vote_count)), 0), 2) as qf_score
FROM sessions s
LEFT JOIN attendance_votes v ON s.id = v.session_id
WHERE s.status = 'completed'
GROUP BY s.id, s.event_id;

-- User credit balance view (pre-voting)
CREATE VIEW user_pre_vote_balance AS
SELECT 
  ea.user_id,
  ea.event_id,
  e.pre_vote_credits as total_credits,
  COALESCE(SUM(pv.credits_spent), 0) as spent_credits,
  e.pre_vote_credits - COALESCE(SUM(pv.credits_spent), 0) as remaining_credits
FROM event_access ea
JOIN events e ON ea.event_id = e.id
LEFT JOIN pre_votes pv ON ea.user_id = pv.user_id AND ea.event_id = pv.event_id
WHERE ea.user_id IS NOT NULL
GROUP BY ea.user_id, ea.event_id, e.pre_vote_credits;

-- User credit balance view (attendance)
CREATE VIEW user_attendance_balance AS
SELECT 
  ea.user_id,
  ea.event_id,
  e.attendance_vote_credits as total_credits,
  COALESCE(SUM(av.credits_spent), 0) as spent_credits,
  e.attendance_vote_credits - COALESCE(SUM(av.credits_spent), 0) as remaining_credits
FROM event_access ea
JOIN events e ON ea.event_id = e.id
LEFT JOIN attendance_votes av ON ea.user_id = av.user_id AND ea.event_id = av.event_id
WHERE ea.user_id IS NOT NULL
GROUP BY ea.user_id, ea.event_id, e.attendance_vote_credits;
```

### 5.4 API Structure

```
/api
├── /auth
│   ├── POST   /privy-webhook     # Privy auth webhook
│   └── GET    /me                # Current user info
│
├── /events
│   ├── GET    /                  # List events (for admins)
│   ├── POST   /                  # Create event
│   ├── GET    /:slug             # Get event by slug
│   ├── PATCH  /:slug             # Update event
│   │
│   ├── GET    /:slug/access      # Check user's access
│   ├── POST   /:slug/access      # Grant access (admin)
│   ├── POST   /:slug/check-in    # Check in user
│   │
│   ├── GET    /:slug/sessions    # List sessions
│   ├── POST   /:slug/sessions    # Propose session
│   ├── GET    /:slug/sessions/:id
│   ├── PATCH  /:slug/sessions/:id
│   ├── POST   /:slug/sessions/:id/approve    # Admin approve
│   ├── POST   /:slug/sessions/:id/decline    # Admin decline
│   │
│   ├── GET    /:slug/pre-votes             # Get user's pre-votes
│   ├── POST   /:slug/pre-votes             # Cast/update pre-vote
│   ├── GET    /:slug/pre-votes/stats       # Aggregated stats (admin)
│   │
│   ├── GET    /:slug/attendance-votes      # Get user's attendance votes
│   ├── POST   /:slug/attendance-votes      # Cast attendance vote
│   ├── POST   /:slug/attendance-votes/card # Via burner card
│   │
│   ├── POST   /:slug/merger-requests       # Propose merger
│   ├── PATCH  /:slug/merger-requests/:id   # Respond to merger
│   │
│   ├── GET    /:slug/schedule              # Get schedule
│   ├── POST   /:slug/schedule/generate     # Run algorithm
│   ├── PATCH  /:slug/schedule              # Manual adjustments
│   ├── POST   /:slug/schedule/publish      # Publish schedule
│   │
│   ├── GET    /:slug/distribution          # Get distribution preview
│   └── POST   /:slug/distribution/execute  # Trigger distribution
│
├── /venues
│   ├── GET    /:eventId          # List venues
│   ├── POST   /:eventId          # Add venue
│   └── PATCH  /:eventId/:id      # Update venue
│
└── /time-slots
    ├── GET    /:eventId          # List time slots
    ├── POST   /:eventId          # Add time slot
    └── PATCH  /:eventId/:id      # Update time slot
```

### 5.5 Smart Contract Architecture

```
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title SchellingPointTreasury
 * @notice Manages session budget distribution for Schelling Point events
 */
contract SchellingPointTreasury is Ownable, ReentrancyGuard {
    
    // ============ Structs ============
    
    struct Event {
        uint256 totalPool;
        uint256 platformFeePercent;  // In basis points (500 = 5%)
        bool isDistributed;
        address paymentToken;        // USDC, etc.
    }
    
    struct Distribution {
        address recipient;
        uint256 amount;
    }
    
    // ============ State ============
    
    mapping(bytes32 => Event) public events;  // eventId => Event
    address public platformWallet;
    
    // ============ Events ============
    
    event EventCreated(bytes32 indexed eventId, uint256 pool, address token);
    event FundsDeposited(bytes32 indexed eventId, uint256 amount);
    event DistributionExecuted(bytes32 indexed eventId, uint256 totalDistributed);
    event RecipientPaid(bytes32 indexed eventId, address recipient, uint256 amount);
    
    // ============ Constructor ============
    
    constructor(address _platformWallet) {
        platformWallet = _platformWallet;
    }
    
    // ============ Admin Functions ============
    
    /**
     * @notice Create a new event treasury
     * @param eventId Unique identifier for the event
     * @param platformFeePercent Fee in basis points
     * @param paymentToken Address of ERC20 token for payments
     */
    function createEvent(
        bytes32 eventId,
        uint256 platformFeePercent,
        address paymentToken
    ) external onlyOwner {
        require(events[eventId].paymentToken == address(0), "Event exists");
        require(platformFeePercent <= 1000, "Fee too high");  // Max 10%
        
        events[eventId] = Event({
            totalPool: 0,
            platformFeePercent: platformFeePercent,
            isDistributed: false,
            paymentToken: paymentToken
        });
        
        emit EventCreated(eventId, 0, paymentToken);
    }
    
    /**
     * @notice Deposit funds into event treasury
     * @param eventId Event to deposit to
     * @param amount Amount of tokens to deposit
     */
    function depositFunds(bytes32 eventId, uint256 amount) external {
        Event storage evt = events[eventId];
        require(evt.paymentToken != address(0), "Event not found");
        require(!evt.isDistributed, "Already distributed");
        
        IERC20(evt.paymentToken).transferFrom(msg.sender, address(this), amount);
        evt.totalPool += amount;
        
        emit FundsDeposited(eventId, amount);
    }
    
    /**
     * @notice Execute distribution to session hosts
     * @param eventId Event to distribute
     * @param distributions Array of recipient/amount pairs
     */
    function distribute(
        bytes32 eventId,
        Distribution[] calldata distributions
    ) external onlyOwner nonReentrant {
        Event storage evt = events[eventId];
        require(evt.paymentToken != address(0), "Event not found");
        require(!evt.isDistributed, "Already distributed");
        require(evt.totalPool > 0, "No funds");
        
        // Calculate platform fee
        uint256 platformFee = (evt.totalPool * evt.platformFeePercent) / 10000;
        uint256 distributable = evt.totalPool - platformFee;
        
        // Verify distribution totals
        uint256 totalDistributing = 0;
        for (uint i = 0; i < distributions.length; i++) {
            totalDistributing += distributions[i].amount;
        }
        require(totalDistributing <= distributable, "Distribution exceeds pool");
        
        // Send platform fee
        IERC20(evt.paymentToken).transfer(platformWallet, platformFee);
        
        // Distribute to recipients
        for (uint i = 0; i < distributions.length; i++) {
            IERC20(evt.paymentToken).transfer(
                distributions[i].recipient,
                distributions[i].amount
            );
            emit RecipientPaid(eventId, distributions[i].recipient, distributions[i].amount);
        }
        
        evt.isDistributed = true;
        emit DistributionExecuted(eventId, totalDistributing);
    }
    
    // ============ View Functions ============
    
    function getEvent(bytes32 eventId) external view returns (Event memory) {
        return events[eventId];
    }
}
```

---

## 6\. Premium Feature: AI Transcription & RAG

### 6.1 Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TRANSCRIPTION PIPELINE                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐      │
│  │  Audio   │───>│  Whisper │───>│  Clean   │───>│  Store   │      │
│  │  Upload  │    │  API     │    │  Format  │    │  (S3)    │      │
│  └──────────┘    └──────────┘    └──────────┘    └──────────┘      │
│                                       │                             │
│                                       ▼                             │
│                              ┌──────────────┐                       │
│                              │   Supabase   │                       │
│                              │  (metadata)  │                       │
│                              └──────────────┘                       │
│                                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                         RAG PIPELINE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                      │
│  │  User    │───>│  Embed   │───>│ Pinecone │                      │
│  │  Query   │    │  Query   │    │  Search  │                      │
│  └──────────┘    └──────────┘    └────┬─────┘                      │
│                                       │                             │
│                                       ▼                             │
│                              ┌──────────────┐                       │
│                              │ Retrieve Top │                       │
│                              │   Chunks     │                       │
│                              └──────┬───────┘                       │
│                                     │                               │
│                                     ▼                               │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐                  │
│  │  Stream  │<───│   GPT-4  │<───│  Augmented   │                  │
│  │ Response │    │  Generate│    │   Prompt     │                  │
│  └──────────┘    └──────────┘    └──────────────┘                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 6.2 User Interface for RAG Chatbot

```
┌────────────────────────────────────────────────────────────────────────┐
│  Ask the Conference                                        [Minimize]  │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  Hi! I've read all the session transcripts from [Event Name].   │  │
│  │  Ask me anything about what was discussed.                       │  │
│  │                                                                  │  │
│  │  Try: "What were the main takeaways from the DAO sessions?"     │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  You: What governance frameworks were discussed?                       │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Based on transcripts from 3 sessions, several governance        │  │
│  │  frameworks were discussed:                                      │  │
│  │                                                                  │  │
│  │  **Token-weighted voting** was critiqued in the DAO Governance   │  │
│  │  panel. Alice noted that "pure token voting leads to plutocracy" │  │
│  │  and suggested hybrid models.                                    │  │
│  │                                                                  │  │
│  │  **Conviction voting** was explored in the ReFi discussion,      │  │
│  │  where Carol explained how continuous signal aggregation can     │  │
│  │  reduce voter fatigue...                                         │  │
│  │                                                                  │  │
│  │  **Quadratic voting** (like what we use here!) was mentioned     │  │
│  │  across multiple sessions as a compromise between...             │  │
│  │                                                                  │  │
│  │  ────────────────────────────────────────                        │  │
│  │  Sources:                                                        │  │
│  │  📄 DAO Governance panel (Alice, Bob) - 14:23                    │  │
│  │  📄 ReFi Discussion (Carol) - 08:45                              │  │
│  │  📄 Mechanism Design Workshop - 31:02                            │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │  Ask a follow-up question...                              [Send] │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7\. Implementation Phases

### Phase 1: Core Platform (8-10 weeks)

| Week | Focus | Deliverables |
| :---- | :---- | :---- |
| 1-2 | Foundation | Project setup, auth, database, basic UI |
| 3-4 | Events & Access | Event creation, email whitelist, NFT gating |
| 5-6 | Sessions | Proposal flow, browsing, admin approval |
| 7-8 | Pre-Voting | Quadratic voting UI, real-time updates |
| 9-10 | Scheduling | Algorithm, admin interface, publishing |

### Phase 2: Budget Distribution (4-6 weeks)

| Week | Focus | Deliverables |
| :---- | :---- | :---- |
| 11-12 | Attendance Voting | App-based tap interface, credit tracking |
| 13-14 | Smart Contracts | Treasury contract, testing, audit |
| 15-16 | Distribution | Preview, execution, notifications |

### Phase 3: Premium Features (Ongoing)

| Focus | Deliverables |
| :---- | :---- |
| Burner Cards | Card linking, NFC integration, hardware setup |
| AI Transcription | Upload flow, Whisper integration, storage |
| RAG Chatbot | Embeddings, Pinecone, chat interface |
| Analytics | Dashboards, export, insights |

---

## 8\. Open Questions (Resolved)

| Question | Resolution |
| :---- | :---- |
| Credit reset between phases? | ✅ Yes, fresh 100 credits for attendance voting |
| Tap \= immediate vote or confirmation? | ✅ Immediate vote, can tap again for more |
| Who can initiate mergers? | ✅ Any participant can request, hosts must approve |
| Minimum votes to schedule? | ✅ Admin discretion, soft recommendation |
| Burner card required? | ✅ No, optional premium feature |

---

This PRD provides the comprehensive detail needed to build Schelling Point. Want me to create a detailed implementation plan with specific tasks, or dive deeper into any particular component?  