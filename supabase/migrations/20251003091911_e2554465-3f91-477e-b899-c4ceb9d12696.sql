-- Drop and recreate foreign key to force Supabase to refresh metadata
-- This ensures Supabase JS client recognizes the relationship

-- Drop existing constraint
ALTER TABLE public.shifts 
DROP CONSTRAINT IF EXISTS shifts_job_tag_id_fkey;

-- Recreate with proper settings
ALTER TABLE public.shifts 
ADD CONSTRAINT shifts_job_tag_id_fkey 
FOREIGN KEY (job_tag_id) 
REFERENCES public.job_tags(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Refresh Supabase schema cache (comment for documentation)
-- After this migration, Supabase will recognize job_tags as a valid relationship
-- and queries like: supabase.from('shifts').select('*, job_tags(...)') will work