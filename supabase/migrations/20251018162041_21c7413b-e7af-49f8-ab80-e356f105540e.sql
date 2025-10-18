-- Fix RLS recursion by adding SET row_security TO 'off' to critical functions

-- 1. Fix user_in_org() - Add row_security OFF to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.user_in_org(p_org uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion when reading memberships
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_in boolean;
BEGIN
  IF v_uid IS NULL OR p_org IS NULL THEN
    RETURN false;
  END IF;

  -- Reads memberships WITHOUT triggering RLS policies
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.org_id = p_org
      AND m.user_id = v_uid
  ) INTO v_in;

  RETURN COALESCE(v_in, false);
END;
$$;

-- 2. Fix user_is_org_admin() - Add row_security OFF to prevent RLS recursion
CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion when reading memberships
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean;
BEGIN
  IF v_uid IS NULL OR p_org IS NULL THEN
    RETURN false;
  END IF;

  -- Reads memberships WITHOUT triggering RLS policies
  SELECT EXISTS (
    SELECT 1
    FROM public.memberships m
    WHERE m.org_id = p_org
      AND m.user_id = v_uid
      AND m.role = 'admin'
  ) INTO v_is_admin;

  RETURN COALESCE(v_is_admin, false);
END;
$$;

-- 3. Create user_in_location() if missing (required by many RLS policies)
CREATE OR REPLACE FUNCTION public.user_in_location(p_location uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_in boolean;
BEGIN
  IF v_uid IS NULL OR p_location IS NULL THEN
    RETURN false;
  END IF;

  -- Check via user_roles_locations WITHOUT triggering RLS
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_locations url
    WHERE url.user_id = v_uid
      AND url.location_id = p_location
      AND COALESCE(url.is_active, true) = true
  ) INTO v_in;

  RETURN COALESCE(v_in, false);
END;
$$;

-- 4. Create user_can_manage_inventory() if missing (used by inventory RLS)
CREATE OR REPLACE FUNCTION public.user_can_manage_inventory(p_org_id uuid, p_location_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion
AS $$
BEGIN
  RETURN is_platform_admin() 
    OR (
      user_in_org(p_org_id) 
      AND user_in_location(p_location_id)
      AND user_has_permission(auth.uid(), 'inventory:edit')
    );
END;
$$;

-- 5. Verify is_manager_for_location() has correct signature
CREATE OR REPLACE FUNCTION public.is_manager_for_location(loc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'  -- ✅ Prevents RLS recursion
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_manager boolean;
BEGIN
  IF v_uid IS NULL OR loc_id IS NULL THEN
    RETURN false;
  END IF;

  -- Check if user has manager role for this location
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles_locations url
    JOIN public.roles r ON r.id = url.role_id
    WHERE url.user_id = v_uid
      AND url.location_id = loc_id
      AND r.name = 'manager'
      AND COALESCE(url.is_active, true) = true
  ) INTO v_is_manager;

  RETURN COALESCE(v_is_manager, false);
END;
$$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ RLS recursion fix completed - all critical functions now have SET row_security TO off';
END $$;