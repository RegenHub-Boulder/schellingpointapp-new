-- =============================================================================
-- CO-HOST & INVITE TABLES
-- Adds multi-host support via a junction table and invite-link flow
-- Fully additive migration — safe for production with zero downtime.
-- =============================================================================

-- Wrap everything in a transaction so it's all-or-nothing
BEGIN;

-- Enable pgcrypto for gen_random_bytes()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- session_cohosts: junction table linking sessions to additional host profiles
CREATE TABLE IF NOT EXISTS session_cohosts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  display_order INTEGER DEFAULT 0,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_session_cohosts_session ON session_cohosts(session_id);
CREATE INDEX IF NOT EXISTS idx_session_cohosts_user ON session_cohosts(user_id);

-- cohost_invites: stores invite tokens for the co-host invite flow
CREATE TABLE IF NOT EXISTS cohost_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE DEFAULT encode(extensions.gen_random_bytes(32), 'hex'),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  accepted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,
  CONSTRAINT token_length CHECK (length(token) = 64)
);

CREATE INDEX IF NOT EXISTS idx_cohost_invites_token ON cohost_invites(token);
CREATE INDEX IF NOT EXISTS idx_cohost_invites_session ON cohost_invites(session_id);

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE session_cohosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE cohost_invites ENABLE ROW LEVEL SECURITY;

-- session_cohosts: public read (needed to display hosts on session cards)
CREATE POLICY "Anyone can view session cohosts" ON session_cohosts
  FOR SELECT USING (true);

-- session_cohosts: primary host can add co-hosts
CREATE POLICY "Primary host can add cohosts" ON session_cohosts
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

-- session_cohosts: primary host can remove any co-host
CREATE POLICY "Primary host can remove cohosts" ON session_cohosts
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

-- session_cohosts: co-host can remove themselves
CREATE POLICY "Cohosts can remove themselves" ON session_cohosts
  FOR DELETE USING (user_id = auth.uid());

-- session_cohosts: admin full access
CREATE POLICY "Admins can manage session cohosts" ON session_cohosts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- cohost_invites: host and admin can view invites for their sessions
CREATE POLICY "Host can view invites" ON cohost_invites
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

-- cohost_invites: host can create invites
CREATE POLICY "Host can create invites" ON cohost_invites
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

-- cohost_invites: host can update invites (revoke)
CREATE POLICY "Host can update invites" ON cohost_invites
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM sessions WHERE id = session_id AND host_id = auth.uid())
  );

-- cohost_invites: admin full access
CREATE POLICY "Admins can manage cohost invites" ON cohost_invites
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
  );

-- =============================================================================
-- UPDATE SESSION EDIT POLICY TO INCLUDE CO-HOSTS
-- =============================================================================

-- The DROP + CREATE below run inside the same transaction (BEGIN above),
-- so if the CREATE fails the DROP is rolled back too — hosts never lose
-- their edit ability even momentarily.

-- Drop old host-only update policy and replace with one that also allows co-hosts.
-- The new policy is a strict *superset* of the old one: host_id = auth.uid() still
-- works exactly as before; the OR branch just adds co-host access.
DROP POLICY IF EXISTS "Hosts can update own pending sessions" ON sessions;

CREATE POLICY "Hosts and cohosts can update pending sessions" ON sessions
  FOR UPDATE USING (
    status = 'pending'
    AND (
      host_id = auth.uid()
      OR EXISTS (SELECT 1 FROM session_cohosts WHERE session_id = sessions.id AND user_id = auth.uid())
    )
  );

-- Also allow co-hosts to view pending sessions they're co-hosting
-- (The existing SELECT policy only allows host_id = auth.uid() for pending sessions)
CREATE POLICY "Cohosts can view their pending sessions" ON sessions
  FOR SELECT USING (
    status = 'pending'
    AND EXISTS (SELECT 1 FROM session_cohosts WHERE session_id = sessions.id AND user_id = auth.uid())
  );

COMMIT;
