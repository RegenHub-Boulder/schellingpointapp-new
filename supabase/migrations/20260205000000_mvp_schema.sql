-- Schelling Point MVP Schema
-- Simple, focused schema for proposals, voting, favorites, and scheduling

-- Drop existing tables if they exist (for clean reset)
DROP TABLE IF EXISTS favorites CASCADE;
DROP TABLE IF EXISTS votes CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS time_slots CASCADE;
DROP TABLE IF EXISTS venues CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- =============================================================================
-- PROFILES (extends Supabase auth.users)
-- =============================================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  affiliation TEXT,
  building TEXT,
  telegram TEXT,
  interests TEXT[],
  is_admin BOOLEAN DEFAULT FALSE,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  vote_credits INTEGER DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VENUES
-- =============================================================================
CREATE TABLE venues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  capacity INTEGER,
  features TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TIME SLOTS
-- =============================================================================
CREATE TABLE time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  label TEXT,
  is_break BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- SESSIONS (proposals)
-- =============================================================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  format TEXT CHECK (format IN ('talk', 'workshop', 'discussion', 'panel', 'demo')),
  duration INTEGER DEFAULT 60,
  host_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  host_name TEXT,
  topic_tags TEXT[],
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'scheduled')),
  venue_id UUID REFERENCES venues(id) ON DELETE SET NULL,
  time_slot_id UUID REFERENCES time_slots(id) ON DELETE SET NULL,
  is_self_hosted BOOLEAN DEFAULT FALSE,
  custom_location TEXT,
  total_votes INTEGER DEFAULT 0,
  total_credits INTEGER DEFAULT 0,
  voter_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- VOTES
-- =============================================================================
CREATE TABLE votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  credits_spent INTEGER NOT NULL CHECK (credits_spent > 0),
  vote_count INTEGER NOT NULL CHECK (vote_count > 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- =============================================================================
-- FAVORITES
-- =============================================================================
CREATE TABLE favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, session_id)
);

-- =============================================================================
-- INDEXES
-- =============================================================================
CREATE INDEX idx_sessions_status ON sessions(status);
CREATE INDEX idx_sessions_total_votes ON sessions(total_votes DESC);
CREATE INDEX idx_votes_user ON votes(user_id);
CREATE INDEX idx_votes_session ON votes(session_id);
CREATE INDEX idx_favorites_user ON favorites(user_id);

-- =============================================================================
-- FUNCTIONS
-- =============================================================================

-- Auto-create profile on user signup
-- Note: Explicit schema references (public.) are required for triggers on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update session vote counts when votes change
CREATE OR REPLACE FUNCTION update_session_vote_counts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE sessions SET
      total_votes = COALESCE((SELECT SUM(vote_count) FROM votes WHERE session_id = OLD.session_id), 0),
      total_credits = COALESCE((SELECT SUM(credits_spent) FROM votes WHERE session_id = OLD.session_id), 0),
      voter_count = COALESCE((SELECT COUNT(*) FROM votes WHERE session_id = OLD.session_id), 0),
      updated_at = NOW()
    WHERE id = OLD.session_id;
    RETURN OLD;
  ELSE
    UPDATE sessions SET
      total_votes = COALESCE((SELECT SUM(vote_count) FROM votes WHERE session_id = NEW.session_id), 0),
      total_credits = COALESCE((SELECT SUM(credits_spent) FROM votes WHERE session_id = NEW.session_id), 0),
      voter_count = COALESCE((SELECT COUNT(*) FROM votes WHERE session_id = NEW.session_id), 0),
      updated_at = NOW()
    WHERE id = NEW.session_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_vote_change ON votes;
CREATE TRIGGER on_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON votes
  FOR EACH ROW EXECUTE FUNCTION update_session_vote_counts();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE venues ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, users can update their own
CREATE POLICY "Profiles viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Venues: everyone can read
CREATE POLICY "Venues viewable by everyone" ON venues FOR SELECT USING (true);
CREATE POLICY "Admins can manage venues" ON venues FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Time slots: everyone can read
CREATE POLICY "Time slots viewable by everyone" ON time_slots FOR SELECT USING (true);
CREATE POLICY "Admins can manage time slots" ON time_slots FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Sessions: everyone can read approved/scheduled, hosts can read their own
CREATE POLICY "Anyone can view approved sessions" ON sessions FOR SELECT
  USING (status IN ('approved', 'scheduled') OR host_id = auth.uid());
CREATE POLICY "Authenticated users can create sessions" ON sessions FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Hosts can update own pending sessions" ON sessions FOR UPDATE
  USING (host_id = auth.uid() AND status = 'pending');
CREATE POLICY "Admins can manage all sessions" ON sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true)
);

-- Votes: users can manage their own votes
CREATE POLICY "Users can view own votes" ON votes FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create votes" ON votes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own votes" ON votes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can delete own votes" ON votes FOR DELETE USING (user_id = auth.uid());

-- Favorites: users can manage their own favorites
CREATE POLICY "Users can view own favorites" ON favorites FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can create favorites" ON favorites FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (user_id = auth.uid());
