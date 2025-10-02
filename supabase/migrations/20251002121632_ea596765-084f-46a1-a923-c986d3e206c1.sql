-- Migration: Drop duplicate foreign key constraint on user_job_tags
-- 
-- Background: Due to a schema evolution, user_job_tags had TWO foreign keys 
-- pointing to job_tags:
--   1. user_job_tags_job_tag_id_fkey (correct - using job_tag_id column)
--   2. user_job_tags_tag_id_fkey (legacy - should have been dropped)
-- 
-- This caused PGRST201 errors when using .select() with job_tags relationship
-- because PostgREST couldn't disambiguate which FK to use.
--
-- Solution: Drop the legacy constraint, keeping only the correct one.

-- Drop the legacy/duplicate foreign key constraint
ALTER TABLE public.user_job_tags 
  DROP CONSTRAINT IF EXISTS user_job_tags_tag_id_fkey;