-- Backfill all existing data with EthBoulder event ID
DO $$
DECLARE
  ethboulder_id UUID;
BEGIN
  SELECT id INTO ethboulder_id FROM events WHERE slug = 'ethboulder-2026';

  -- Backfill each table
  UPDATE sessions SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE votes SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE venues SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE time_slots SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE tracks SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE favorites SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE session_cohosts SET event_id = ethboulder_id WHERE event_id IS NULL;
  UPDATE cohost_invites SET event_id = ethboulder_id WHERE event_id IS NULL;
END $$;

-- Add NOT NULL constraints
ALTER TABLE sessions ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE votes ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE venues ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE time_slots ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE tracks ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE favorites ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE session_cohosts ALTER COLUMN event_id SET NOT NULL;
ALTER TABLE cohost_invites ALTER COLUMN event_id SET NOT NULL;

-- Add ON DELETE CASCADE
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_event_id_fkey;
ALTER TABLE sessions ADD CONSTRAINT sessions_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE votes DROP CONSTRAINT IF EXISTS votes_event_id_fkey;
ALTER TABLE votes ADD CONSTRAINT votes_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE venues DROP CONSTRAINT IF EXISTS venues_event_id_fkey;
ALTER TABLE venues ADD CONSTRAINT venues_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_event_id_fkey;
ALTER TABLE time_slots ADD CONSTRAINT time_slots_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_event_id_fkey;
ALTER TABLE tracks ADD CONSTRAINT tracks_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE favorites DROP CONSTRAINT IF EXISTS favorites_event_id_fkey;
ALTER TABLE favorites ADD CONSTRAINT favorites_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE session_cohosts DROP CONSTRAINT IF EXISTS session_cohosts_event_id_fkey;
ALTER TABLE session_cohosts ADD CONSTRAINT session_cohosts_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

ALTER TABLE cohost_invites DROP CONSTRAINT IF EXISTS cohost_invites_event_id_fkey;
ALTER TABLE cohost_invites ADD CONSTRAINT cohost_invites_event_id_fkey
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;

-- Add indexes for query performance
CREATE INDEX idx_sessions_event_status ON sessions(event_id, status);
CREATE INDEX idx_sessions_event_votes ON sessions(event_id, total_votes DESC);
CREATE INDEX idx_votes_event_user ON votes(event_id, user_id);
CREATE INDEX idx_venues_event ON venues(event_id);
CREATE INDEX idx_time_slots_event ON time_slots(event_id);
CREATE INDEX idx_tracks_event ON tracks(event_id);
CREATE INDEX idx_favorites_event ON favorites(event_id);
