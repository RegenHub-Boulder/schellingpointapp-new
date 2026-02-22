# Schelling Point — Design Vision & Implementation Plan

## A Biomimetic Cybernetic Aesthetic for Coordination Technology

---

## Part I: Design Philosophy

### The Problem with the Current Aesthetic

The app currently wears a generic "modern tech startup" skin: neon lime on dark backgrounds, glassmorphism cards, floating gradient blobs, giant wordmark footer. These are competent defaults borrowed from the crypto/Web3 visual vernacular circa 2022 — but they communicate nothing about what Schelling Point actually *is*. The design has no semantic relationship to the product's meaning.

The neon-on-dark treatment says "we're a tech product." It doesn't say "we're a coordination engine that helps humans find each other and converge on shared experiences." It doesn't evoke game theory, or the beautiful tension of independent agents discovering alignment, or the organic emergence of order from collective choice.

The current aesthetic is a costume. We need a skeleton.

### What Is a Schelling Point?

Thomas Schelling's insight was deceptively simple: when people can't communicate but need to coordinate, they converge on *focal points* — solutions that feel natural, prominent, or "obvious" to everyone independently. Meet me in New York? Grand Central Station. Pick a number? Seven. The Schelling point isn't imposed; it *emerges* from shared context.

This is the conceptual foundation for every visual decision that follows. The app is a landscape where focal points emerge from collective behavior. Every interaction — proposing a session, casting a vote, checking the schedule — is an act of navigating that landscape and contributing to its shape.

### Three Conceptual Layers

The new aesthetic operates on three interlocking layers:

**Layer 1: The Substrate — Cartographic Systems**
The background texture of the entire app. Subtle dot-grids, coordinate markers, contour lines, thin ruled edges. This layer says: "You are navigating a structured space. There is a topology here. Your position matters." It evokes engineering paper, topographic maps, the precise substrate on which complex systems are drawn. It is quiet, structural, and ever-present.

**Layer 2: The Network — Cybernetic Connections**
The relational layer. Nodes, edges, connection indicators, protocol handshakes. This layer makes visible the *relationships* between entities — people, sessions, events, votes. It draws from ARPANET topology maps, early internet protocol diagrams, Bell Labs system architecture drawings, and the organic branching of mycelial networks. It says: "Everything here is connected. You are part of a living network."

**Layer 3: The Signal — Emergent Focal Points**
The dynamic layer. Where collective behavior becomes visible. Vote distributions as heat signatures. Convergence patterns in the schedule. The phosphor-green glow of the primary color isn't decoration — it's *signal*. It marks where coordination is happening, where the Schelling point is forming. This layer borrows from oscilloscope traces, radar sweeps, and the honest luminosity of cathode ray phosphors.

### Design Principles

**1. Semantic Decoration Only**
Every visual element must earn its place by communicating something about the system's state or the user's relationship to it. No decoration for decoration's sake. A grid pattern isn't wallpaper — it's the coordinate system you're navigating. A glow isn't flair — it's a signal concentration indicator.

**2. The System is the Aesthetic**
The beauty should come from the structure itself, not from ornamentation applied on top of it. Like the elegance of a well-drawn circuit diagram or a topographic map, the information *is* the art. This is the Apple minimalism principle applied to systems thinking: strip away everything that isn't the system, and what remains is beautiful.

**3. Warm Machines**
This is not cold, clinical, dystopian tech. The biomimetic dimension is crucial. These are living systems — mycelial networks, neural pathways, flocking patterns. The visual language should feel organic even when precise. Curves that breathe. Networks that branch like roots. The warmth of amber terminal phosphors alongside the crispness of computed coordinates.

**4. Tactile Feedback, Not Animation Theater**
Every interaction should feel like you're touching a real instrument. The satisfying click of a mechanical switch. The precise rotation of a tuning dial. The tactile resistance of a well-designed control surface. Micro-interactions serve feedback, not spectacle. When you cast a vote, you should feel it register in the system like adjusting a dial on a control panel.

**5. Progressive Revelation**
The system layer reveals itself progressively. First-time users see a clean, simple interface. As they engage — voting, proposing, navigating — the coordinate system becomes more visible. The network topology emerges. They begin to see the landscape they're shaping. This prevents overwhelm while rewarding engagement with richer visual context.

---

## Part II: Visual Language

### Color System — "Phosphor Palette"

The palette is inspired by the different phosphor colors of vintage CRT monitors and oscilloscopes, plus the muted earth tones of topographic maps.

#### Primary: Phosphor Green (#B2FF00 → refine to #AAFF32)
Keep the neon lime but refine it slightly — push it a touch more toward true chartreuse. This is the P1 phosphor, the classic green-screen terminal color (brightened). It represents **active signal** — where coordination is happening, where attention should go. Used for: primary buttons, active vote indicators, convergence highlights, connected states.

#### Secondary Signal: Amber (#FFB800)
The P3 phosphor — warm amber CRT glow. This represents **pending signal** — things in motion, things warming up, things that need attention but aren't critical. Used for: pending states, session proposals awaiting review, "warming" indicators, secondary accents. This replaces the current generic gray secondary with something that has meaning and warmth.

#### Tertiary Signal: Cyan (#00D4AA)
A teal-shifted cyan, evoking early network diagrams and the cool precision of technical documentation. Represents **system/info state** — metadata, protocol information, structural elements. Used for: timestamps, coordinates, system status, informational badges, the "substrate" layer of the design.

#### Background: Deep Cartographic (#0A0E17 dark / #F5F3EE light)
Dark mode shifts from generic blue-gray to a deeper, more specific midnight — the color of a radar screen before the sweep. Light mode becomes warm parchment — the color of an engineer's drawing paper, a topo map, a field notebook.

#### Grid/Substrate: Low-contrast structural color
Dark: `hsl(220 25% 12%)` — barely-there grid lines, like faint rulings on engineering paper.
Light: `hsl(35 15% 85%)` — the subtle grid of graph paper.

#### Accent Colors for Tracks/Categories:
Replace arbitrary color assignments with a considered palette drawn from map legend conventions:
- Terrain Green `#3ECF8E` — nature, outdoor, environmental topics
- Water Blue `#3B82F6` — technical, infrastructure, deep-dive topics
- Contour Brown `#C4956A` — governance, community, organizational topics
- Ridge Red `#EF6461` — urgent, breaking, lightning talks
- Summit Purple `#8B5CF6` — visionary, philosophical, keynote-level topics

### Typography — "Protocol Stack"

The typography system creates a visual distinction between the **human layer** and the **system layer** of the interface.

#### Display: BDO Grotesk (keep)
The existing display font works well — it's bold, confident, modern. It speaks at the human layer. Event names, session titles, headings, calls-to-action. This is the voice of people and their ideas.

#### System: Space Mono (add) or JetBrains Mono
A monospace font for the protocol layer. This is the voice of the system itself. Used for:
- Vote counts and credit numbers
- Timestamps and coordinates
- Status indicators ("PROPOSED", "SCHEDULED", "LIVE")
- Metadata labels
- The credit bar readout
- Badge text
- Small navigation labels and breadcrumbs

This duality creates an instant subconscious communication: **round letterforms = human content**, **monospace = system information**. The user learns to parse the interface at two levels without being taught.

#### Body: Inter (keep system default)
Clean, readable, neutral. The workhorse that carries descriptive text, long-form content, and UI copy.

### Iconography — "Diagram Glyphs"

Continue using Lucide React but apply a consistent treatment:

- Icons at the **system layer** (nav, status, metadata) should be rendered with `stroke-width: 1.5` — thinner, more technical, like diagram symbols.
- Icons at the **human layer** (CTAs, feature highlights) can use the default `stroke-width: 2` or be slightly heavier.
- Introduce a small set of custom SVG "glyphs" for key brand concepts:
  - **Convergence glyph**: Two arrows meeting at a point (for Schelling point moments)
  - **Node glyph**: A circle with small connection stubs (for entities in the network)
  - **Handshake glyph**: Two interlocking bracket shapes (for protocol/connection established)
  - **Signal glyph**: Concentric arcs radiating from a point (for broadcasting/proposing)

### Texture & Pattern — "The Substrate"

#### Dot Grid
A very subtle dot-grid pattern as a background texture. Each dot is 1px, spaced 24px apart, at ~4% opacity. This creates the feeling of engineering paper — a coordinate system underlying everything. In dark mode, dots are lighter than the background. In light mode, they're slightly darker. The grid is purely CSS (radial-gradient pattern), zero performance cost.

#### Contour Lines
Decorative SVG contour line patterns used sparingly as section backgrounds or card accents. These are the topographic lines that suggest the landscape of collective preference. They can be abstract — they don't need to map to real data (yet). Used on:
- Landing page hero section (replacing gradient blobs)
- Section dividers
- Empty states (as background texture)

#### Connection Lines
Thin dashed or dotted lines that visually connect related elements. These are the network edges. Used when:
- A session card is hovered and related sessions exist
- The schedule view shows time relationships
- Admin views show proposal-to-schedule flow

### Borders & Containers — "Technical Drawing"

#### Border Treatment
Replace the current rounded-xl everywhere approach with a more intentional system:

- **Cards**: `rounded-lg` (12px) with 1px borders in the substrate color. No heavy shadows. The card should feel like a labeled region on a diagram, not a floating piece of material.
- **Buttons**: `rounded-md` (8px) for standard actions, `rounded-full` only for icon buttons and node indicators.
- **Inputs**: `rounded-md` with a subtle left-edge accent line (2px) in cyan to evoke terminal input prompts.
- **Badges**: `rounded-sm` (4px) with monospace text — these are **status codes**, not pills. They should feel like labels on a diagram.

#### Card Header Accent
Each card gets a 1-2px top border in a contextual color (track color, status color, or primary). This replaces the current banner/gradient approach and evokes the colored-edge coding of technical documentation tabs.

### Shadows & Depth — "Signal Luminosity"

Replace drop shadows and glassmorphism with a luminosity-based depth system:

- **Resting state**: No shadow. Cards are flat regions on the coordinate plane.
- **Hover state**: A subtle inner glow or border-color shift — the element "activates" like a node receiving a signal.
- **Active/Selected state**: The primary phosphor glow (a tight, focused `box-shadow` using the green, not a diffuse haze). This says "this node is active in the network."
- **Elevated state** (modals, popovers): A single-layer subtle shadow plus a thin bright border. Elevation is communicated through contrast, not blur.

Glassmorphism (`backdrop-filter: blur`) is removed entirely. It's computationally expensive, visually generic, and communicates nothing about coordination. Replace with solid backgrounds at slightly different luminosity levels.

### Animation — "System Dynamics"

#### Remove
- Floating gradient blobs (meaningless decoration)
- Gradient drift animations (no semantic value)
- Neon pulse effects (visual noise)

#### Keep & Refine
- `active:scale-[0.98]` on buttons (tactile feedback — good)
- Smooth color transitions on hover (system responsiveness)
- Accordion open/close (functional animation)

#### Add
- **Signal ping**: When a vote is cast, a brief concentric-ring animation expands from the vote button (like a radar ping or ripple). CSS only: a pseudo-element that scales from 0 to 1.5x with opacity fade. 300ms duration. This makes voting feel consequential.
- **Connection establish**: When navigating to a new view, a subtle 150ms fade-in with a 2px horizontal line that extends from left to right across the header. This evokes a protocol handshake — "connection established to this view."
- **Convergence indicator**: On the schedule page, when sessions are popular (high votes), a gentle slow pulse on their left-border accent (not the neon-glow fireworks, just a calm 4s breathing pulse at very low amplitude). The system is alive. The landscape is breathing.
- **Counter tick**: Vote count and credit numbers should animate between values with a brief digit-scroll (like a mechanical counter or an odometer). 200ms, eased. This makes the numbers feel like real instruments.

---

## Part III: Component-by-Component Changes

### 1. Global / Root Level

**globals.css changes:**

| Current | New | Rationale |
|---------|-----|-----------|
| Gradient blob backgrounds | Dot-grid substrate pattern | Meaningful coordinate space vs. decorative noise |
| `glass-card` class (glassmorphism) | `system-card` class (solid bg + accent border) | Performance + semantic clarity |
| `neon-glow` / `neon-glow-sm` | `signal-glow` (tighter, more focused) | Signal vs. spectacle |
| `gradient-dark`, `gradient-card` | Remove entirely | Flat surfaces on coordinate plane |
| `animated-gradient` | Remove | No more ambient animation noise |
| Generic scrollbar | Styled thin scrollbar with phosphor-green thumb | System-consistent |

**New CSS additions:**
- `.dot-grid` background pattern (CSS radial-gradient)
- `.contour-bg` subtle topographic line SVG pattern
- `.mono` utility class for monospace system text
- `.signal-ping` animation for vote feedback
- `.node-indicator` for connection-status dots
- `.border-accent-left` for input prompt styling
- `.counter-tick` animation for number transitions
- Status badge refinement with square-ish corners and monospace

**CSS Custom Properties updates:**
```
--substrate: 220 25% 12%;        /* grid/structural elements */
--signal: 78 100% 52%;           /* active signal (refined primary) */
--signal-amber: 42 100% 50%;    /* pending signal */
--signal-cyan: 166 76% 42%;     /* info/system signal */
--surface-1: 222 30% 8%;        /* card surfaces */
--surface-2: 222 28% 11%;       /* elevated surfaces */
```

### 2. SiteHeader

**Current**: Clean but generic. Logo text + buttons.

**New treatment:**
- Add a subtle node indicator dot (8px circle, phosphor green, with slow pulse) next to the logo — this is the "you are connected" indicator. When logged in, it glows steady green. When logged out, it's a hollow circle (outline only, substrate color).
- Logo text "Schelling Point" set in the display font but with the "Point" in a slightly different weight or the primary color — emphasizing the concept.
- Navigation labels in monospace at a smaller size, uppercase, letter-spaced — like system navigation labels on a control panel: `EVENTS`, `CREATE`, `SIGN IN`.
- The header border-bottom becomes a 1px line in the substrate color with a small notch or tick mark aligned with the logo (like a measurement ruler edge).

### 3. DashboardLayout (Event Shell)

**Current**: Standard sticky header + tabs + content.

**New treatment:**
- The navigation tabs become a "channel selector." Each tab is a rounded-md button with monospace label. Active state: phosphor green left-border accent (3px) + subtle green tint on background. Inactive: substrate-colored text.
- Mobile navigation icons get small monospace labels below them (3-letter abbreviations: `SES`, `SCH`, `VOT`, `PRO`).
- The admin badge changes from the literal `#B2FF00` background to a monospace `[ADMIN]` badge with a thin green border — more diagram-label, less highlighter-pen.
- Between the header and content, add a 1px ruled line with small tick marks at regular intervals (pure CSS border + repeating gradient). This is the "ruler edge" of the content area.

### 4. CreditBar

**Current**: Simple progress bar with numbers.

**New treatment: "Resource Allocator Gauge"**
- Numbers displayed in monospace (vote count, credit count, total).
- The progress bar gets tick marks along its length (like a ruler or gauge). Major ticks every 25%, minor ticks every 10%.
- The bar fill uses the phosphor green but with a subtle gradient that gets brighter toward the "spent" end — visualizing signal strength / resource depletion.
- Below the bar, the help text about quadratic pricing is set in monospace at a very small size with a `>` prefix, like a terminal hint: `> cost = votes² (quadratic pricing)`.
- When credits are running low (<25%), the bar color transitions from green to amber — the system is signaling resource scarcity.

### 5. SessionCard

**Current**: Standard card with format icon, title, description, tags, vote controls.

**New treatment: "Network Node Card"**
- **Top edge**: 2px colored top border matching the track color. This is the card's "classification stripe" — like the colored edge on a file folder or the category indicator on a system diagram node.
- **Node ID**: Small monospace text in top-right corner showing a truncated identifier or grid coordinate (e.g., `S-047` or the first 4 chars of a session hash). This makes each session feel like an addressable node in the network.
- **Format label**: Monospace, uppercase, small — `TALK`, `WORKSHOP`, `DISCUSSION`. Displayed as a diagram label, not a decorative badge.
- **Vote display**: The vote count rendered in monospace, larger, with phosphor green color. Next to it, a small signal-strength indicator (1-5 bars or dots) that visualizes the vote magnitude relative to the event average.
- **Vote controls**: The +/- buttons become small, precise controls with thin borders — like increment/decrement buttons on lab equipment. On click, the signal-ping animation fires from the button.
- **Credit cost**: Shown in monospace with `→` prefix: `→ 4 credits`. The arrow suggests signal flow — you're sending credits into the system.
- **Tags**: Small monospace labels with 4px border-radius and substrate-colored backgrounds. Not colorful pills — labeled nodes.
- **Hover state**: The top border brightens. A subtle coordinate grid pattern fades in behind the card content at very low opacity. The card feels like it's "selected" on the coordinate plane.

### 6. Landing Page Hero

**Current**: Giant heading + gradient blobs + animated backgrounds.

**New treatment: "Network Discovery"**
- Remove all gradient blobs and animated-gradient backgrounds.
- Background: The dot-grid substrate, with a topographic contour line pattern overlaid at ~5% opacity. The contours are SVG paths, gently animating (very slowly shifting, ~30s cycle) to suggest the landscape is alive and shaped by collective behavior.
- Hero heading: "Find Your Schelling Point" — large display font, with "Schelling Point" in the primary phosphor green. Below, a brief tagline in the body font.
- Below the hero text, a subtle ASCII/monospace-styled descriptor block:

```
┌─────────────────────────────────────┐
│  UNCONFERENCE PROTOCOL v2.0        │
│  propose → vote → converge → meet  │
└─────────────────────────────────────┘
```

This is rendered in monospace with thin box-drawing characters, at a medium-small size. It communicates the app's flow while establishing the protocol aesthetic. It's playful — winking at RFCs and protocol specs while being genuinely informative.

- The CTA button below uses the standard phosphor green primary style but with a small `→` arrow that animates on hover (slides right 4px). The button text could be "Explore Events" or "Join the Network."

### 7. Event Cards (Landing Page Grid)

**Current**: Banner image/gradient header, overlaid logo, status badge, metadata.

**New treatment: "Node Entries"**
- Remove the banner image/gradient header. Replace with a clean card that has the track/event color as a 2px left border (like a margin annotation).
- Event logo displayed as a small 32x32 circle at the top-left of the card, next to the event name.
- Event name in display font, status badge in monospace with square corners.
- Date and location shown with small monospace labels and lucide icons at thin stroke weight:
  ```
  ◆ Mar 14-16, 2026    ◇ Boulder, CO    ▲ 142 nodes
  ```
  Using small geometric glyphs (diamond, hollow diamond, triangle) as bullet points instead of standard icons — evoking map legend symbols.
- Hover: left border brightens to phosphor green. The card doesn't lift (no translateY) — instead, a subtle inner glow appears on the left edge, like a signal lighting up along a circuit trace.

### 8. Event Landing Page

**Current**: Hero gradient + title + action buttons + about section + quick action grid.

**New treatment:**
- Top section: Event name (large display font) + status badge (monospace) + event metadata in a structured "specification block":
  ```
  ┌ EVENT SPEC ──────────────────────┐
  │ Date      Mar 14-16, 2026       │
  │ Location  Boulder, CO           │
  │ Status    PROPOSALS OPEN        │
  │ Nodes     142 connected         │
  └──────────────────────────────────┘
  ```
  This is styled as a card with monospace text and thin borders — like a system specification panel. The "Nodes" count is a live indicator of participants.

- Quick action cards become a "Control Panel" — a 2x2 grid of action buttons with icon + monospace label + brief description. Each has a left-edge accent in a signal color (green for active actions, amber for pending, cyan for informational). Hover activates signal glow on the accent edge.

### 9. Proposal Form

**Current**: Standard form with sections and selector grids.

**New treatment: "Signal Broadcast Form"**
- Frame the form as composing a signal to broadcast to the network. The page header: "Broadcast a Session Proposal" with a small signal glyph icon.
- Each form section gets a monospace section label with a thin ruled line:
  ```
  ── SESSION DETAILS ───────────────────
  ```
- Format selector: Instead of a grid of cards, use a selector that looks like a diagram legend — each format is a row with an icon, monospace label, and description. Selected state: phosphor green left accent.
- Duration selector: Pill buttons become "dial positions" — small rounded-md buttons with monospace labels (`30M`, `45M`, `60M`, `90M`), evenly spaced, with the selected one having a filled background.
- Tags section: Tags typed in monospace, displayed as small labeled nodes with `×` remove buttons.
- Submit button: "Transmit Proposal →" with signal-ping animation on click.

### 10. Sessions Listing Page

**Current**: Search + filters + session card grid.

**New treatment:**
- Filter panel becomes a "Scan Parameters" control strip. Filters displayed as monospace toggle switches:
  - `FORMAT: [ALL] [TALK] [WORKSHOP] [DISCUSSION]`
  - `TRACK: [ALL] [●Tech] [●Gov] [●Social]` (colored dots for tracks)
  - `STATUS: [ALL] [PROPOSED] [SCHEDULED]`
  - `SORT: [SIGNAL↓] [RECENT] [A→Z]` (Signal = votes, emphasizing that votes are signals)
- Active filters: phosphor green text + underline (not filled background — cleaner).
- Search input: monospace placeholder text `> search sessions...` with the terminal-prompt `>` character built into the placeholder.
- The grid of session cards flows naturally below, each card a "node" in the network.

### 11. Schedule Page

**Current**: Day tabs, time/venue groupings, compact session cards.

**New treatment: "Convergence Map"**
- This is where the cartographic metaphor comes alive most fully.
- Day tabs become coordinate labels: `DAY 1: FRI`, `DAY 2: SAT`, `DAY 3: SUN` in monospace.
- Time slot headers shown as coordinate markers: a horizontal line with the time range labeled in monospace, and a small tick mark — like a y-axis label on a chart.
- Venue groupings marked with small map-pin glyphs and monospace labels.
- Session cards in the schedule are compact "plotted nodes" — smaller than the full session cards, showing just: title, format code (monospace), vote signal strength indicator, and track color accent.
- If a session has high votes relative to others in its time slot, its signal indicator glows slightly brighter — the Schelling point is visible as the brightest node in each time cluster.

### 12. My Votes Page

**Current**: Summary stats + vote list.

**New treatment: "Signal Allocation Dashboard"**
- Summary stats rendered as a "systems readout" — four values in a horizontal strip, each in a labeled monospace display:
  ```
  SESSIONS    VOTES CAST    CREDITS USED    CREDITS FREE
     8            14             26              74
  ```
  Numbers in large monospace with the phosphor green color. Labels in small uppercase monospace, muted.
- Each vote entry shows the session as a compact node with the vote count as an adjustable "dial" — the same +/- controls as the session card but in a horizontal layout emphasizing the allocation aspect.
- A subtle visualization of the quadratic cost could appear: as votes increase on a session, small tick marks appear showing the marginal cost escalation.

### 13. Login Page

**Current**: Mail icon + email form + magic link flow.

**New treatment: "Establish Connection"**
- Heading: "Establish Connection" (not "Welcome").
- The mail icon is replaced with the handshake glyph or the node-connection glyph.
- Email input with monospace placeholder: `> enter your address...`
- Submit button: "Send Handshake →"
- After sending magic link, the confirmation state shows:
  ```
  HANDSHAKE INITIATED
  ─────────────────────
  Verification signal sent to:
  user@example.com

  Check your inbox to complete the connection.
  ```
  This playful protocol language makes the mundane magic-link flow feel thematic without being confusing.

### 14. Footer

**Current**: Giant wordmark with glow effects, social links.

**New treatment: "Network Status Bar"**
- Remove the giant wordmark entirely. It's impressive but says nothing about the brand's meaning.
- Replace with a compact, information-rich footer styled like a terminal status bar or the bottom panel of a systems monitor:
  ```
  ┌─────────────────────────────────────────────┐
  │ SCHELLING POINT                             │
  │ Coordination Protocol for Unconferences     │
  │                                             │
  │ STATUS: OPERATIONAL    NETWORK: 12 events   │
  │ BUILD: v2.0.0          NODES: 847 users     │
  │                                             │
  │ [telegram] [x] [discord] [web]              │
  └─────────────────────────────────────────────┘
  ```
- This is tongue-in-cheek but also genuinely informative. The "status" and "network" metrics can be real data. Social links rendered as small icon buttons in a row.
- In the minimal footer variant (used in dashboards), just show: `SCHELLING POINT · v2.0` in monospace on the left, social icons on the right. One line. Clean.

### 15. Admin Dashboard

**Current**: Stats grid + tab navigation + session management.

**New treatment: "Control Center"**
- Admin stats cards become "system gauges" — each with a monospace label, large number, and a small bar or indicator showing relative magnitude.
- The stats grid header: `── SYSTEM STATUS ──` in monospace with ruled lines.
- Tab labels in monospace: `PENDING`, `APPROVED`, `SCHEDULED`, `REJECTED`.
- The batch actions toolbar at the bottom becomes a "command bar" with monospace action labels and a count indicator: `3 NODES SELECTED · [APPROVE] [SCHEDULE] [REJECT]`.
- Quick action banners use the amber signal color for attention instead of the current primary/5 treatment.

### 16. Notification Bell

**Current**: Bell icon with count badge, popover list.

**New treatment:**
- The bell becomes a small signal-receiver icon (or keep bell, but style minimally).
- Count badge: monospace number in a small square (not circle) with phosphor green background — like a terminal notification counter.
- Notification items in the popover: each prefixed with a timestamp in monospace and a colored status dot. The format evokes a system log:
  ```
  12:04  ● Session "DeFi Workshop" approved
  11:47  ● New proposal: "Mycelial Networks"
  09:30  ○ Vote milestone: 10 votes on "ZK Proofs"
  ```

### 17. Onboarding Modal

**Current**: Standard modal with steps.

**New treatment: "Network Initialization"**
- Title: "Initializing Your Node" or "Connecting to [Event Name]"
- Steps presented as a protocol sequence with monospace step indicators:
  ```
  [1/3] IDENTIFY    Set your display name
  [2/3] CONFIGURE   Choose your interests
  [3/3] CONNECT     Join the network
  ```
- Each step completed shows a checkmark in phosphor green. Current step has a subtle pulse on its indicator.
- Final step confirmation: "Connection Established ✓" with the signal-ping animation.

---

## Part IV: Implementation Plan

### Phase 0: Foundation (CSS & Tokens)
**Files affected:** `globals.css`, `tailwind.config.ts`
**Estimated scope:** ~200 lines of CSS changes

Steps:
1. **Update CSS custom properties** — Add new tokens (`--substrate`, `--signal`, `--signal-amber`, `--signal-cyan`, `--surface-1`, `--surface-2`). Adjust existing `--background` values for both themes.
2. **Add Space Mono font** — Download/link Space Mono. Add `@font-face` declarations. Add `mono` to Tailwind fontFamily config.
3. **Create dot-grid substrate** — CSS class `.dot-grid` using `radial-gradient` for repeating dot pattern.
4. **Create contour-line SVG** — A reusable SVG pattern component for topographic lines.
5. **Replace glass-card** — New `.system-card` class: solid background, thin border, optional colored top/left accent.
6. **Replace neon-glow** — New `.signal-glow` class: tighter, more focused box-shadow.
7. **Add signal-ping animation** — `@keyframes signal-ping` for vote feedback.
8. **Add counter-tick animation** — CSS animation for number transitions.
9. **Update border-radius system** — Define when to use `rounded-lg` vs `rounded-md` vs `rounded-sm`.
10. **Remove deprecated classes** — `glass-card`, `neon-glow`, `neon-glow-sm`, `neon-glow-hover`, `neon-text`, `gradient-dark`, `gradient-card`, `animated-gradient`, `btn-primary-glow`, gradient drift animations.

### Phase 1: Core Components (shadcn/ui overrides)
**Files affected:** `components/ui/button.tsx`, `components/ui/card.tsx`, `components/ui/badge.tsx`, `components/ui/input.tsx`, `components/ui/progress.tsx`
**Estimated scope:** ~150 lines of component changes

Steps:
1. **Button** — Update border-radius to `rounded-md`. Add subtle active state improvements. Keep `active:scale-[0.98]`. Adjust variant colors for new token system.
2. **Card** — Remove shadow-sm default. Add optional `accentColor` prop for top/left colored border. Default to `rounded-lg` with thin substrate-colored border.
3. **Badge** — Change to `rounded-sm` with monospace font. Adjust padding. Update variant colors to use signal palette.
4. **Input** — Add left-accent styling option. Monospace for number inputs. Update focus ring to match new signal color.
5. **Progress** — Add tick marks. Update indicator colors to use signal palette (green → amber at low values).

### Phase 2: Layout Shell
**Files affected:** `components/SiteHeader.tsx`, `components/DashboardLayout.tsx`, `components/Footer.tsx`, `components/CreditBar.tsx`
**Estimated scope:** ~300 lines of changes

Steps:
1. **SiteHeader** — Add connection-status node indicator. Update nav labels to monospace uppercase. Add ruler-edge border.
2. **DashboardLayout** — Update tab styling to channel-selector pattern. Update admin badge to monospace bordered style. Add ruler-edge content separator. Update mobile nav with monospace abbreviations.
3. **Footer** — Redesign as network status bar. Remove giant wordmark. Add structured monospace info block. Simplify minimal variant.
4. **CreditBar** — Redesign as resource gauge with tick marks. Monospace numbers. Add quadratic pricing hint in terminal style. Implement low-credit amber transition.

### Phase 3: Session Components
**Files affected:** `components/SessionCard.tsx`, vote controls, VoteDots (if exists)
**Estimated scope:** ~200 lines of changes

Steps:
1. **SessionCard** — Add colored top-accent border. Add node ID in monospace. Update format labels to monospace uppercase. Redesign vote display with signal-strength indicator. Update vote controls to precise instrument style. Add signal-ping on vote. Style tags as monospace labeled nodes. Update hover state.
2. **Vote controls** — Monospace credit cost display with `→` prefix. Counter-tick animation on vote count changes.
3. **CreditBar integration** — Ensure credit bar updates feel connected (same counter-tick animation).

### Phase 4: Landing & Event Pages
**Files affected:** `app/page.tsx`, `app/e/[slug]/page.tsx`, `app/login/page.tsx`
**Estimated scope:** ~400 lines of changes

Steps:
1. **Landing hero** — Remove gradient blobs. Add dot-grid + contour line background. Update hero text treatment. Add protocol descriptor block. Update CTA button.
2. **Event cards** — Remove banner headers. Add left-border accent. Add monospace metadata with map-legend glyphs. Update hover to signal-glow on edge.
3. **Event landing** — Create specification block component. Redesign quick actions as control panel. Update status display.
4. **Login page** — Update copy to "Establish Connection" language. Restyle with handshake metaphor. Add monospace input styling. Protocol-style confirmation state.

### Phase 5: Feature Pages
**Files affected:** `app/e/[slug]/sessions/page.tsx`, `app/e/[slug]/schedule/page.tsx`, `app/e/[slug]/propose/page.tsx`, `app/e/[slug]/my-votes/page.tsx`
**Estimated scope:** ~350 lines of changes

Steps:
1. **Sessions listing** — Restyle filter panel as scan parameters. Monospace filter labels. Terminal-style search input. Update active filter indicators.
2. **Schedule page** — Monospace day coordinate labels. Ruled-line time headers with tick marks. Signal-strength indicators on high-vote sessions. Map-pin venue markers.
3. **Proposal form** — Add section rule headers. Restyle format selector as diagram legend. Duration dial buttons. Terminal-style tag input. "Transmit Proposal" submit.
4. **My Votes** — Systems readout summary strip. Monospace number displays. Compact vote entry layout.

### Phase 6: Admin & Auxiliary
**Files affected:** Admin pages, notification components, onboarding modal, creation wizard
**Estimated scope:** ~250 lines of changes

Steps:
1. **Admin dashboard** — System gauge stat cards. Monospace tab labels. Command bar batch actions. Ruled section headers.
2. **Notifications** — Log-style notification entries. Square count badge. Monospace timestamps.
3. **Onboarding** — Protocol initialization sequence. Step indicators with monospace labels. Connection established confirmation.
4. **Event creation wizard** — "Configure New Node" framing. Step progress as protocol stages.

### Phase 7: Custom SVG Glyphs & Brand Assets
**Files affected:** New SVG components, logo treatment
**Estimated scope:** ~100 lines new components

Steps:
1. Create `components/glyphs/` directory with small SVG components:
   - `ConvergenceGlyph.tsx`
   - `NodeGlyph.tsx`
   - `HandshakeGlyph.tsx`
   - `SignalGlyph.tsx`
2. Create `ContourPattern.tsx` — reusable SVG background component.
3. Update favicon and OpenGraph images to reflect new aesthetic if needed.

---

## Part V: What This Achieves

### Before
A competent but generic tech-product aesthetic. Dark mode + neon green + glassmorphism. Could be any Web3 app, any crypto project, any dev-tool landing page. The design tells you nothing about what you're interacting with or why it matters.

### After
An aesthetic that is *uniquely and unmistakably* Schelling Point. Every visual element communicates the core concepts:

- **The dot-grid substrate** tells you that you're in a structured space — a coordinate system where position and proximity matter.
- **The monospace protocol layer** tells you that there's a system running underneath — precise, transparent, trustworthy.
- **The phosphor color signals** tell you where coordination is happening — where the network is most active, where convergence is forming.
- **The topographic textures** tell you that collective behavior creates a landscape — votes shape terrain, and the Schelling point is the summit.
- **The node/connection metaphors** tell you that you're part of a living network — your participation matters, your connections are real.
- **The tactile interactions** tell you that your actions have weight — casting a vote sends a signal into the system, proposing a session broadcasts to the network.

The user doesn't need to understand game theory to *feel* these things. The aesthetic does the work of communicating the brand's values without ever needing to explain them. That's what good design does — it makes the invisible visible, the abstract tangible, and the complex intuitive.

### The Tone
Playful but precise. Warm but systematic. Like a beautifully designed scientific instrument that you enjoy using. Like a well-worn field notebook filled with careful observations. Like the first time you saw a network diagram and realized that everything is connected.

Not corporate. Not cold. Not intimidating. Not trying too hard. Just honest, specific, and alive with the quiet electricity of people finding each other across the noise.
