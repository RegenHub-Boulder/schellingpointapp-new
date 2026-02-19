-- Update event status constraint to support expanded lifecycle states
-- Old states: draft, published, voting, scheduling, live, completed, archived
-- New states: draft, published, proposals_open, voting_open, scheduling, live, completed, archived

-- Drop the existing check constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add the new check constraint with expanded lifecycle states
ALTER TABLE events ADD CONSTRAINT events_status_check CHECK (status IN (
  'draft',
  'published',
  'proposals_open',
  'voting_open',
  'scheduling',
  'live',
  'completed',
  'archived'
));

-- Migrate any existing 'voting' status to 'voting_open'
UPDATE events SET status = 'voting_open' WHERE status = 'voting';

COMMENT ON COLUMN events.status IS 'Event lifecycle status: draft -> published -> proposals_open -> voting_open -> scheduling -> live -> completed -> archived';
