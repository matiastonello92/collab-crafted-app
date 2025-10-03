-- Create recipe-photos storage bucket with appropriate policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'recipe-photos',
  'recipe-photos',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to view recipe photos in their org
CREATE POLICY "Users can view recipe photos in their org"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recipe-photos' 
  AND auth.uid() IS NOT NULL
  AND (storage_org_from_name(name) IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid()
  ))
);

-- Allow users with shifts:manage permission to upload recipe photos
CREATE POLICY "Users with shifts:manage can upload recipe photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'recipe-photos'
  AND auth.uid() IS NOT NULL
  AND (storage_org_from_name(name) IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid()
  ))
);

-- Allow users with shifts:manage permission to update recipe photos
CREATE POLICY "Users with shifts:manage can update recipe photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'recipe-photos'
  AND auth.uid() IS NOT NULL
  AND (storage_org_from_name(name) IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid()
  ))
);

-- Allow users with shifts:manage permission to delete recipe photos
CREATE POLICY "Users with shifts:manage can delete recipe photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'recipe-photos'
  AND auth.uid() IS NOT NULL
  AND (storage_org_from_name(name) IN (
    SELECT org_id FROM memberships WHERE user_id = auth.uid()
  ))
);