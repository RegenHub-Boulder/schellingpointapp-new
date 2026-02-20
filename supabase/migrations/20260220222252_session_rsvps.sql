-- Migration: Create session_rsvps table for RSVP tracking
-- Phase 6.5: Session RSVP with Capacity Tracking

-- ============================================================================
-- CREATE TABLE
-- ============================================================================

CREATE TABLE session_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  waitlist_position INTEGER, -- NULL for confirmed, position number for waitlisted
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

-- Index for efficient lookups
CREATE INDEX idx_session_rsvps_event ON session_rsvps(event_id);
CREATE INDEX idx_session_rsvps_session ON session_rsvps(session_id, status);
CREATE INDEX idx_session_rsvps_user ON session_rsvps(user_id);

-- ============================================================================
-- ADD RSVP COUNT TO SESSIONS
-- ============================================================================

-- Add column to track RSVP count for quick lookups
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS rsvp_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS waitlist_count INTEGER NOT NULL DEFAULT 0;

-- ============================================================================
-- TRIGGER: Update RSVP counts on sessions table
-- ============================================================================

CREATE OR REPLACE FUNCTION update_session_rsvp_counts()
RETURNS TRIGGER AS $$
BEGIN
  -- Update counts for affected session
  IF TG_OP = 'DELETE' THEN
    UPDATE sessions
    SET rsvp_count = (
      SELECT COUNT(*) FROM session_rsvps
      WHERE session_id = OLD.session_id AND status = 'confirmed'
    ),
    waitlist_count = (
      SELECT COUNT(*) FROM session_rsvps
      WHERE session_id = OLD.session_id AND status = 'waitlist'
    )
    WHERE id = OLD.session_id;
    RETURN OLD;
  ELSE
    UPDATE sessions
    SET rsvp_count = (
      SELECT COUNT(*) FROM session_rsvps
      WHERE session_id = NEW.session_id AND status = 'confirmed'
    ),
    waitlist_count = (
      SELECT COUNT(*) FROM session_rsvps
      WHERE session_id = NEW.session_id AND status = 'waitlist'
    )
    WHERE id = NEW.session_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_session_rsvp_counts
  AFTER INSERT OR UPDATE OR DELETE ON session_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION update_session_rsvp_counts();

-- ============================================================================
-- TRIGGER: Auto-promote from waitlist when spot opens
-- ============================================================================

CREATE OR REPLACE FUNCTION promote_from_waitlist()
RETURNS TRIGGER AS $$
DECLARE
  session_capacity INTEGER;
  current_confirmed INTEGER;
  next_waitlist_id UUID;
BEGIN
  -- Only process when an RSVP is cancelled or deleted
  IF TG_OP = 'DELETE' OR (TG_OP = 'UPDATE' AND NEW.status = 'cancelled' AND OLD.status = 'confirmed') THEN
    -- Get session capacity from venue
    SELECT v.capacity INTO session_capacity
    FROM sessions s
    LEFT JOIN venues v ON s.venue_id = v.id
    WHERE s.id = COALESCE(NEW.session_id, OLD.session_id);

    -- If no capacity limit, no promotion needed
    IF session_capacity IS NULL THEN
      RETURN COALESCE(NEW, OLD);
    END IF;

    -- Get current confirmed count
    SELECT COUNT(*) INTO current_confirmed
    FROM session_rsvps
    WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
      AND status = 'confirmed';

    -- If there's room, promote the first waitlisted person
    IF current_confirmed < session_capacity THEN
      SELECT id INTO next_waitlist_id
      FROM session_rsvps
      WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
        AND status = 'waitlist'
      ORDER BY waitlist_position ASC NULLS LAST, created_at ASC
      LIMIT 1;

      IF next_waitlist_id IS NOT NULL THEN
        UPDATE session_rsvps
        SET status = 'confirmed',
            waitlist_position = NULL,
            updated_at = NOW()
        WHERE id = next_waitlist_id;

        -- Reorder remaining waitlist positions
        WITH ordered AS (
          SELECT id, ROW_NUMBER() OVER (ORDER BY waitlist_position ASC NULLS LAST, created_at ASC) as new_pos
          FROM session_rsvps
          WHERE session_id = COALESCE(NEW.session_id, OLD.session_id)
            AND status = 'waitlist'
        )
        UPDATE session_rsvps r
        SET waitlist_position = o.new_pos
        FROM ordered o
        WHERE r.id = o.id;
      END IF;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_promote_from_waitlist
  AFTER UPDATE OR DELETE ON session_rsvps
  FOR EACH ROW
  EXECUTE FUNCTION promote_from_waitlist();

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE session_rsvps ENABLE ROW LEVEL SECURITY;

-- Users can view RSVPs for events they're members of
CREATE POLICY "Members can view RSVPs"
  ON session_rsvps
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = session_rsvps.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- Users can create their own RSVPs
CREATE POLICY "Users can create own RSVPs"
  ON session_rsvps
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = session_rsvps.event_id
        AND event_members.user_id = auth.uid()
    )
  );

-- Users can update their own RSVPs
CREATE POLICY "Users can update own RSVPs"
  ON session_rsvps
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own RSVPs
CREATE POLICY "Users can delete own RSVPs"
  ON session_rsvps
  FOR DELETE
  USING (user_id = auth.uid());

-- Admins can manage all RSVPs for their events
CREATE POLICY "Admins can manage all RSVPs"
  ON session_rsvps
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = session_rsvps.event_id
        AND event_members.user_id = auth.uid()
        AND event_members.role IN ('owner', 'admin')
    )
  );
