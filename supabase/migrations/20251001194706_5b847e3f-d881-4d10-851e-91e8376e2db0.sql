-- Fix user_job_tags RLS policies to allow org admins without manage_users permission
-- This aligns user_job_tags policies with job_tags policies for consistency

-- Drop existing INSERT/UPDATE/DELETE policies
DROP POLICY IF EXISTS "user_job_tags_insert" ON public.user_job_tags;
DROP POLICY IF EXISTS "user_job_tags_update" ON public.user_job_tags;
DROP POLICY IF EXISTS "user_job_tags_delete" ON public.user_job_tags;

-- Recreate policies with consistent org-level permissions
-- Allow platform admins or any user in the same org to manage job tag assignments
CREATE POLICY "user_job_tags_insert" 
ON public.user_job_tags 
FOR INSERT 
TO public 
WITH CHECK (is_platform_admin() OR user_in_org(org_id));

CREATE POLICY "user_job_tags_update" 
ON public.user_job_tags 
FOR UPDATE 
TO public 
USING (is_platform_admin() OR user_in_org(org_id))
WITH CHECK (is_platform_admin() OR user_in_org(org_id));

CREATE POLICY "user_job_tags_delete" 
ON public.user_job_tags 
FOR DELETE 
TO public 
USING (is_platform_admin() OR user_in_org(org_id));