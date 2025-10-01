-- Drop and recreate get_users_for_location with correct column references
DROP FUNCTION IF EXISTS public.get_users_for_location(uuid);

CREATE OR REPLACE FUNCTION public.get_users_for_location(p_location_id uuid)
RETURNS TABLE (
  id uuid,
  full_name text,
  email text,
  primary_job_tag_id uuid,
  primary_job_tag_label text,
  primary_job_tag_color text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    p.id,
    p.full_name,
    u.email,
    ujt_primary.job_tag_id as primary_job_tag_id,
    jt_primary.label_it as primary_job_tag_label,
    jt_primary.color as primary_job_tag_color
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  JOIN user_roles_locations url ON url.user_id = p.id
  LEFT JOIN user_job_tags ujt_primary ON ujt_primary.user_id = p.id 
    AND ujt_primary.location_id = p_location_id 
    AND ujt_primary.is_primary = true
  LEFT JOIN job_tags jt_primary ON jt_primary.id = ujt_primary.job_tag_id
  WHERE url.location_id = p_location_id
    AND COALESCE(url.is_active, true) = true
  GROUP BY p.id, u.email, ujt_primary.job_tag_id, jt_primary.label_it, jt_primary.color;
$$;