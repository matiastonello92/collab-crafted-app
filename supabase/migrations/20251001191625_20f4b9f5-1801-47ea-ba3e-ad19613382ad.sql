-- Phase 1: Fix duplicate RPC function get_users_for_location
-- Drop all existing versions with their full signatures
DROP FUNCTION IF EXISTS public.get_users_for_location(uuid);
DROP FUNCTION IF EXISTS public.get_users_for_location(uuid, uuid);

-- Create unified version with optional parameters
CREATE OR REPLACE FUNCTION public.get_users_for_location(
  p_location_id uuid DEFAULT NULL,
  p_org_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text,
  org_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- If location_id provided, derive org_id from it
  IF p_location_id IS NOT NULL THEN
    SELECT l.org_id INTO p_org_id
    FROM locations l
    WHERE l.id = p_location_id;
  END IF;

  -- Return users based on org_id and optional location_id filter
  RETURN QUERY
  SELECT DISTINCT
    p.id,
    p.full_name,
    p.org_id
  FROM profiles p
  INNER JOIN memberships m ON m.user_id = p.id
  WHERE m.org_id = COALESCE(p_org_id, m.org_id)
    AND (p_location_id IS NULL OR EXISTS (
      SELECT 1 FROM user_roles_locations url
      WHERE url.user_id = p.id
        AND url.location_id = p_location_id
        AND COALESCE(url.is_active, true)
    ))
  ORDER BY p.full_name;
END;
$$;