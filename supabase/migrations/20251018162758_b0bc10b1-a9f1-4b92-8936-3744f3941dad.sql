-- Fix RLS recursion in user_has_permission() and user_is_admin()
-- These functions are called by many RLS policies and must bypass row security

-- 1. Fix user_has_permission() - Add row_security OFF to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.user_has_permission(p_user uuid, p_permission text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion when reading user_roles_locations and user_permissions
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

-- 2. Fix user_is_admin() - Add row_security OFF to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.user_is_admin(p_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion when reading platform_admins
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.platform_admins pa 
    WHERE pa.user_id = p_user
  );
$function$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Fixed RLS recursion in user_has_permission() and user_is_admin()';
END $$;