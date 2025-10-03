-- Recipe Photos Storage Bucket & RLS
-- Ensure bucket exists with consistent configuration
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-photos',
  'recipe-photos',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) 
DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- RLS Policy: Users can view photos from their org
CREATE POLICY "recipe_photos_select_org" ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'recipe-photos' 
  AND (
    is_platform_admin()
    OR storage_org_from_name(name) IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  )
);

-- RLS Policy: Users can upload photos to their org folders
CREATE POLICY "recipe_photos_insert_org" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'recipe-photos'
  AND storage_org_from_name(name) IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can update photos in their org folders
CREATE POLICY "recipe_photos_update_org" ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'recipe-photos'
  AND storage_org_from_name(name) IN (
    SELECT org_id FROM profiles WHERE id = auth.uid()
  )
);

-- RLS Policy: Users can delete photos in their org folders
CREATE POLICY "recipe_photos_delete_org" ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'recipe-photos'
  AND (
    is_platform_admin()
    OR storage_org_from_name(name) IN (
      SELECT org_id FROM profiles WHERE id = auth.uid()
    )
  )
);