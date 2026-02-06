# SchellingPoint

**Decentralized session scheduling for community-governed events.**

SchellingPoint is the official unconference coordination tool for [EthBoulder](https://ethboulder.xyz) — enabling participants to propose sessions, allocate voice through quadratic voting, and collectively shape the event schedule.

---

## The Vision

Traditional conferences are top-down: organizers decide what you'll hear, when you'll hear it, and from whom. SchellingPoint flips this model.

Named after economist Thomas Schelling's concept of [focal points](https://en.wikipedia.org/wiki/Focal_point_(game_theory)) — natural coordination solutions that emerge without explicit communication — SchellingPoint creates the conditions for a community to converge on the sessions that matter most to them.

**This is scheduling as a public good.** No backroom deals. No pay-to-play speaker slots. Just transparent, stake-weighted consensus on what deserves everyone's attention.

---

## How It Works

### For Participants

1. **Browse & Discover** — Explore proposed sessions across tracks like Privacy, DeSci, DAO Tooling, and more
2. **Propose Sessions** — Have something to share? Submit your talk, workshop, or discussion
3. **Vote with Credits** — You get 100 voice credits. Distribute them across sessions you want to see scheduled
4. **Build Your Schedule** — Save favorites, add sessions to your calendar, share with friends

### The Quadratic Twist

SchellingPoint uses **quadratic voting** — a mechanism where the cost of additional votes increases quadratically:

| Votes | Cost |
|-------|------|
| 1 vote | 1 credit |
| 2 votes | 4 credits |
| 3 votes | 9 credits |
| 4 votes | 16 credits |
| 5 votes | 25 credits |

This means you can go deep on sessions you're passionate about, but it gets expensive. The result? Votes reflect genuine preference intensity, not just drive-by clicks. Minority interests with dedicated supporters can compete with mainstream topics that have shallow support.

### For Organizers

- **Visual Schedule Builder** — Drag-and-drop sessions into venue time slots
- **Venue Management** — Configure multiple venues with different capacities and availability windows
- **Track Organization** — Group sessions thematically with track leads
- **Hybrid Model Support** — Mix curated keynotes with community-voted unconference sessions

---

## The EthBoulder Connection

SchellingPoint embodies the EthBoulder ethos: **Fork The Frontier.**

EthBoulder isn't a typical crypto conference. It's a decentralized, community-governed gathering focused on:

- **Open-source coordination** — Building tools and practices for collective action
- **Public goods funding** — Sustaining the commons that benefit everyone
- **Resilient infrastructure** — Systems that serve communities, not extract from them

SchellingPoint is all three. It's open source. It treats attention as a public good to be allocated fairly. And it provides infrastructure for any community to coordinate their own unconference.

### Why Quadratic Voting?

Quadratic voting emerged from mechanism design research (notably by Glen Weyl and Vitalik Buterin) as a way to balance intensity of preference with broad participation. In traditional voting, a passionate minority loses to an apathetic majority. In plutocratic systems, wealth buys influence.

Quadratic voting threads the needle: everyone has equal voice credits, but expressing strong preference costs more. It's democracy that respects both equality and intensity.

For EthBoulder, this means:
- **Niche topics get a fair shot** — A privacy workshop with 10 dedicated supporters can outcompete a generic talk with 50 lukewarm votes
- **No gaming the system** — You can't cheaply flood votes across everything
- **Skin in the game** — Your credit allocation reflects what you actually want to attend

---

## For the Marketing Team

### Key Messages

**Tagline Options:**
- "Your voice. Your schedule. Your unconference."
- "Coordination is the killer app."
- "Democracy for your attention."

**Elevator Pitch:**
> SchellingPoint lets EthBoulder attendees propose and vote on sessions using quadratic voting — a mechanism that balances passion with participation. The result is a schedule that emerges from collective intelligence, not top-down curation.

**Why It Matters:**
> In a world of algorithmic feeds and attention extraction, SchellingPoint returns agency to the community. You decide what's worth your time. And when hundreds of people make that choice together, something remarkable emerges: a schedule that no single organizer could have designed, but that reflects what the community actually wants.

### Talking Points

1. **It's credibly neutral** — No organizer picks winners. The community does.
2. **It's Ethereum-native thinking** — Mechanism design applied to meatspace coordination.
3. **It's open source** — Any community can fork it for their own events.
4. **It respects minority voices** — Quadratic costs mean passionate niches can compete.
5. **It's practical decentralization** — Not crypto theater, actual community governance.

### Social Copy

**Twitter/X:**
> Your conference schedule shouldn't be decided in a back room.
>
> At @EthBoulder, YOU vote on what sessions get scheduled. 100 credits. Quadratic voting. Community-driven.
>
> This is what coordination looks like. 🗳️

**Longer Form:**
> Most conferences hand you a schedule. EthBoulder hands you a ballot.
>
> SchellingPoint is our unconference coordination tool. Propose a session. Vote on others. Watch the schedule emerge from collective intelligence.
>
> We use quadratic voting — the more you care, the more it costs. This isn't about popularity. It's about preference intensity. A privacy workshop with 10 true believers beats a generic talk with 50 meh votes.
>
> This is EthBoulder. Fork the frontier. Shape the schedule.

---

## For Onboarding Guides

### Quick Start for Attendees

**Step 1: Sign In**
Visit [app.ethboulder.xyz](https://app.ethboulder.xyz) and sign in with your email. You'll receive a magic link — no password needed.

**Step 2: Explore Sessions**
Browse proposed sessions by track, format, or popularity. Each session shows its current vote count and the host's description.

**Step 3: Allocate Your Votes**
You have 100 voice credits. Click the + button on any session to add votes. Remember: votes cost quadratically (1 vote = 1 credit, 2 votes = 4 credits, etc.).

**Step 4: Build Your Schedule**
Heart sessions you want to attend. They'll appear in "My Schedule" with calendar export options.

**Step 5: Propose a Session (Optional)**
Have something to share? Hit "Propose Session" and tell us about your talk, workshop, or discussion. The community will vote on it.

### FAQ

**Q: What happens to my votes?**
A: Your votes influence which proposed sessions get scheduled into unconference slots. Higher-voted sessions are more likely to be scheduled by organizers.

**Q: Can I change my votes?**
A: Yes! You can adjust your vote allocation anytime before voting closes.

**Q: What's the difference between curated and unconference sessions?**
A: Curated sessions (keynotes, featured speakers) are pre-scheduled by organizers. Unconference sessions are proposed by attendees and scheduled based on community votes.

**Q: Why quadratic voting instead of normal voting?**
A: Quadratic voting captures how much you care, not just what you like. It prevents people from spreading shallow votes everywhere and rewards genuine enthusiasm.

---

## Technical Overview

### Stack

- **Framework:** Next.js 14 (App Router)
- **Database:** Supabase (PostgreSQL + Auth + Row Level Security)
- **Styling:** Tailwind CSS + shadcn/ui
- **Deployment:** Vercel

### Key Features

- Magic link authentication
- Real-time vote tallying with quadratic cost calculation
- Drag-and-drop schedule builder for admins
- Venue-specific time slot management
- Track-based session organization
- Calendar export (Google Calendar, ICS)
- Mobile-responsive design

### Data Model

```
profiles     — User accounts and admin status
venues       — Physical spaces with capacity and features
tracks       — Thematic groupings (Privacy, DeSci, etc.)
time_slots   — Venue-specific availability windows
sessions     — Proposed and scheduled sessions
votes        — User vote allocations (quadratic)
favorites    — Personal schedule saves
```

---

## Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials

# Run development server
npm run dev

# Open http://localhost:3000
```

### Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Contributing

SchellingPoint is open source under the MIT license. We welcome contributions that align with the project's ethos of decentralized coordination and community governance.

---

## Credits

Built with conviction for [EthBoulder](https://ethboulder.xyz) — the decentralized, community-governed Ethereum event in Boulder, Colorado.

**Fork the frontier. Shape the schedule.**
