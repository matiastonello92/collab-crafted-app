-- Create Storage Bucket for HACCP Evidence (simplified, no table references)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'haccp-evidence',
  'haccp-evidence',
  false,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Basic storage policies for HACCP evidence bucket
CREATE POLICY "Authenticated users can upload evidence" ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'haccp-evidence' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can view evidence" ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'haccp-evidence' AND
    auth.role() = 'authenticated'
  );

CREATE POLICY "Users can delete own evidence" ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'haccp-evidence' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Enable pg_cron and pg_net extensions for recurring tasks scheduler
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;