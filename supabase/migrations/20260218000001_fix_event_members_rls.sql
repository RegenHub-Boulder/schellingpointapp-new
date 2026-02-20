-- Fix event_members RLS: allow users to check their own membership

-- Drop the existing SELECT policy that requires membership
DROP POLICY IF EXISTS "Event members can view membership" ON event_members;

-- Users can always view their OWN membership (needed for auth flow)
CREATE POLICY "Users can view own membership" ON event_members FOR SELECT
  USING (user_id = auth.uid());

-- Members can view OTHER members of events they belong to
CREATE POLICY "Members can view event roster" ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
    )
  );
