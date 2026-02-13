-- =============================================================================
-- FIX: Allow hosts & co-hosts to update sessions at any status
--
-- The previous policy restricted updates to status = 'pending', which
-- prevented newly-assigned hosts (via admin edit) from editing sessions
-- that had already been moved to 'scheduled' or 'approved'.
-- =============================================================================

BEGIN;

DROP POLICY IF EXISTS "Hosts and cohosts can update pending sessions" ON sessions;

CREATE POLICY "Hosts and cohosts can update own sessions" ON sessions
  FOR UPDATE USING (
    host_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM session_cohosts
      WHERE session_id = sessions.id AND user_id = auth.uid()
    )
  );

COMMIT;
