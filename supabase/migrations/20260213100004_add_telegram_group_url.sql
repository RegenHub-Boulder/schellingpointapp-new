-- Add telegram_group_url column to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS telegram_group_url TEXT;
