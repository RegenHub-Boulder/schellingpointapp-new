-- ============================================================================
-- Fix event-assets storage bucket RLS policies
-- Drop and recreate to ensure clean state
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event assets" ON storage.objects;

-- Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-assets',
  'event-assets',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- ============================================================================
-- Storage RLS policies
-- ============================================================================

-- Allow anyone to read public event assets
CREATE POLICY "Public read access for event assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- Allow authenticated users to upload to event-assets bucket
CREATE POLICY "Authenticated users can upload event assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-assets');

-- Allow authenticated users to delete from event-assets bucket
CREATE POLICY "Authenticated users can delete event assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-assets');

-- Allow authenticated users to update in event-assets bucket
CREATE POLICY "Authenticated users can update event assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-assets');
