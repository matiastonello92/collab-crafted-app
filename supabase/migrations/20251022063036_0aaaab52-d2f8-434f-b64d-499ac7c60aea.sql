-- Recover orphaned avatars: profiles with NULL avatar_url but existing file in storage
-- This fixes avatars that were uploaded but never saved to the database

UPDATE public.profiles p
SET avatar_url = 'https://jwchmdivuwgfjrwvgtia.supabase.co/storage/v1/object/public/avatars/' || o.name,
    updated_at = now()
FROM storage.objects o
WHERE o.bucket_id = 'avatars'
  AND o.name LIKE p.org_id || '/' || p.id || '/avatar.jpg'
  AND p.avatar_url IS NULL;