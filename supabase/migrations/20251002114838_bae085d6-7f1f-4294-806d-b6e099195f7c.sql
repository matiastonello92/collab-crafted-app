-- ============================================================
-- FIX: Infinite RLS Recursion Loop
-- ISSUE: user_is_org_admin() and is_manager_for_location() 
--        trigger RLS on tables they query, causing infinite loop
-- SOLUTION: Add SET row_security TO 'off' to both functions
-- ============================================================

-- 1. Fix user_is_org_admin function
CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_admin boolean;
begin
  if v_uid is null or p_org is null then
    return false;
  end if;

  -- Query memberships SENZA triggare RLS
  select exists (
    select 1
    from public.memberships m
    where m.org_id = p_org
      and m.user_id = v_uid
      and m.role = 'admin'
  ) into v_is_admin;

  return coalesce(v_is_admin, false);
end;
$function$;

-- 2. Fix is_manager_for_location function
CREATE OR REPLACE FUNCTION public.is_manager_for_location(loc_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
SET row_security TO 'off'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_is_manager boolean;
  v_org_id uuid;
begin
  if v_uid is null or loc_id is null then
    return false;
  end if;

  -- Get org_id first
  select l.org_id into v_org_id
  from public.locations l
  where l.id = loc_id;

  if v_org_id is null then
    return false;
  end if;

  -- Query user_roles_locations SENZA triggare RLS
  select exists (
    select 1
    from public.user_roles_locations url
    join public.roles r on r.id = url.role_id
    where url.user_id = v_uid
      and url.location_id = loc_id
      and r.name = 'manager'
      and coalesce(url.is_active, true)
      and url.org_id = v_org_id
  ) into v_is_manager;

  return coalesce(v_is_manager, false);
end;
$function$;

-- 3. Add comments for documentation
COMMENT ON FUNCTION public.user_is_org_admin(uuid) IS 
'Checks if user is org admin. SECURITY DEFINER with row_security=off to prevent infinite RLS recursion';

COMMENT ON FUNCTION public.is_manager_for_location(uuid) IS 
'Checks if user is manager for location. SECURITY DEFINER with row_security=off to prevent infinite RLS recursion';