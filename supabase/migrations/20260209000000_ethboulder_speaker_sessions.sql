-- EthBoulder Speaker Sessions
-- Populates curated sessions from speaker spreadsheet
-- Speaker names shown in host_name, host_id is NULL until profiles are linked
-- Event dates: February 13-15, 2026 (Friday, Saturday, Sunday)

-- =============================================================================
-- CLEAR EXISTING CURATED SESSIONS (preserve user-submitted proposals)
-- =============================================================================
DELETE FROM sessions WHERE session_type = 'curated';

-- =============================================================================
-- FRIDAY SESSIONS (February 13, 2026) - E-Town Main Stage
-- =============================================================================

-- 10:30-11:00 - Opening & Welcome
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Welcome & Event App Intro',
  'Kicking off EthBoulder with an introduction to the event and the Schelling Point app for session proposals and quadratic voting.',
  'talk',
  30,
  NULL,
  'Kevin Owocki',
  ARRAY['welcome', 'introduction'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 10:30:00-07';

-- 11:05-11:30 - Rene Pinnell
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Why Ideas Need to F*ck',
  'René is the co-founder of Artizen, a platform built to fund breakthroughs in art, science, and technology by bringing wildly different kinds of creators into the same ecosystem. For the last twenty years, he''s worked across film, startups, and experimental tech—basically anywhere ideas collide and either die quickly or turn into something dangerous and interesting.

Today, René opens the Creativity Track with a talk about a simple but uncomfortable truth: ideas need sex. New ideas don''t come from staying in your lane or talking only to people who think like you. They come from collision, cross-pollination, and mixing with ideas from totally different intellectual, creative, and spiritual lineages. Most of the baby ideas that result will be weird, broken, or useless. A few will grow up to change the world.',
  'talk',
  25,
  NULL,
  'Rene Pinnell',
  ARRAY['creativity', 'innovation', 'ideas'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 11:05:00-07';

-- 11:35-12:00 - Cody Gunton
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Progress on zkEVM Verifier Specs',
  'Research Engineer on the zkEVM Team at the Ethereum Foundation shares the latest developments on zkEVM verifier specifications.',
  'talk',
  25,
  NULL,
  'Cody Gunton',
  ARRAY['ethereum', 'zkevm', 'research', 'scaling'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 11:35:00-07';

-- 12:05-12:30 - Mathilda
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Gitcoin Grants & Public Goods',
  'A session on Gitcoin''s approach to funding public goods and community-driven development.',
  'talk',
  25,
  NULL,
  'Mathilda',
  ARRAY['gitcoin', 'public-goods', 'grants'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 12:05:00-07';

-- 13:30-13:55 - Alex Stokes
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Ethereum: The Next Chapter',
  'Alex Stokes co-leads the Protocol cluster at the EF, responsible for R&D that helps Ethereum scale securely. He has been contributing to Ethereum for many years, with a focus on the consensus layer, research into MEV, and has been lately thinking about what Ethereum means in the age of AI agents.',
  'talk',
  25,
  NULL,
  'Alex Stokes',
  ARRAY['ethereum', 'protocol', 'future', 'ai-agents'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 13:30:00-07';

-- 14:00-14:25 - Csaba Kiraly
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Ethereum Foundation Research',
  'Insights from the Ethereum Foundation research team.',
  'talk',
  25,
  NULL,
  'Csaba Kiraly',
  ARRAY['ethereum', 'research'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 14:00:00-07';

-- 14:30-14:55 - Nixo
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'ETH Core Protocol Governance',
  'Nixo leads the Protocol Support team at the Ethereum Foundation. Protocol Support creates clarity around Ethereum''s governance process - the process by which features are added to Ethereum. She previously led EthStaker, the organization that helps with guides, resources, and technical support for solo stakers.',
  'talk',
  25,
  NULL,
  'Nixo',
  ARRAY['ethereum', 'governance', 'protocol'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 14:30:00-07';

-- 15:00-15:25 - Danny Ryan
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Etheralize: Bridging Ethereum to Traditional Finance',
  'Exploring how Etheralize is working to bring Ethereum to traditional finance.',
  'talk',
  25,
  NULL,
  'Danny Ryan',
  ARRAY['ethereum', 'tradfi', 'adoption'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 15:00:00-07';

-- 15:30-15:55 - Nathan Schneider
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Who Wants a Protocol Society?',
  'Professor of media studies at the University of Colorado Boulder where he directs the Media Economies Design Lab and teaches students. He is also an author of books on online democracy, cooperative enterprise, the Occupy movement, and God.',
  'talk',
  25,
  NULL,
  'Nathan Schneider',
  ARRAY['governance', 'democracy', 'society', 'protocols'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 15:30:00-07';

-- 16:00-16:25 - ETH Localism Track
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'ETH Localism Track Session',
  'A session exploring Ethereum Localism - building local communities and real-world impact through blockchain technology.',
  'talk',
  25,
  NULL,
  'Eth Boulder',
  ARRAY['eth-localism', 'community', 'local'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 16:00:00-07'
  AND t.slug = 'eth-localism';

-- 16:30-17:00 - Lynda Arnold / Ethereal Sound Voyage
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Ethereal Sound Voyage',
  'Ethereal Sound Voyage is an immersive sound meditation experience designed to bring nervous-system regulation, deep focus, and expanded awareness into the tech and Web3 space.',
  'workshop',
  30,
  NULL,
  'Lynda Arnold',
  ARRAY['creativity', 'wellness', 'meditation', 'sound'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-13 16:30:00-07'
  AND t.slug = 'creativity';

-- =============================================================================
-- SATURDAY SESSIONS (February 14, 2026) - E-Town Main Stage
-- =============================================================================

-- 9:55-10:00 - Saturday Welcome (add time slot first)
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 09:55:00-07', '2026-02-14 10:00:00-07', 'Welcome', 'session', false
FROM venues v WHERE v.slug = 'etown'
ON CONFLICT DO NOTHING;

INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Saturday Welcome',
  'Welcome to day two of EthBoulder.',
  'talk',
  5,
  NULL,
  'Kevin Owocki',
  ARRAY['welcome'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 09:55:00-07';

-- 10:00-10:25 - Shaw (ElizaOS)
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'ElizaOS: Building the Open-Source AI Agent Framework',
  'Shaw Walters is the founder of Eliza Labs, the creators of the ElizaOS agentic open-source framework. With a robust background in artificial intelligence and machine learning, Shaw has championed an open-source and transparent approach that has positioned Eliza Labs at the forefront of innovation. The ElizaOS framework has quickly gained recognition as a key resource for developers. Prior to founding Eliza Labs, Shaw dedicated several years to advancing AI agent technologies and exploring diverse frameworks.',
  'talk',
  25,
  NULL,
  'Shaw',
  ARRAY['ai', 'agents', 'open-source', 'elizaos'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 10:00:00-07';

-- 10:30-10:55 - Willy Ogorzaly
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'From: Nouns, To: Every Community',
  'Serial founder with 2 exits, building in web3 since 2017. Helped launch ShapeShift and Giveth DAO. Avid supporter of open source public goods.',
  'talk',
  25,
  NULL,
  'Willy Ogorzaly',
  ARRAY['nouns', 'community', 'dao', 'public-goods'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 10:30:00-07';

-- 11:00-11:30 - DeSci Panel
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'DeSci Panel',
  'A panel discussion exploring Decentralized Science (DeSci) - the movement to make scientific research more open, accessible, and community-driven through blockchain technology.',
  'panel',
  30,
  NULL,
  'Rodrigo',
  ARRAY['desci', 'science', 'research', 'panel'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 11:00:00-07'
  AND t.slug = 'desci';

-- 11:35-12:00 - Devansh Mehta
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Ethereum Foundation Update',
  'Updates and insights from the Ethereum Foundation.',
  'talk',
  25,
  NULL,
  'Devansh Mehta',
  ARRAY['ethereum', 'ef'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 11:35:00-07';

-- 12:05-12:30 - William Le
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Universal Basic Income, Crypto, and the Age of AI',
  'Will is a Founder and CEO of Haraka, whose mission is to build next generation financial products for global workers in the informal economy. Haraka''s flagship app, Bondy is a stablecoin-powered fintech app that helps users manage USD, FX, and savings with less friction.

Will started his career at a hedge fund before making a hard pivot into international development, and has since spent his career focused on tech-enabled financial inclusion.',
  'talk',
  25,
  NULL,
  'William Le',
  ARRAY['ubi', 'crypto', 'ai', 'financial-inclusion', 'stablecoins'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 12:05:00-07';

-- 13:30-13:55 - Tomasz (EF Co-Executive Director)
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Ethereum Foundation: Vision & Direction',
  'Co-Executive Director of the Ethereum Foundation. He previously founded Nethermind, an Ethereum core development and infrastructure company, and his personal interests lie at the intersection of blockchain, AI, and robotics.',
  'talk',
  25,
  NULL,
  'Tomasz',
  ARRAY['ethereum', 'ef', 'leadership', 'vision'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 13:30:00-07';

-- 14:00-14:25 - Zsolt Felfoldi
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Ethereum Foundation Research',
  'Insights from the Ethereum Foundation research team.',
  'talk',
  25,
  NULL,
  'Zsolt Felfoldi',
  ARRAY['ethereum', 'research'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 14:00:00-07';

-- 14:30-14:50 - Eugene (Octant Labs)
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'A New Era For Public Goods Funding and Governance',
  'Eugene is the COO and the Head of Governance at Octant Labs. He is also a Research Director at Metagov, where he leads the gov/acc research program and the Grant Innovation Lab.',
  'talk',
  20,
  NULL,
  'Eugene',
  ARRAY['public-goods', 'governance', 'funding', 'octant'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-14 14:30:00-07'
  AND t.slug = 'pgf';

-- =============================================================================
-- SUNDAY SESSIONS (February 15, 2026) - E-Town Main Stage
-- =============================================================================

-- 10:25-10:30 - Sunday Welcome
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Sunday Welcome',
  'Welcome to the final day of EthBoulder.',
  'talk',
  5,
  NULL,
  'Kevin Owocki',
  ARRAY['welcome'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 10:25:00-07';

-- 10:35-11:00 - Emily Rasowsky
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Healing, AI, and Web3: Mapping the Human Psyche',
  'Emily Rasowsky is a multidisciplinary entrepreneur, healer and marketing professional. She is the co-founder of Liber8, an AI healing company mapping the human psyche and working at the intersection of chronic illness, cancer, and trauma. She has 13+ years of hands-on healing experience and has worked with doctors, shamans, and technologists to explore the cutting edge of transformation.

She simultaneously has built a career as a leading marketing and communications professional as one of the founding members of Amazon Care - Amazon''s healthcare division. She is also the founder of Pop Agency, a web3 marketing agency she ran for 4 years. She now works at the Ethereum Foundation on the Comms Coordination team and continues to support healing clients using her methodology.',
  'talk',
  25,
  NULL,
  'Emily Rasowsky',
  ARRAY['ai', 'healing', 'wellness', 'health'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 10:35:00-07';

-- 11:05-11:30 - Carter (Fhenix)
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Fhenix: Fully Homomorphic Encryption for Ethereum',
  'Ecosystem Engineer at Fhenix, building privacy-preserving smart contracts using fully homomorphic encryption (FHE).',
  'talk',
  25,
  NULL,
  'Carter',
  ARRAY['privacy', 'fhe', 'encryption', 'fhenix'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 11:05:00-07'
  AND t.slug = 'privacy';

-- 11:35-12:15 - Eric Alston
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Privacy Tech as a Democratic Constitutional Commitment',
  'Teaches in the finance division at Leeds (CU Boulder) with research into privacy-forward constitutional design and onchain governance.',
  'talk',
  40,
  NULL,
  'Eric Alston',
  ARRAY['privacy', 'governance', 'democracy', 'constitution'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 11:35:00-07'
  AND t.slug = 'privacy';

-- 12:20-12:55 - Andy Guzman (PSE Lead)
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Privacy & Scaling Explorations at Ethereum Foundation',
  'Andy leads PSE (Privacy & Scaling Explorations) at the Ethereum Foundation, a group of teams dedicated to R&D and coordination of Privacy on Ethereum ecosystem.',
  'talk',
  35,
  NULL,
  'Andy Guzman',
  ARRAY['privacy', 'scaling', 'pse', 'ef'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 12:20:00-07'
  AND t.slug = 'privacy';

-- 14:00-14:50 - Naomi Brockwell
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Reclaiming Privacy and Autonomy Online',
  'Naomi Brockwell is the President and Founder of the Ludlow Institute, a non-profit dedicated to advancing freedom through technology. Their media arm, NBTV, has over 1 million subscribers across platforms and over 100 million views of their videos, educating people on how to reclaim their privacy and autonomy online.

Ludlow Institute also has a grants program that funds research into the surveillance embedded in everyday technology. Naomi is also the author of "Beginner''s Introduction To Privacy".',
  'talk',
  50,
  NULL,
  'Naomi Brockwell',
  ARRAY['privacy', 'freedom', 'surveillance', 'media'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 14:00:00-07'
  AND t.slug = 'privacy';

-- 14:55-15:25 - Griff Green & Kevin Owocki Fireside
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'Fireside Chat: Griff Green & Kevin Owocki',
  'A fireside conversation between two pioneers in the Ethereum public goods ecosystem.',
  'fireside',
  30,
  NULL,
  'Griff Green & Kevin Owocki',
  ARRAY['public-goods', 'ethereum', 'fireside'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 14:55:00-07';

-- 15:30-16:00 - Francesco Andreoli (MetaMask)
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'EIP-8004: Smart Accounts & Agent-Native Wallets',
  'Francesco Andreoli is the Director of Developer Relations at MetaMask, where he leads developer strategy across smart accounts, permissions, SDKs, and next-generation wallet infrastructure. He focuses on bridging product, engineering, and developer communities, with an emphasis on account abstraction, programmable permissions, and agent-native workflows.

Francesco is also a Founding Venture Partner at Oui Capital, an Africa-focused venture fund, where he works closely with founders on early product strategy, developer ecosystems, and go-to-market execution.

He is an active builder and ecosystem contributor, organizing global Builder Nights, moderating technical panels at major Web3 conferences, and experimenting hands-on with agent economies, bot infrastructure, and onchain credit primitives. His work sits at the intersection of developers, capital, and programmable money.',
  'talk',
  30,
  NULL,
  'Francesco Andreoli',
  ARRAY['metamask', 'eip', 'smart-accounts', 'wallets', 'agents'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 15:30:00-07';

-- 16:05-16:30 - Public Good Funding Track Session
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id, track_id
)
SELECT
  'Public Goods Funding Track Session',
  'A session dedicated to exploring innovative mechanisms for funding public goods in the Ethereum ecosystem.',
  'talk',
  25,
  NULL,
  'Eth Boulder',
  ARRAY['public-goods', 'funding', 'pgf'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id,
  t.id
FROM venues v, time_slots ts, tracks t
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 16:05:00-07'
  AND t.slug = 'pgf';

-- 16:35-17:35 - Closing Ceremony
INSERT INTO sessions (
  title, description, format, duration, host_id, host_name, topic_tags,
  status, session_type, is_votable, venue_id, time_slot_id
)
SELECT
  'EthBoulder Closing Ceremony',
  'Join us for the official closing ceremony of EthBoulder 2026. We''ll celebrate the community, recognize outstanding contributions, and look ahead to what''s next.',
  'ceremony',
  60,
  NULL,
  'Eth Boulder',
  ARRAY['ceremony', 'closing'],
  'scheduled',
  'curated',
  false,
  v.id,
  ts.id
FROM venues v, time_slots ts
WHERE v.slug = 'etown'
  AND ts.venue_id = v.id
  AND ts.start_time = '2026-02-15 16:35:00-07';

-- =============================================================================
-- UPDATE TIME SLOT LABELS TO MATCH SESSIONS
-- =============================================================================

-- Friday time slot label updates
UPDATE time_slots SET label = 'Welcome & Event App Intro'
WHERE start_time = '2026-02-13 10:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Why Ideas Need to F*ck - Rene Pinnell'
WHERE start_time = '2026-02-13 11:05:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'zkEVM Verifier Specs - Cody Gunton'
WHERE start_time = '2026-02-13 11:35:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Gitcoin - Mathilda'
WHERE start_time = '2026-02-13 12:05:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Ethereum: The Next Chapter - Alex Stokes'
WHERE start_time = '2026-02-13 13:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'EF Research - Csaba Kiraly'
WHERE start_time = '2026-02-13 14:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'ETH Core Protocol Governance - Nixo'
WHERE start_time = '2026-02-13 14:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Etheralize - Danny Ryan'
WHERE start_time = '2026-02-13 15:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Who Wants a Protocol Society? - Nathan Schneider'
WHERE start_time = '2026-02-13 15:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

-- Saturday time slot label updates
UPDATE time_slots SET label = 'ElizaOS - Shaw'
WHERE start_time = '2026-02-14 10:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'From Nouns to Every Community - Willy Ogorzaly'
WHERE start_time = '2026-02-14 10:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'DeSci Panel - Rodrigo'
WHERE start_time = '2026-02-14 11:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'EF Update - Devansh Mehta'
WHERE start_time = '2026-02-14 11:35:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'UBI, Crypto & AI - William Le'
WHERE start_time = '2026-02-14 12:05:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'EF Vision - Tomasz'
WHERE start_time = '2026-02-14 13:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'EF Research - Zsolt Felfoldi'
WHERE start_time = '2026-02-14 14:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Public Goods Funding & Governance - Eugene'
WHERE start_time = '2026-02-14 14:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

-- Sunday time slot label updates
UPDATE time_slots SET label = 'Healing, AI & Web3 - Emily Rasowsky'
WHERE start_time = '2026-02-15 10:35:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Fhenix FHE - Carter'
WHERE start_time = '2026-02-15 11:05:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Privacy as Constitutional Commitment - Eric Alston'
WHERE start_time = '2026-02-15 11:35:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'PSE at EF - Andy Guzman'
WHERE start_time = '2026-02-15 12:20:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Reclaiming Privacy - Naomi Brockwell'
WHERE start_time = '2026-02-15 14:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Fireside: Griff Green & Kevin Owocki'
WHERE start_time = '2026-02-15 14:55:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'EIP-8004 - Francesco Andreoli'
WHERE start_time = '2026-02-15 15:30:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Public Goods Funding Track'
WHERE start_time = '2026-02-15 16:05:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

UPDATE time_slots SET label = 'Closing Ceremony'
WHERE start_time = '2026-02-15 16:35:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

-- =============================================================================
-- SPECIAL EVENTS (Non-session breaks/activities)
-- =============================================================================

-- Saturday Tie-Dye Happy Hour - Update existing time slot
UPDATE time_slots SET label = 'Tie-Dye Happy Hour @ Barker Park'
WHERE start_time = '2026-02-14 15:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');

-- Sunday Happy Hour hosted by Fhenix
UPDATE time_slots SET label = 'Happy Hour hosted by Fhenix'
WHERE start_time = '2026-02-15 17:00:00-07' AND venue_id = (SELECT id FROM venues WHERE slug = 'etown');
