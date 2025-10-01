-- Create function to get users for a specific location with proper multi-tenant filtering
CREATE OR REPLACE FUNCTION public.get_users_for_location(
  p_org_id uuid,
  p_location_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    p.full_name
  FROM profiles p
  INNER JOIN memberships m ON m.user_id = p.id AND m.org_id = p_org_id
  INNER JOIN user_roles_locations url ON url.user_id = p.id AND url.org_id = p_org_id
  WHERE url.is_active = true
    AND (p_location_id IS NULL OR url.location_id = p_location_id)
  ORDER BY p.full_name
$$;