-- Fix user_has_permission() function to correctly check is_active
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    public.user_is_admin(p_user)
    OR EXISTS (
      SELECT 1
      FROM public.user_roles_locations url
      JOIN public.role_permissions rp ON rp.role_id = url.role_id
      JOIN public.permissions p ON p.id = rp.permission_id
      WHERE url.user_id = p_user
        AND COALESCE(url.is_active, true) = true
        AND p.name = p_permission
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_permissions up
      JOIN public.permissions p ON p.id = up.permission_id
      WHERE up.user_id = p_user
        AND up.granted = true
        AND p.name = p_permission
    );
$function$;