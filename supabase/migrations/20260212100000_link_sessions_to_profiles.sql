-- Link Sessions to Real User Profiles
-- Based on actual profiles in the database as of 2026-02-12

-- =============================================================================
-- KEVIN OWOCKI (profile: owocki)
-- Profile ID: e55e15c3-f83e-41eb-a224-224bcdd245b1
-- =============================================================================

UPDATE sessions
SET host_id = 'e55e15c3-f83e-41eb-a224-224bcdd245b1'
WHERE host_id IS NULL
  AND host_name = 'Kevin Owocki';

-- =============================================================================
-- LYNDA ARNOLD
-- Profile ID: 892890b0-dd6a-4635-9009-d4f4bf9563b6
-- =============================================================================

UPDATE sessions
SET host_id = '892890b0-dd6a-4635-9009-d4f4bf9563b6'
WHERE host_id IS NULL
  AND host_name = 'Lynda Arnold';

-- =============================================================================
-- JON BO
-- Profile ID: 7ec5f143-7d5c-4a29-993c-71ce22ab2b9c
-- =============================================================================

UPDATE sessions
SET host_id = '7ec5f143-7d5c-4a29-993c-71ce22ab2b9c'
WHERE host_id IS NULL
  AND host_name = 'Jon Bo';

-- =============================================================================
-- RENE PINNELL
-- Profile ID: f32093df-57ce-4154-b52f-06b999c60240
-- =============================================================================

UPDATE sessions
SET host_id = 'f32093df-57ce-4154-b52f-06b999c60240'
WHERE host_id IS NULL
  AND host_name = 'Rene Pinnell';

-- =============================================================================
-- ANDY GUZMAN (profile: Andy, andy@ethereum.org)
-- Profile ID: 818a7b2c-79a5-4b44-b0b5-209b16e3e311
-- =============================================================================

UPDATE sessions
SET host_id = '818a7b2c-79a5-4b44-b0b5-209b16e3e311'
WHERE host_id IS NULL
  AND host_name = 'Andy Guzman';

-- =============================================================================
-- BENJAMIN LIFE (for ETH Localism sessions)
-- Profile ID: 1ffb7fce-4f16-467d-9839-91f02daeed59
-- =============================================================================

UPDATE sessions
SET host_id = '1ffb7fce-4f16-467d-9839-91f02daeed59'
WHERE host_id IS NULL
  AND (host_name = 'Benjamin & Sara' OR host_name = 'Sara & Benjamin');

-- =============================================================================
-- COLTON (Postquant Labs - colton@postquant.xyz)
-- Profile ID: 2bc8b4f4-4c5c-4e6e-91cb-ea56db93095b
-- =============================================================================

UPDATE sessions
SET host_id = '2bc8b4f4-4c5c-4e6e-91cb-ea56db93095b'
WHERE host_id IS NULL
  AND host_name = 'Colton';

-- =============================================================================
-- JANUARY JONES (profile: January, jjonesjourno@gmail.com)
-- Profile ID: cae68c16-900b-4090-b22f-ee2237209d4b
-- Note: Co-hosted with Brad Keoun, assigning to January
-- =============================================================================

UPDATE sessions
SET host_id = 'cae68c16-900b-4090-b22f-ee2237209d4b'
WHERE host_id IS NULL
  AND host_name LIKE '%January Jones%';

-- =============================================================================
-- JOSHUA (DeSci World - joshua@desci.world)
-- Profile ID: 76fc0bd9-7712-4bfa-bd08-1589bb2da5a4
-- =============================================================================

UPDATE sessions
SET host_id = '76fc0bd9-7712-4bfa-bd08-1589bb2da5a4'
WHERE host_id IS NULL
  AND host_name LIKE '%Joshua Bate%';
