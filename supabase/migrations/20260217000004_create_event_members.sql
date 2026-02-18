-- Create event_members table (replaces is_admin)
CREATE TABLE event_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'attendee' CHECK (role IN (
    'owner', 'admin', 'moderator', 'track_lead', 'volunteer', 'attendee'
  )),
  vote_credits INTEGER,  -- overrides event default if set
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Indexes
CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);
CREATE INDEX idx_event_members_role ON event_members(event_id, role);

-- RLS
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;

-- Members can view other members of events they belong to
CREATE POLICY "Event members can view membership" ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
    )
  );

-- Users can leave events (delete own membership)
CREATE POLICY "Users can leave events" ON event_members FOR DELETE
  USING (user_id = auth.uid());

-- Owners/admins can manage members
CREATE POLICY "Event admins can manage members" ON event_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
    )
  );

-- Users can join public events as attendees
CREATE POLICY "Users can join public events" ON event_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    AND role = 'attendee'
    AND EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_id
      AND e.visibility = 'public'
    )
  );

-- Migrate existing admins to event_members
INSERT INTO event_members (event_id, user_id, role)
SELECT
  (SELECT id FROM events WHERE slug = 'ethboulder-2026'),
  id,
  'admin'
FROM profiles WHERE is_admin = true
ON CONFLICT (event_id, user_id) DO NOTHING;

-- Set the first admin as owner
UPDATE event_members
SET role = 'owner'
WHERE id = (
  SELECT em.id FROM event_members em
  JOIN profiles p ON em.user_id = p.id
  WHERE em.event_id = (SELECT id FROM events WHERE slug = 'ethboulder-2026')
  AND p.is_admin = true
  ORDER BY p.created_at ASC
  LIMIT 1
);

-- Migrate all other users as attendees
INSERT INTO event_members (event_id, user_id, role)
SELECT
  (SELECT id FROM events WHERE slug = 'ethboulder-2026'),
  id,
  'attendee'
FROM profiles
WHERE NOT EXISTS (
  SELECT 1 FROM event_members em
  WHERE em.user_id = profiles.id
  AND em.event_id = (SELECT id FROM events WHERE slug = 'ethboulder-2026')
)
ON CONFLICT (event_id, user_id) DO NOTHING;
