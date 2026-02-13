-- Add host_notified_at to track when scheduling email was sent
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS host_notified_at TIMESTAMPTZ;
