-- Create events table (core tenant entity)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT,
  description TEXT,

  -- Dates & Location
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'America/Denver',
  location_name TEXT,
  location_address TEXT,
  location_geo POINT,

  -- Lifecycle
  status TEXT DEFAULT 'draft' CHECK (status IN (
    'draft', 'published', 'voting', 'scheduling', 'live', 'completed', 'archived'
  )),

  -- Voting Configuration
  vote_credits_per_user INTEGER DEFAULT 100,
  voting_opens_at TIMESTAMPTZ,
  voting_closes_at TIMESTAMPTZ,
  proposals_open_at TIMESTAMPTZ,
  proposals_close_at TIMESTAMPTZ,

  -- Proposal Configuration
  allowed_formats TEXT[] DEFAULT ARRAY['talk','workshop','discussion','panel','demo'],
  allowed_durations INTEGER[] DEFAULT ARRAY[15,30,60,90],
  max_proposals_per_user INTEGER DEFAULT 5,
  require_proposal_approval BOOLEAN DEFAULT TRUE,

  -- Capacity
  max_attendees INTEGER,

  -- Branding
  theme JSONB DEFAULT '{}',
  logo_url TEXT,
  banner_url TEXT,
  favicon_url TEXT,

  -- Owner
  created_by UUID REFERENCES profiles(id),

  -- Metadata
  is_featured BOOLEAN DEFAULT FALSE,
  visibility TEXT DEFAULT 'public' CHECK (visibility IN ('public','unlisted','private')),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_events_slug ON events(slug);
CREATE INDEX idx_events_status ON events(status);

-- RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anyone can view public/unlisted events
CREATE POLICY "Anyone can view public events" ON events FOR SELECT
  USING (visibility IN ('public', 'unlisted'));

-- Event creation requires authentication
CREATE POLICY "Authenticated users can create events" ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Seed EthBoulder 2026 event
INSERT INTO events (
  slug, name, tagline, description,
  start_date, end_date, timezone,
  location_name,
  status, vote_credits_per_user,
  allowed_formats, allowed_durations,
  max_proposals_per_user, require_proposal_approval
) VALUES (
  'ethboulder-2026',
  'EthBoulder 2026',
  'Fork The Frontier',
  'An unconference for Ethereum builders in Boulder, Colorado',
  '2026-02-27',
  '2026-03-01',
  'America/Denver',
  'Boulder, CO',
  'completed',
  100,
  ARRAY['talk','workshop','discussion','panel','demo'],
  ARRAY[15,30,60,90],
  5,
  TRUE
);
