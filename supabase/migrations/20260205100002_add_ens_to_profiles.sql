-- Add ENS name field to profiles table
-- This allows users to display their ENS identity (e.g., vitalik.eth)

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS ens TEXT;

-- Add comment for documentation
COMMENT ON COLUMN profiles.ens IS 'User ENS name (e.g., yourname.eth)';
