-- EthBoulder Schema Extensions
-- Adds tracks, extends venues/time_slots/sessions for hybrid unconference model

-- =============================================================================
-- TRACKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  color TEXT,
  lead_name TEXT,
  lead_email TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;

-- Everyone can view tracks
CREATE POLICY "Tracks viewable by everyone" ON tracks FOR SELECT USING (true);

-- Admins can manage tracks
CREATE POLICY "Admins can manage tracks" ON tracks FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- =============================================================================
-- VENUES EXTENSIONS
-- =============================================================================
ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS style TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE venues ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- =============================================================================
-- TIME SLOTS EXTENSIONS
-- =============================================================================
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS venue_id UUID REFERENCES venues(id) ON DELETE CASCADE;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS day_date DATE;
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS slot_type TEXT DEFAULT 'session';
-- slot_type values: 'session', 'break', 'checkin', 'unconference', 'track'

-- Add constraint for slot_type
ALTER TABLE time_slots DROP CONSTRAINT IF EXISTS time_slots_slot_type_check;
ALTER TABLE time_slots ADD CONSTRAINT time_slots_slot_type_check
  CHECK (slot_type IN ('session', 'break', 'checkin', 'unconference', 'track'));

-- Index for efficient venue+day queries
CREATE INDEX IF NOT EXISTS idx_time_slots_venue_day ON time_slots(venue_id, day_date);

-- =============================================================================
-- SESSIONS EXTENSIONS
-- =============================================================================
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS track_id UUID REFERENCES tracks(id) ON DELETE SET NULL;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS session_type TEXT DEFAULT 'proposed';
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS is_votable BOOLEAN DEFAULT TRUE;

-- session_type values: 'curated', 'proposed', 'workshop', 'track_reserved'
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_session_type_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_session_type_check
  CHECK (session_type IN ('curated', 'proposed', 'workshop', 'track_reserved'));

-- Index for track queries
CREATE INDEX IF NOT EXISTS idx_sessions_track ON sessions(track_id);

-- =============================================================================
-- UPDATE SESSIONS FORMAT OPTIONS
-- =============================================================================
-- Add 'fireside' and 'ceremony' to format options
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_format_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_format_check
  CHECK (format IN ('talk', 'workshop', 'discussion', 'panel', 'demo', 'fireside', 'ceremony'));
