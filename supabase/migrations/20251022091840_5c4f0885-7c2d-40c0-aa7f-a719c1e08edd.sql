-- Create post-media bucket for media uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'post-media',
  'post-media',
  true,
  52428800, -- 50MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/quicktime',
    'video/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Users can upload to their org folder
CREATE POLICY "post_media_upload" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'post-media' AND
  auth.uid() IS NOT NULL AND
  -- Path format: {org_id}/{user_id}/{timestamp}_{filename}
  (string_to_array(name, '/'))[1] = (
    SELECT org_id::text FROM profiles WHERE id = auth.uid()
  )::text
);

-- RLS Policy: Anyone can view (public bucket)
CREATE POLICY "post_media_select" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'post-media');

-- RLS Policy: Users can delete their own files or admins can delete any
CREATE POLICY "post_media_delete" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'post-media' AND
  (
    auth.uid()::text = (string_to_array(name, '/'))[2] OR
    is_platform_admin()
  )
);