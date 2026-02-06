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
-- EthBoulder Seed Data
-- Event dates: February 13-15, 2026 (Friday, Saturday, Sunday)

-- =============================================================================
-- CLEAR EXISTING DATA (for clean re-seeding)
-- =============================================================================
DELETE FROM sessions WHERE true;
DELETE FROM time_slots WHERE true;
DELETE FROM tracks WHERE true;
DELETE FROM venues WHERE true;

-- =============================================================================
-- VENUES
-- =============================================================================
INSERT INTO venues (name, slug, capacity, style, features, is_primary, notes) VALUES
  ('E-Town', 'etown', 330, 'main_stage',
   ARRAY['projector', 'microphone', 'stage', 'livestream'], true,
   'Main venue hub - curated speakers and keynotes'),

  ('Regen Hub', 'regen-hub', 30, 'side_venue',
   ARRAY['whiteboard', 'projector', 'round tables'], false,
   'Side venue for workshops and track sessions'),

  ('Terrible Turtle', 'terrible-turtle', 65, 'side_venue',
   ARRAY['whiteboard', 'projector', 'lounge area'], false,
   'Creative Track home base + unconference slots'),

  ('Riverside', 'riverside', NULL, 'lounge',
   ARRAY['flexible seating', 'outdoor access'], false,
   'Flexible space - hours TBD'),

  ('Velvet Elk Lounge', 'velvet-elk', NULL, 'offsite',
   ARRAY['bar', 'lounge seating'], false,
   'Offsite evening venue'),

  ('Avanti', 'avanti', NULL, 'offsite',
   ARRAY['food hall', 'multiple spaces'], false,
   'Offsite venue');

-- =============================================================================
-- TRACKS
-- =============================================================================
INSERT INTO tracks (name, slug, color, lead_name, is_active) VALUES
  ('Privacy', 'privacy', '#6366f1', 'Chair / Nuke', true),
  ('Creativity', 'creativity', '#ec4899', 'Rene', true),
  ('Public Goods Funding', 'pgf', '#10b981', 'Sejal Rekhan', true),
  ('Ethereum Localism', 'eth-localism', '#f59e0b', 'Benjamin / Sara', true),
  ('d/acc', 'dacc', '#8b5cf6', 'Owocki', true),
  ('DeSci', 'desci', '#06b6d4', 'Rodrigo', true),
  ('DAO & Coordinative Tooling', 'dao-tooling', '#f97316', 'Timothy', true),
  ('AI & Society', 'ai-society', '#14b8a6', 'Deepa', true),
  ('Onchain Organizations', 'onchain-orgs', '#84cc16', 'Graham Novak', true);

-- =============================================================================
-- TIME SLOTS - FRIDAY (February 13, 2026)
-- =============================================================================

-- E-Town Friday (10:00 - 18:00)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 10:00:00-07', '2026-02-13 10:30:00-07', 'Check-in', 'checkin', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 10:30:00-07', '2026-02-13 11:00:00-07', 'Opening & Welcome', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 11:05:00-07', '2026-02-13 11:30:00-07', 'Morning Session 1', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 11:35:00-07', '2026-02-13 12:00:00-07', 'Morning Session 2', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 12:05:00-07', '2026-02-13 12:30:00-07', 'Morning Session 3', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 12:30:00-07', '2026-02-13 13:20:00-07', 'Lunch Break', 'break', true
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 13:30:00-07', '2026-02-13 13:55:00-07', 'Afternoon Session 1', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 14:00:00-07', '2026-02-13 14:25:00-07', 'Afternoon Session 2', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 14:30:00-07', '2026-02-13 14:55:00-07', 'Afternoon Session 3', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 15:00:00-07', '2026-02-13 15:25:00-07', 'Afternoon Session 4', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 15:30:00-07', '2026-02-13 15:55:00-07', 'Afternoon Session 5', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 16:00:00-07', '2026-02-13 16:25:00-07', 'ETH Localism', 'track', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 16:30:00-07', '2026-02-13 17:00:00-07', 'Creative Track - Ethereal Sound Voyage', 'session', false
FROM venues v WHERE v.slug = 'etown';

-- Regen Hub Friday (11:15 - 16:30)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 11:15:00-07', '2026-02-13 11:45:00-07', 'Session 1', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 11:50:00-07', '2026-02-13 12:20:00-07', 'AI Track', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 12:25:00-07', '2026-02-13 12:55:00-07', 'AI Track', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 13:00:00-07', '2026-02-13 13:55:00-07', 'Hackathon Hold', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 14:00:00-07', '2026-02-13 14:40:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 14:45:00-07', '2026-02-13 15:15:00-07', 'Session', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 15:20:00-07', '2026-02-13 15:50:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 15:55:00-07', '2026-02-13 16:25:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'regen-hub';

-- Terrible Turtle Friday (10:00 - 16:30)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 10:30:00-07', '2026-02-13 11:10:00-07', 'Creative Track - Kickoff', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 11:15:00-07', '2026-02-13 11:45:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 11:50:00-07', '2026-02-13 12:20:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 12:25:00-07', '2026-02-13 12:35:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 12:35:00-07', '2026-02-13 13:35:00-07', 'Break', 'break', true
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 13:35:00-07', '2026-02-13 13:55:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 14:00:00-07', '2026-02-13 14:40:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 14:45:00-07', '2026-02-13 15:15:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 15:20:00-07', '2026-02-13 15:50:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 15:55:00-07', '2026-02-13 16:25:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';

-- =============================================================================
-- TIME SLOTS - SATURDAY (February 14, 2026)
-- =============================================================================

-- E-Town Saturday (9:30 - 15:00)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 09:30:00-07', '2026-02-14 10:00:00-07', 'Check-in', 'checkin', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 10:00:00-07', '2026-02-14 10:25:00-07', 'Morning Session 1', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 10:30:00-07', '2026-02-14 10:55:00-07', 'Morning Session 2', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:00:00-07', '2026-02-14 11:30:00-07', 'DeSci Panel', 'track', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:35:00-07', '2026-02-14 12:00:00-07', 'Morning Session 3', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:05:00-07', '2026-02-14 12:30:00-07', 'Morning Session 4', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:30:00-07', '2026-02-14 13:20:00-07', 'Lunch Break', 'break', true
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 13:30:00-07', '2026-02-14 13:55:00-07', 'Afternoon Session 1', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:00:00-07', '2026-02-14 14:25:00-07', 'Afternoon Session 2', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:30:00-07', '2026-02-14 14:50:00-07', 'Afternoon Session 3', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:00:00-07', '2026-02-14 18:00:00-07', 'Tie-Dye Happy Hour - Barker Park', 'break', true
FROM venues v WHERE v.slug = 'etown';

-- Regen Hub Saturday (11:00 - 16:30)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:15:00-07', '2026-02-14 12:15:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:20:00-07', '2026-02-14 13:05:00-07', 'DAO & Coordinative Tooling', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 13:10:00-07', '2026-02-14 14:05:00-07', 'DAO & Coordinative Tooling', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:10:00-07', '2026-02-14 14:40:00-07', 'ETH Localism', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:45:00-07', '2026-02-14 15:15:00-07', 'ETH Localism', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:20:00-07', '2026-02-14 15:50:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:55:00-07', '2026-02-14 16:25:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'regen-hub';

-- Terrible Turtle Saturday (11:00 - 16:30)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:15:00-07', '2026-02-14 11:45:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:50:00-07', '2026-02-14 12:20:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:25:00-07', '2026-02-14 12:35:00-07', 'Session', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:35:00-07', '2026-02-14 13:35:00-07', 'Break', 'break', true
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 13:35:00-07', '2026-02-14 14:05:00-07', 'DeSci Workshop', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:10:00-07', '2026-02-14 14:40:00-07', 'Onchain Organizations', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:45:00-07', '2026-02-14 15:15:00-07', 'Onchain Organizations', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:20:00-07', '2026-02-14 15:50:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:55:00-07', '2026-02-14 16:25:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';

-- =============================================================================
-- TIME SLOTS - SUNDAY (February 15, 2026)
-- =============================================================================

-- E-Town Sunday (10:00 - 18:00)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 10:25:00-07', '2026-02-15 10:35:00-07', 'Welcome', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 10:35:00-07', '2026-02-15 11:00:00-07', 'Morning Session 1', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:05:00-07', '2026-02-15 11:30:00-07', 'Morning Session 2', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:35:00-07', '2026-02-15 12:15:00-07', 'Morning Session 3', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 12:20:00-07', '2026-02-15 12:55:00-07', 'Morning Session 4', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 12:55:00-07', '2026-02-15 13:55:00-07', 'Lunch Break', 'break', true
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 14:00:00-07', '2026-02-15 14:50:00-07', 'Afternoon Session 1', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 14:55:00-07', '2026-02-15 15:25:00-07', 'Fireside Chat', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 15:30:00-07', '2026-02-15 16:00:00-07', 'Afternoon Session 2', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 16:05:00-07', '2026-02-15 16:30:00-07', 'PGF Track', 'track', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 16:35:00-07', '2026-02-15 17:35:00-07', 'Closing Ceremony', 'session', false
FROM venues v WHERE v.slug = 'etown';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 17:00:00-07', '2026-02-15 18:30:00-07', 'Happy Hour', 'break', true
FROM venues v WHERE v.slug = 'etown';

-- Regen Hub Sunday (11:00 - 16:30)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:15:00-07', '2026-02-15 11:45:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:50:00-07', '2026-02-15 12:20:00-07', 'Unconference / Privacy', 'unconference', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 12:25:00-07', '2026-02-15 13:05:00-07', 'Privacy Track Workshop', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 13:10:00-07', '2026-02-15 14:05:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 14:10:00-07', '2026-02-15 15:05:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 15:10:00-07', '2026-02-15 15:50:00-07', 'Privacy Track Workshop', 'track', false
FROM venues v WHERE v.slug = 'regen-hub';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 15:55:00-07', '2026-02-15 16:25:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'regen-hub';

-- Terrible Turtle Sunday (11:00 - 16:30)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:15:00-07', '2026-02-15 11:45:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:50:00-07', '2026-02-15 12:20:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 12:25:00-07', '2026-02-15 12:35:00-07', 'Workshop Slot', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 12:35:00-07', '2026-02-15 13:00:00-07', 'Break', 'break', true
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 13:00:00-07', '2026-02-15 14:05:00-07', 'PGF Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 14:10:00-07', '2026-02-15 14:40:00-07', 'PGF Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 14:45:00-07', '2026-02-15 15:15:00-07', 'PGF Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 15:20:00-07', '2026-02-15 15:50:00-07', 'Creative Track', 'track', false
FROM venues v WHERE v.slug = 'terrible-turtle';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 15:55:00-07', '2026-02-15 16:25:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'terrible-turtle';
