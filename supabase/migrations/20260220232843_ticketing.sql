-- Migration: Create ticketing system tables
-- Phase 7.1: Ticket Tier Configuration

-- ============================================================================
-- TICKET TIERS TABLE
-- ============================================================================

CREATE TABLE ticket_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0, -- Price in cents (0 = free)
  currency TEXT NOT NULL DEFAULT 'usd',
  quantity_total INTEGER, -- NULL = unlimited
  quantity_sold INTEGER NOT NULL DEFAULT 0,
  sale_starts_at TIMESTAMPTZ,
  sale_ends_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  -- Access control
  allows_proposals BOOLEAN NOT NULL DEFAULT true, -- Can propose sessions
  allows_voting BOOLEAN NOT NULL DEFAULT true, -- Can vote on sessions
  vote_credits_override INTEGER, -- Override event default vote credits (NULL = use event default)
  -- Stripe integration
  stripe_price_id TEXT, -- Stripe Price ID for checkout
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ticket_tiers_event ON ticket_tiers(event_id, is_active);

-- ============================================================================
-- TICKETS TABLE (Purchased tickets)
-- ============================================================================

CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  tier_id UUID NOT NULL REFERENCES ticket_tiers(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',     -- Payment initiated
    'confirmed',   -- Payment confirmed
    'cancelled',   -- Cancelled/refunded
    'checked_in'   -- Used for entry
  )),
  -- QR Code for check-in
  qr_code TEXT UNIQUE, -- JWT or unique code for scanning
  qr_generated_at TIMESTAMPTZ,
  -- Check-in tracking
  checked_in_at TIMESTAMPTZ,
  checked_in_by UUID REFERENCES profiles(id),
  -- Payment info
  payment_intent_id TEXT, -- Stripe Payment Intent ID
  amount_paid_cents INTEGER,
  payment_confirmed_at TIMESTAMPTZ,
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_event ON tickets(event_id, status);
CREATE INDEX idx_tickets_user ON tickets(user_id);
CREATE INDEX idx_tickets_qr ON tickets(qr_code);
CREATE INDEX idx_tickets_payment ON tickets(payment_intent_id);

-- ============================================================================
-- TRIGGER: Update quantity_sold on ticket purchase
-- ============================================================================

CREATE OR REPLACE FUNCTION update_tier_quantity_sold()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'confirmed' THEN
    UPDATE ticket_tiers
    SET quantity_sold = quantity_sold + 1,
        updated_at = NOW()
    WHERE id = NEW.tier_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle status changes
    IF OLD.status != 'confirmed' AND NEW.status = 'confirmed' THEN
      UPDATE ticket_tiers
      SET quantity_sold = quantity_sold + 1,
          updated_at = NOW()
      WHERE id = NEW.tier_id;
    ELSIF OLD.status = 'confirmed' AND NEW.status = 'cancelled' THEN
      UPDATE ticket_tiers
      SET quantity_sold = GREATEST(0, quantity_sold - 1),
          updated_at = NOW()
      WHERE id = NEW.tier_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tier_quantity_sold
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_quantity_sold();

-- ============================================================================
-- TRIGGER: Auto-add ticket holder as event member
-- ============================================================================

CREATE OR REPLACE FUNCTION add_ticket_holder_as_member()
RETURNS TRIGGER AS $$
DECLARE
  tier_vote_credits INTEGER;
  event_vote_credits INTEGER;
BEGIN
  -- Only when ticket is confirmed
  IF NEW.status = 'confirmed' THEN
    -- Get vote credits (tier override or event default)
    SELECT
      tt.vote_credits_override,
      e.vote_credits_per_user
    INTO tier_vote_credits, event_vote_credits
    FROM ticket_tiers tt
    JOIN events e ON tt.event_id = e.id
    WHERE tt.id = NEW.tier_id;

    -- Add as attendee if not already a member
    INSERT INTO event_members (event_id, user_id, role, vote_credits)
    VALUES (
      NEW.event_id,
      NEW.user_id,
      'attendee',
      COALESCE(tier_vote_credits, event_vote_credits)
    )
    ON CONFLICT (event_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_ticket_holder_as_member
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION add_ticket_holder_as_member();

-- ============================================================================
-- ADD TICKETING COLUMNS TO EVENTS
-- ============================================================================

ALTER TABLE events ADD COLUMN IF NOT EXISTS ticketing_enabled BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS stripe_account_id TEXT; -- Connected Stripe account

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE ticket_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Ticket tiers: Anyone can view active tiers for public events
CREATE POLICY "Public can view active ticket tiers"
  ON ticket_tiers
  FOR SELECT
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM events
      WHERE events.id = ticket_tiers.event_id
        AND events.visibility = 'public'
    )
  );

-- Ticket tiers: Event members can view all tiers
CREATE POLICY "Members can view all ticket tiers"
  ON ticket_tiers
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = ticket_tiers.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- Ticket tiers: Admins can manage tiers
CREATE POLICY "Admins can manage ticket tiers"
  ON ticket_tiers
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = ticket_tiers.event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin')
    )
  );

-- Tickets: Users can view their own tickets
CREATE POLICY "Users can view own tickets"
  ON tickets
  FOR SELECT
  USING (user_id = auth.uid());

-- Tickets: Users can create their own tickets (for checkout)
CREATE POLICY "Users can create own tickets"
  ON tickets
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Tickets: Admins can view all event tickets
CREATE POLICY "Admins can view all event tickets"
  ON tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = tickets.event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin')
    )
  );

-- Tickets: Volunteers can view for check-in
CREATE POLICY "Volunteers can view tickets for checkin"
  ON tickets
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = tickets.event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin', 'volunteer')
    )
  );

-- Tickets: Volunteers can update for check-in
CREATE POLICY "Volunteers can update tickets for checkin"
  ON tickets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = tickets.event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin', 'volunteer')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = tickets.event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin', 'volunteer')
    )
  );
