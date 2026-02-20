-- ============================================================================
-- Create event-assets storage bucket for logos and banners
-- ============================================================================

-- Create the storage bucket (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'event-assets',
  'event-assets',
  true,  -- Public bucket for event logos/banners
  5242880,  -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[];

-- ============================================================================
-- Storage RLS policies (drop if exist, then create)
-- ============================================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Public read access for event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete event assets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update event assets" ON storage.objects;

-- Allow anyone to read public event assets
CREATE POLICY "Public read access for event assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'event-assets');

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload event assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event-assets');

-- Allow users to delete their own uploads
-- Note: For now, any authenticated user can delete any asset
-- In production, you might want to track ownership
CREATE POLICY "Authenticated users can delete event assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event-assets');

-- Allow users to update their own uploads
CREATE POLICY "Authenticated users can update event assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'event-assets');
