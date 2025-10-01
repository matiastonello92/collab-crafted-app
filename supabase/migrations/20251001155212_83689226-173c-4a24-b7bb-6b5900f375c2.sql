-- Fix RLS policies for user_job_tags table
-- Drop existing incomplete policies
DROP POLICY IF EXISTS user_job_tags_select ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_insert ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_update ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_delete ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_insert_by_org_loc ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_select_by_org_loc ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_update_by_org_loc ON public.user_job_tags;
DROP POLICY IF EXISTS user_job_tags_delete_by_org_loc ON public.user_job_tags;

-- Create correct RLS policies according to docs/klyra-shifts/rls_job_tags.md

-- SELECT: Platform admin, self, org members with manage_users or in location
CREATE POLICY user_job_tags_select
ON public.user_job_tags
FOR SELECT
USING (
  is_platform_admin()
  OR (user_id = auth.uid())
  OR (
    user_in_org(org_id)
    AND (
      user_has_permission(auth.uid(), 'manage_users')
      OR user_in_location(location_id)
    )
  )
);

-- INSERT: Platform admin or org member in location with manage_users
CREATE POLICY user_job_tags_insert
ON public.user_job_tags
FOR INSERT
WITH CHECK (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);

-- UPDATE: Platform admin or org member in location with manage_users
CREATE POLICY user_job_tags_update
ON public.user_job_tags
FOR UPDATE
USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);

-- DELETE: Platform admin or org member in location with manage_users
CREATE POLICY user_job_tags_delete
ON public.user_job_tags
FOR DELETE
USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);