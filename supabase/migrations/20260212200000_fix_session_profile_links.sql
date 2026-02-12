-- Fix Session Profile Links
-- Undo incorrect links from previous migration and only link the three confirmed profiles

-- =============================================================================
-- STEP 1: Reset all curated session host_ids to NULL
-- This undoes any incorrect links from the previous migration
-- User-submitted sessions (session_type != 'curated') are not touched
-- =============================================================================

UPDATE sessions
SET host_id = NULL
WHERE session_type = 'curated'
  AND host_id IS NOT NULL;

-- =============================================================================
-- STEP 2: Link only the three confirmed profiles
-- =============================================================================

-- KEVIN OWOCKI → owocki (kevin@allo.capital)
UPDATE sessions
SET host_id = 'e55e15c3-f83e-41eb-a224-224bcdd245b1'
WHERE host_name = 'Kevin Owocki'
  AND session_type = 'curated';

-- JON BO → Jon Bo (jborichevskiy@gmail.com)
UPDATE sessions
SET host_id = '7ec5f143-7d5c-4a29-993c-71ce22ab2b9c'
WHERE host_name = 'Jon Bo'
  AND session_type = 'curated';

-- RENE PINNELL → Rene Pinnell (rene@artizen.fund)
UPDATE sessions
SET host_id = 'f32093df-57ce-4154-b52f-06b999c60240'
WHERE host_name = 'Rene Pinnell'
  AND session_type = 'curated';
