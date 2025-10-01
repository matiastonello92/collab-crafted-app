-- Fix user_in_location function to check is_active
-- Fix RLS policies for user_job_tags to allow org admins to assign across all locations

-- 1. Update user_in_location function to check is_active
CREATE OR REPLACE FUNCTION public.user_in_location(p_location uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_in boolean;
BEGIN
  IF v_uid IS NULL OR p_location IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user has an active assignment to this location
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_locations url
    WHERE url.location_id = p_location
      AND url.user_id = v_uid
      AND COALESCE(url.is_active, true) = true
  ) INTO v_in;

  RETURN COALESCE(v_in, false);
END;
$function$;

-- 2. Drop and recreate INSERT policy to allow org admin to assign across all org locations
DROP POLICY IF EXISTS user_job_tags_insert ON public.user_job_tags;

CREATE POLICY user_job_tags_insert
ON public.user_job_tags
FOR INSERT
WITH CHECK (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);

-- 3. Update UPDATE policy for consistency
DROP POLICY IF EXISTS user_job_tags_update ON public.user_job_tags;

CREATE POLICY user_job_tags_update
ON public.user_job_tags
FOR UPDATE
USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);

-- 4. Update DELETE policy for consistency
DROP POLICY IF EXISTS user_job_tags_delete ON public.user_job_tags;

CREATE POLICY user_job_tags_delete
ON public.user_job_tags
FOR DELETE
USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND user_has_permission(auth.uid(), 'manage_users')
  )
);