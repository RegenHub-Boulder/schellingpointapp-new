-- Fix unconference slot types and add Riverside Saturday unconference slots

-- 1. Terrible Turtle Saturday 11:15-11:45: was incorrectly labeled unconference
--    CSV shows this is the Creative Track Tea Ceremony slot
UPDATE time_slots
SET slot_type = 'track', label = 'Creative Track'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'terrible-turtle')
  AND day_date = '2026-02-14'
  AND start_time = '2026-02-14 11:15:00-07'
  AND end_time = '2026-02-14 11:45:00-07';

-- 2. Regen Hub Sunday 14:10-15:05: was labeled "Workshop Slot" session
--    Should be unconference
UPDATE time_slots
SET slot_type = 'unconference', label = 'Unconference'
WHERE venue_id = (SELECT id FROM venues WHERE slug = 'regen-hub')
  AND day_date = '2026-02-15'
  AND start_time = '2026-02-15 14:10:00-07'
  AND end_time = '2026-02-15 15:05:00-07';

-- 3. Riverside Saturday unconference slots (10:30am - 5:00pm, 30-min blocks)
--    13 slots total — Riverside had no time slots in the migration previously
INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 10:30:00-07', '2026-02-14 11:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:00:00-07', '2026-02-14 11:30:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 11:30:00-07', '2026-02-14 12:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:00:00-07', '2026-02-14 12:30:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 12:30:00-07', '2026-02-14 13:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 13:00:00-07', '2026-02-14 13:30:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 13:30:00-07', '2026-02-14 14:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:00:00-07', '2026-02-14 14:30:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 14:30:00-07', '2026-02-14 15:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:00:00-07', '2026-02-14 15:30:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 15:30:00-07', '2026-02-14 16:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 16:00:00-07', '2026-02-14 16:30:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';

INSERT INTO time_slots (venue_id, day_date, start_time, end_time, label, slot_type, is_break)
SELECT v.id, '2026-02-14', '2026-02-14 16:30:00-07', '2026-02-14 17:00:00-07', 'Unconference', 'unconference', false
FROM venues v WHERE v.slug = 'riverside';
