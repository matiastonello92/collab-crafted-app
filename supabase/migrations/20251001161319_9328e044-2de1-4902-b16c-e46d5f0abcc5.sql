-- Update get_users_for_location RPC to include primary job tag info
CREATE OR REPLACE FUNCTION public.get_users_for_location(p_location_id uuid)
RETURNS TABLE(
  id uuid,
  full_name text,
  email text,
  avatar_url text,
  primary_job_tag_id uuid,
  primary_job_tag_label text,
  primary_job_tag_color text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_org_id uuid;
BEGIN
  -- Get org_id from location
  SELECT l.org_id INTO v_org_id
  FROM locations l
  WHERE l.id = p_location_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'Location not found';
  END IF;

  -- Check permissions
  IF NOT (is_platform_admin() OR user_in_org(v_org_id)) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  -- Return users with their primary job tag for this location
  RETURN QUERY
  SELECT 
    p.id,
    p.full_name,
    u.email,
    p.avatar_url,
    ujt_primary.tag_id as primary_job_tag_id,
    jt_primary.label_it as primary_job_tag_label,
    jt_primary.color as primary_job_tag_color
  FROM profiles p
  INNER JOIN auth.users u ON u.id = p.id
  INNER JOIN user_roles_locations url ON url.user_id = p.id
  LEFT JOIN user_job_tags ujt_primary ON ujt_primary.user_id = p.id 
    AND ujt_primary.location_id = p_location_id 
    AND ujt_primary.is_primary = true
  LEFT JOIN job_tags jt_primary ON jt_primary.id = ujt_primary.tag_id
  WHERE url.location_id = p_location_id
    AND url.org_id = v_org_id
    AND COALESCE(url.is_active, true) = true
  GROUP BY p.id, u.email, p.full_name, p.avatar_url, 
           ujt_primary.tag_id, jt_primary.label_it, jt_primary.color
  ORDER BY p.full_name;
END;
$function$;