-- Add self-hosted time range columns for sessions hosted at custom locations
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS self_hosted_start_time TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS self_hosted_end_time TIMESTAMPTZ;
