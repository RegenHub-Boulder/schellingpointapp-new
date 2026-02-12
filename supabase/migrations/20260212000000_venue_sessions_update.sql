-- EthBoulder Venue Sessions Update
-- Adds sessions for Regen Hub and Terrible Turtle venues
-- Updates some E-Town sessions based on latest programming spreadsheet
-- Event dates: February 13-15, 2026 (Friday, Saturday, Sunday)

-- =============================================================================
-- UPDATE E-TOWN SESSIONS (Based on latest spreadsheet updates)
-- =============================================================================

-- Update Friday 3:00-3:25: Change Danny Ryan to fireside chat with Owocki
UPDATE sessions
SET title = 'Fireside Chat: Danny Ryan & Kevin Owocki',
    description = 'A fireside conversation about Etheralize and bringing Ethereum to traditional finance.',
    format = 'fireside',
    host_name = 'Danny Ryan & Kevin Owocki'
WHERE host_name = 'Danny Ryan'
  AND title LIKE '%Etheralize%';

-- Update Friday 4:00-4:25: ETH Localism fireside
UPDATE sessions
SET title = 'ETH Localism Fireside Chat',
    description = 'A fireside conversation exploring Ethereum Localism - building local communities and real-world impact through blockchain technology.',
    format = 'fireside',
    host_name = 'Sara & Benjamin'
WHERE title LIKE '%ETH Localism Track%';

-- Update Saturday 2:30-2:50: Add James Collab.land (new time slot needed)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:30:00-07', '2026-02-14 14:50:00-07', 'James Collab.land', 'session', false
FROM venues v WHERE v.slug = 'etown'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Note: Eugene's session gets moved - update it
UPDATE sessions
SET title = 'Coordination Is Intelligence',
    description = 'The hardest problem in crypto isn''t scaling transactions, but scaling coordination without losing culture. Communities already exhibit emergent intelligence, long before AI agents existed. This talk examines how AI and tokenized systems make collective intelligence coherent and executable.',
    host_name = 'James',
    topic_tags = ARRAY['coordination', 'collab.land', 'ai', 'community']
WHERE host_name = 'Eugene'
  AND venue_id = (SELECT id FROM venues WHERE slug = 'etown' LIMIT 1)
  AND time_slot_id = (SELECT id FROM time_slots WHERE start_time = '2026-02-14 14:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown' LIMIT 1) LIMIT 1);

-- =============================================================================
-- ADD MISSING TIME SLOTS FOR REGEN HUB
-- =============================================================================

-- Friday Regen Hub - Update times to match spreadsheet
UPDATE time_slots SET start_time = '2026-02-13 13:00:00-07', end_time = '2026-02-13 13:25:00-07', label = 'AI Track - Devinder Sodhi'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 13:00:00-07';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 13:30:00-07', '2026-02-13 13:55:00-07', 'Parnassus House', 'session', false
FROM venues v WHERE v.slug = 'regen-hub'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Saturday Regen Hub - Add Nico Gallardo slot
UPDATE time_slots SET label = 'Nico Gallardo - Octant'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-14 14:10:00-07';

-- Add January Jones slot
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:45:00-07', '2026-02-14 15:50:00-07', 'Blockchain Journalism Roundtable', 'session', false
FROM venues v WHERE v.slug = 'regen-hub'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Sunday Regen Hub - Add Zcash workshop slot
UPDATE time_slots SET start_time = '2026-02-15 12:05:00-07', end_time = '2026-02-15 13:05:00-07', label = 'Mylo - Zcash Workshop'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-15 12:25:00-07';

-- =============================================================================
-- REGEN HUB SESSIONS - FRIDAY
-- =============================================================================

-- 11:15-11:45: SHAY - Techstars Boulder
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Techstars Boulder: Building the Future',
  'Shay from Techstars Boulder discusses the startup ecosystem and how Web3 founders can leverage accelerator programs.',
  'talk',
  30,
  NULL,
  'Shay',
  ARRAY['techstars', 'startups', 'boulder', 'accelerator'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 11:15:00-07'
LIMIT 1;

-- 11:50-12:55: AI Track Sessions
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'AI & Society Track Session 1',
  'First session of the AI & Society track exploring the intersection of artificial intelligence and social systems.',
  'talk',
  30,
  NULL,
  'AI Track',
  ARRAY['ai', 'society', 'technology'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 11:50:00-07'
  AND t.slug = 'ai-society'
LIMIT 1;

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'AI & Society Track Session 2',
  'Second session of the AI & Society track continuing the exploration of AI''s impact on community and governance.',
  'talk',
  30,
  NULL,
  'AI Track',
  ARRAY['ai', 'society', 'governance'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 12:25:00-07'
  AND t.slug = 'ai-society'
LIMIT 1;

-- 13:00-13:25: Devinder Sodhi - AI Success in the Real World
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'AI Success in the Real World',
  'Devinder Sodhi shares insights on practical AI applications and achieving success with AI implementations in real-world scenarios.',
  'talk',
  25,
  NULL,
  'Devinder Sodhi',
  ARRAY['ai', 'success', 'real-world', 'implementation'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 13:00:00-07'
  AND t.slug = 'ai-society'
LIMIT 1;

-- 13:30-13:55: Paul and Nico - Parnassus House
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Parnassus House',
  'Paul and Nico present Parnassus House and their vision for creative collaboration in Web3.',
  'talk',
  25,
  NULL,
  'Paul & Nico',
  ARRAY['parnassus', 'creativity', 'collaboration'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 13:30:00-07'
LIMIT 1;

-- 14:00-14:40: Austin Griffith Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Austin Griffith Workshop',
  'Hands-on workshop with Austin Griffith, creator of Scaffold-ETH and BuidlGuidl. Learn practical Ethereum development techniques.',
  'workshop',
  40,
  NULL,
  'Austin Griffith',
  ARRAY['scaffold-eth', 'development', 'buidlguidl', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 14:00:00-07'
LIMIT 1;

-- 14:45-15:15: Jon Bo
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Jon Bo Session',
  'Jon Bo shares insights on building in the Ethereum ecosystem.',
  'talk',
  30,
  NULL,
  'Jon Bo',
  ARRAY['ethereum', 'building', 'community'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 14:45:00-07'
LIMIT 1;

-- 15:20-15:50: German - Virtual Blockchains Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Virtual Blockchains: The Future of Ethereum',
  'German leads a workshop exploring virtual blockchains and their role in Ethereum''s future scaling solutions.',
  'workshop',
  30,
  NULL,
  'German',
  ARRAY['virtual-blockchains', 'ethereum', 'scaling', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-13 15:20:00-07'
LIMIT 1;

-- =============================================================================
-- REGEN HUB SESSIONS - SATURDAY
-- =============================================================================

-- 11:15-12:15: Owocki Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Kevin Owocki Workshop',
  'An interactive workshop with Kevin Owocki exploring topics at the intersection of public goods, coordination, and Web3.',
  'workshop',
  60,
  NULL,
  'Kevin Owocki',
  ARRAY['public-goods', 'coordination', 'gitcoin', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-14 11:15:00-07'
LIMIT 1;

-- 12:05-14:05: DAO Tooling Track Sessions
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'DAO Tooling Track Session 1',
  'First session of the DAO Tooling track exploring coordination tools and governance infrastructure for DAOs.',
  'talk',
  45,
  NULL,
  'DAO Tooling Track',
  ARRAY['dao', 'tooling', 'coordination', 'governance'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-14 12:20:00-07'
  AND t.slug = 'dao-tooling'
LIMIT 1;

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'DAO Tooling Track Session 2',
  'Second session of the DAO Tooling track continuing the exploration of coordination and governance tools.',
  'talk',
  55,
  NULL,
  'DAO Tooling Track',
  ARRAY['dao', 'tooling', 'coordination'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-14 13:10:00-07'
  AND t.slug = 'dao-tooling'
LIMIT 1;

-- 14:10-14:40: Nico Gallardo - Octant
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Octant: Funding Impact Sustainably with DeFi',
  'Nico Gallardo from Octant presents how DeFi mechanisms can be used to sustainably fund public goods and impact projects.',
  'talk',
  30,
  NULL,
  'Nico Gallardo',
  ARRAY['octant', 'defi', 'public-goods', 'sustainability'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-14 14:10:00-07'
  AND t.slug = 'pgf'
LIMIT 1;

-- 14:45-15:50: January Jones & Brad Keoun - Blockchain Journalism Roundtable
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Blockchain Building for Journalism: Developer & Journo Roundtable',
  'January Jones and Brad Keoun lead a roundtable discussion bringing together developers and journalists to explore blockchain applications in media and journalism.',
  'discussion',
  65,
  NULL,
  'January Jones & Brad Keoun',
  ARRAY['journalism', 'media', 'blockchain', 'roundtable'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-14 14:45:00-07'
LIMIT 1;

-- =============================================================================
-- REGEN HUB SESSIONS - SUNDAY
-- =============================================================================

-- 12:05-13:05: Mylo - Zcash Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Zcash Privacy Workshop',
  'Mylo leads an interactive workshop on Zcash privacy technology and its applications in the broader crypto ecosystem.',
  'workshop',
  60,
  NULL,
  'Mylo',
  ARRAY['zcash', 'privacy', 'workshop', 'cryptocurrency'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-15 12:05:00-07'
  AND t.slug = 'privacy'
LIMIT 1;

-- 13:10-14:05: Alexandre - Fhenix Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Fhenix: FHE in Practice Workshop',
  'Alexandre, Ecosystem Engineer at Fhenix, leads a hands-on workshop on building with Fully Homomorphic Encryption on Ethereum.',
  'workshop',
  55,
  NULL,
  'Alexandre',
  ARRAY['fhenix', 'fhe', 'privacy', 'workshop', 'encryption'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-15 13:10:00-07'
  AND t.slug = 'privacy'
LIMIT 1;

-- 15:10-15:50: Naomi Brockwell Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Naomi Brockwell Privacy Workshop',
  'Naomi Brockwell leads an interactive workshop on practical privacy tools and techniques for reclaiming your digital autonomy.',
  'workshop',
  40,
  NULL,
  'Naomi Brockwell',
  ARRAY['privacy', 'workshop', 'tools', 'autonomy'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-15 15:10:00-07'
  AND t.slug = 'privacy'
LIMIT 1;

-- 15:55-16:25: Eric DeCourcy - OpenZeppelin Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'OpenZeppelin Security Workshop',
  'Eric DeCourcy from OpenZeppelin leads a workshop on smart contract security best practices and using OpenZeppelin tools.',
  'workshop',
  30,
  NULL,
  'Eric DeCourcy',
  ARRAY['openzeppelin', 'security', 'smart-contracts', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'regen-hub'
  AND ts.start_time = '2026-02-15 15:55:00-07'
LIMIT 1;

-- =============================================================================
-- TERRIBLE TURTLE SESSIONS - FRIDAY (Main Room)
-- =============================================================================

-- 10:30-11:10: Creative Track Kickoff
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Creative Track Kickoff',
  'Opening session of the Creativity Track, setting the stage for three days of artistic exploration and creative expression at EthBoulder.',
  'talk',
  40,
  NULL,
  'Creative Track',
  ARRAY['creativity', 'art', 'welcome'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 10:30:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- 11:15-11:45: Collaborative Mural Kickoff
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Collaborative Mural Kickoff',
  'Join us to kick off the collaborative mural project! This ongoing installation will evolve throughout EthBoulder as participants contribute.',
  'workshop',
  30,
  NULL,
  'Creative Track',
  ARRAY['creativity', 'mural', 'collaborative', 'art'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 11:15:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- 11:50-12:20: OnchainCreator Challenge
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'OnchainCreator Challenge',
  'An interactive challenge exploring onchain creativity and digital art creation in the Web3 space.',
  'workshop',
  30,
  NULL,
  'Creative Track',
  ARRAY['creativity', 'onchain', 'challenge', 'art'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 11:50:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- Add 12:30-13:00 time slot for Faces of EthBoulder
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-13', '2026-02-13 12:30:00-07', '2026-02-13 13:00:00-07', 'Faces of EthBoulder', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 12:30-13:00: Faces of EthBoulder
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Faces of EthBoulder',
  'A photographic journey capturing the diverse faces and stories of EthBoulder participants.',
  'talk',
  30,
  NULL,
  'Creative Track',
  ARRAY['creativity', 'photography', 'community', 'portraits'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 12:30:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- 14:00-14:40: Gitcoin GG25 Design Session
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Gitcoin GG25 Design Session',
  'Interactive design session exploring the future of Gitcoin Grants Round 25 and community funding mechanisms.',
  'workshop',
  40,
  NULL,
  'Gitcoin',
  ARRAY['gitcoin', 'gg25', 'design', 'public-goods'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 14:00:00-07'
  AND t.slug = 'pgf'
LIMIT 1;

-- 15:20-15:50: Under The Gun
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Under The Gun',
  'An intense creative session exploring pressure, deadlines, and artistic expression under constraints.',
  'workshop',
  30,
  NULL,
  'Creative Track',
  ARRAY['creativity', 'pressure', 'art', 'expression'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 15:20:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- =============================================================================
-- TERRIBLE TURTLE SESSIONS - SATURDAY (Main Room)
-- =============================================================================

-- 12:05-12:35: COLTON Postquant Labs
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Postquant Labs: Post-Quantum Cryptography',
  'Colton from Postquant Labs presents on post-quantum cryptography and its implications for blockchain security.',
  'talk',
  30,
  NULL,
  'Colton',
  ARRAY['post-quantum', 'cryptography', 'security', 'postquant'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-14 12:25:00-07'
LIMIT 1;

-- 13:35-14:05: DeSci Workshop - Rodrigo
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'DeSci Workshop',
  'Rodrigo leads an interactive workshop exploring Decentralized Science applications and community-driven research.',
  'workshop',
  30,
  NULL,
  'Rodrigo',
  ARRAY['desci', 'science', 'research', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-14 13:35:00-07'
  AND t.slug = 'desci'
LIMIT 1;

-- 14:10-14:40: On-chain Organizations Track Session 1
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Onchain Organizations Track Session 1',
  'First session of the Onchain Organizations track exploring DAOs, governance, and organizational structures on the blockchain.',
  'talk',
  30,
  NULL,
  'Onchain Organizations Track',
  ARRAY['dao', 'governance', 'organizations', 'onchain'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-14 14:10:00-07'
  AND t.slug = 'onchain-orgs'
LIMIT 1;

-- 14:45-15:15: On-chain Organizations Track Session 2
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Onchain Organizations Track Session 2',
  'Second session of the Onchain Organizations track continuing the exploration of blockchain-based organizational structures.',
  'talk',
  30,
  NULL,
  'Onchain Organizations Track',
  ARRAY['dao', 'governance', 'organizations'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-14 14:45:00-07'
  AND t.slug = 'onchain-orgs'
LIMIT 1;

-- =============================================================================
-- TERRIBLE TURTLE SESSIONS - SUNDAY (Main Room)
-- =============================================================================

-- Add 12:05-12:35 time slot for BLOCKCHANGE
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 12:05:00-07', '2026-02-15 12:35:00-07', 'BLOCKCHANGE Workshop', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle'
LIMIT 1
ON CONFLICT DO NOTHING;

-- 12:05-12:35: BLOCKCHANGE Workshop
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'BLOCKCHANGE Workshop',
  'Interactive workshop exploring blockchain-based social change initiatives and community impact.',
  'workshop',
  30,
  NULL,
  'BLOCKCHANGE',
  ARRAY['blockchain', 'social-change', 'impact', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-15 12:05:00-07'
LIMIT 1;

-- 13:00-15:15: PGF - Sejal and team (Update existing time slot)
UPDATE time_slots SET end_time = '2026-02-15 15:15:00-07', label = 'PGF Track - Sejal & Team'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-15 13:00:00-07';

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Public Goods Funding Track: Deep Dive',
  'Sejal and the PGF team lead an extended session exploring innovative mechanisms for funding public goods in the Ethereum ecosystem.',
  'workshop',
  135,
  NULL,
  'Sejal & Team',
  ARRAY['public-goods', 'funding', 'pgf', 'workshop'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-15 13:00:00-07'
  AND t.slug = 'pgf'
LIMIT 1;

-- 15:20-15:50: Creating your Ultimate Fighting Bot
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Creating your Ultimate Fighting Bot',
  'A creative technical session exploring bot creation, AI agents, and gamification in the Web3 space.',
  'workshop',
  30,
  NULL,
  'Creative Track',
  ARRAY['creativity', 'bots', 'ai', 'gaming'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-15 15:20:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- =============================================================================
-- TERRIBLE TURTLE LOUNGE ROOM SESSIONS
-- =============================================================================

-- Friday: Creativity as Cornerstone by Devinder Sodhi & Lexi Benak
-- Note: Using the existing 15:20 slot which may have duplicate purposes
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Creativity as a Cornerstone of Company Building',
  'Devinder Sodhi and Lexi Benak explore how creativity serves as a foundation for successful company building and innovation.',
  'talk',
  30,
  NULL,
  'Devinder Sodhi & Lexi Benak',
  ARRAY['creativity', 'entrepreneurship', 'innovation', 'company-building'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-13 15:20:00-07'
  AND t.slug = 'creativity'
  AND NOT EXISTS (
    SELECT 1 FROM sessions s WHERE s.title = 'Creativity as a Cornerstone of Company Building'
  )
LIMIT 1;

-- Saturday Lounge: Zen Tea Ceremony by Yi Shan
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:30:00-07', '2026-02-14 12:45:00-07', 'Zen Tea Ceremony - Yi Shan', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Drink TEE: Zen Tea Ceremony for a Trusted Execution Environment',
  'Yi Shan hosts an immersive Zen Tea Ceremony blending mindfulness, technology metaphors, and the art of tea.',
  'workshop',
  75,
  NULL,
  'Yi Shan',
  ARRAY['creativity', 'tea', 'zen', 'mindfulness', 'tee'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-14 11:30:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- Sunday Lounge: Artizen Awards Livestream
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-15', '2026-02-15 11:00:00-07', '2026-02-15 12:30:00-07', 'Artizen Awards Livestream', 'session', false
FROM venues v WHERE v.slug = 'terrible-turtle'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Artizen Awards $50,000 at Showcase #60 (Livestream)',
  'Watch the livestream of Artizen''s Showcase #60 where $50,000 is awarded to groundbreaking creative projects.',
  'talk',
  90,
  NULL,
  'Artizen',
  ARRAY['creativity', 'artizen', 'awards', 'funding', 'livestream'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'terrible-turtle'
  AND ts.start_time = '2026-02-15 11:00:00-07'
  AND t.slug = 'creativity'
LIMIT 1;

-- =============================================================================
-- RIVERSIDE VENUE - ETH LOCALISM
-- =============================================================================

-- Add Saturday Riverside time slot for ETH Localism
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 13:00:00-07', '2026-02-14 17:00:00-07', 'ETH Localism Sessions', 'track', false
FROM venues v WHERE v.slug = 'riverside'
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'ETH Localism: Building Local Communities',
  'An afternoon dedicated to Ethereum Localism - exploring how blockchain technology can strengthen local communities and create real-world impact.',
  'workshop',
  240,
  NULL,
  'Benjamin & Sara',
  ARRAY['eth-localism', 'community', 'local', 'impact'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v
JOIN time_slots ts ON ts.venue_id = v.id
CROSS JOIN tracks t
WHERE v.slug = 'riverside'
  AND ts.start_time = '2026-02-14 13:00:00-07'
  AND t.slug = 'eth-localism'
LIMIT 1;

-- =============================================================================
-- UPDATE TIME SLOT LABELS TO MATCH NEW SESSIONS
-- =============================================================================

UPDATE time_slots SET label = 'Shay - Techstars Boulder'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 11:15:00-07';

UPDATE time_slots SET label = 'AI Track Session 1'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 11:50:00-07';

UPDATE time_slots SET label = 'AI Track Session 2'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 12:25:00-07';

UPDATE time_slots SET label = 'Austin Griffith Workshop'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 14:00:00-07';

UPDATE time_slots SET label = 'Jon Bo'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 14:45:00-07';

UPDATE time_slots SET label = 'German - Virtual Blockchains Workshop'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-13 15:20:00-07';

UPDATE time_slots SET label = 'Kevin Owocki Workshop'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-14 11:15:00-07';

UPDATE time_slots SET label = 'DAO Tooling Track 1'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-14 12:20:00-07';

UPDATE time_slots SET label = 'DAO Tooling Track 2'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub' LIMIT 1) AND start_time = '2026-02-14 13:10:00-07';

UPDATE time_slots SET label = 'Creative Track Kickoff'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-13 10:30:00-07';

UPDATE time_slots SET label = 'Collaborative Mural'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-13 11:15:00-07';

UPDATE time_slots SET label = 'OnchainCreator Challenge'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-13 11:50:00-07';

UPDATE time_slots SET label = 'Gitcoin GG25 Design Session'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-13 14:00:00-07';

UPDATE time_slots SET label = 'Under The Gun'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-13 15:20:00-07';

UPDATE time_slots SET label = 'COLTON Postquant Labs'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-14 12:25:00-07';

UPDATE time_slots SET label = 'DeSci Workshop - Rodrigo'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-14 13:35:00-07';

UPDATE time_slots SET label = 'Onchain Orgs Session 1'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-14 14:10:00-07';

UPDATE time_slots SET label = 'Onchain Orgs Session 2'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle' LIMIT 1) AND start_time = '2026-02-14 14:45:00-07';
