-- Create haccp-evidence storage bucket with policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'haccp-evidence',
  'haccp-evidence',
  false,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload evidence for their org/location
CREATE POLICY "haccp_evidence_upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'haccp-evidence' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM haccp_tasks t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND user_in_org(t.org_id)
      AND user_in_location(t.location_id)
      AND user_has_permission(auth.uid(), 'haccp:check')
  )
);

-- Allow users to view evidence from their org/location
CREATE POLICY "haccp_evidence_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'haccp-evidence' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM haccp_tasks t
    WHERE t.id::text = (storage.foldername(name))[1]
      AND user_in_org(t.org_id)
      AND user_in_location(t.location_id)
      AND user_has_permission(auth.uid(), 'haccp:view')
  )
);

-- Allow users to delete their own evidence or if they have manage permission
CREATE POLICY "haccp_evidence_delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'haccp-evidence' AND
  auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM haccp_evidences e
    JOIN haccp_tasks t ON t.id = e.task_id
    WHERE e.file_path = name
      AND (
        e.uploaded_by = auth.uid() OR
        (user_in_org(t.org_id) AND user_in_location(t.location_id) AND user_has_permission(auth.uid(), 'haccp:manage'))
      )
  )
);