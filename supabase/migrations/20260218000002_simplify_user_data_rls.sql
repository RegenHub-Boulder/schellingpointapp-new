-- Simplify votes and favorites RLS policies
-- Remove unnecessary event_members checks from SELECT operations
-- Users should always be able to see their own votes/favorites

-- =============================================================================
-- VOTES - Simplify SELECT policy
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own votes" ON votes;

-- Simple rule: if it's your vote, you can see it
CREATE POLICY "Users can view own votes" ON votes FOR SELECT
  USING (user_id = auth.uid());

-- =============================================================================
-- FAVORITES - Simplify SELECT policy
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;

-- Simple rule: if it's your favorite, you can see it
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT
  USING (user_id = auth.uid());

-- Note: INSERT/UPDATE/DELETE still require event membership (in 20260217000005)
-- This is intentional - you can only vote/favorite in events you're a member of
-- But you can always VIEW your existing votes/favorites
