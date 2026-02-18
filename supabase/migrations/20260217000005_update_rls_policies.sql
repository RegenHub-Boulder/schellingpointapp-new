-- Update all RLS policies to use event_members instead of is_admin

-- =============================================================================
-- SESSIONS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage all sessions" ON sessions;

CREATE POLICY "Event admins can manage sessions" ON sessions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = sessions.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Update insert policy to check event membership
DROP POLICY IF EXISTS "Authenticated users can create sessions" ON sessions;

CREATE POLICY "Event members can create sessions" ON sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = sessions.event_id
      AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- VENUES
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage venues" ON venues;

CREATE POLICY "Event admins can manage venues" ON venues FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = venues.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- TIME SLOTS
-- =============================================================================
DROP POLICY IF EXISTS "Admins can manage time slots" ON time_slots;

CREATE POLICY "Event admins can manage time slots" ON time_slots FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = time_slots.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- =============================================================================
-- VOTES
-- =============================================================================
-- Votes are already scoped to user_id, but add event membership check

DROP POLICY IF EXISTS "Users can view own votes" ON votes;
CREATE POLICY "Users can view own votes" ON votes FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create votes" ON votes;
CREATE POLICY "Users can create votes" ON votes FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own votes" ON votes;
CREATE POLICY "Users can update own votes" ON votes FOR UPDATE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own votes" ON votes;
CREATE POLICY "Users can delete own votes" ON votes FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = votes.event_id
      AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- FAVORITES
-- =============================================================================
DROP POLICY IF EXISTS "Users can view own favorites" ON favorites;
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = favorites.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create favorites" ON favorites;
CREATE POLICY "Users can create favorites" ON favorites FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = favorites.event_id
      AND user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own favorites" ON favorites;
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM event_members
      WHERE event_id = favorites.event_id
      AND user_id = auth.uid()
    )
  );

-- =============================================================================
-- TRACKS
-- =============================================================================
-- Add admin management policy for tracks
CREATE POLICY "Event admins can manage tracks" ON tracks FOR ALL USING (
  EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = tracks.event_id
    AND user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);

-- Track leads can update their track
CREATE POLICY "Track leads can manage their tracks" ON tracks FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM event_members em
    WHERE em.event_id = tracks.event_id
    AND em.user_id = auth.uid()
    AND em.role = 'track_lead'
  )
  AND lead_user_id = auth.uid()
);
