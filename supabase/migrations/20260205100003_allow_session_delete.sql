-- Allow session hosts to delete their own sessions
-- Admins can already delete via the existing "Admins can manage all sessions" policy

CREATE POLICY "Hosts can delete own sessions" ON sessions FOR DELETE
  USING (host_id = auth.uid());
