-- Fix event_members RLS - remove ALL recursive policies
-- The FOR ALL policy was also causing recursion on SELECT

-- Drop ALL existing policies on event_members to start fresh
DROP POLICY IF EXISTS "Event members can view membership" ON event_members;
DROP POLICY IF EXISTS "Users can view own membership" ON event_members;
DROP POLICY IF EXISTS "Members can view event roster" ON event_members;
DROP POLICY IF EXISTS "Users can leave events" ON event_members;
DROP POLICY IF EXISTS "Event admins can manage members" ON event_members;
DROP POLICY IF EXISTS "Users can join public events" ON event_members;

-- =============================================================================
-- SELECT POLICIES (no recursion allowed!)
-- =============================================================================

-- Users can always view their OWN membership (no recursion)
CREATE POLICY "Users can view own membership" ON event_members FOR SELECT
  USING (user_id = auth.uid());

-- Anyone can view memberships for public events (no recursion - checks events table only)
CREATE POLICY "Anyone can view public event members" ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_members.event_id
      AND e.visibility = 'public'
    )
  );

-- =============================================================================
-- INSERT POLICIES
-- =============================================================================

-- Users can join public events as attendees (no recursion)
CREATE POLICY "Users can join public events" ON event_members FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'attendee'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
      AND e.visibility = 'public'
    )
  );

-- =============================================================================
-- UPDATE POLICIES
-- =============================================================================

-- For now, only allow direct database updates (admins via service role)
-- We'll add proper admin update policies later with security definer functions

-- =============================================================================
-- DELETE POLICIES
-- =============================================================================

-- Users can leave events (remove their own membership)
CREATE POLICY "Users can leave events" ON event_members FOR DELETE
  USING (user_id = auth.uid());
