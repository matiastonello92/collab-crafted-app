-- Convert existing signed avatar URLs to public URLs
-- This migration fixes avatars that were uploaded before we made the bucket public

UPDATE public.profiles
SET avatar_url = regexp_replace(
  avatar_url,
  'https://jwchmdivuwgfjrwvgtia\.supabase\.co/storage/v1/object/sign/avatars/([^?]+)\?.*',
  'https://jwchmdivuwgfjrwvgtia.supabase.co/storage/v1/object/public/avatars/\1'
)
WHERE avatar_url LIKE '%/storage/v1/object/sign/avatars/%'
  AND avatar_url IS NOT NULL;