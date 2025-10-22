-- Make avatars bucket public for better performance and no URL expiration
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';