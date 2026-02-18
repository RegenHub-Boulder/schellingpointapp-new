-- Add nullable event_id columns to all tables
-- They will be backfilled and made NOT NULL in the next migration

-- Sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Votes
ALTER TABLE votes ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Venues
ALTER TABLE venues ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Time slots
ALTER TABLE time_slots ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Tracks (also add the enhanced columns from strategy)
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS lead_user_id UUID REFERENCES profiles(id);
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS max_sessions INTEGER;
ALTER TABLE tracks ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Favorites
ALTER TABLE favorites ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Session cohosts
ALTER TABLE session_cohosts ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);

-- Cohost invites
ALTER TABLE cohost_invites ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id);
