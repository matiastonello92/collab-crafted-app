-- Migration: Complete removal of location_admins dependency
-- Step 1: Backup location_admins table
CREATE TABLE IF NOT EXISTS public.location_admins_backup AS 
SELECT * FROM public.location_admins;

-- Step 2: Verify data consistency between location_admins and user_roles_locations
-- Check for missing manager role assignments
DO $$
DECLARE
    missing_count INTEGER;
    total_admins INTEGER;
BEGIN
    -- Count total location admins
    SELECT COUNT(*) INTO total_admins FROM public.location_admins;
    
    -- Count missing manager roles in user_roles_locations
    SELECT COUNT(*) INTO missing_count
    FROM public.location_admins la
    LEFT JOIN public.user_roles_locations url ON (
        url.user_id = la.user_id 
        AND url.location_id = la.location_id
        AND url.role_id IN (
            SELECT r.id FROM public.roles r 
            WHERE r.name = 'manager' AND r.org_id = la.org_id
        )
        AND COALESCE(url.is_active, true) = true
    )
    WHERE url.id IS NULL;
    
    RAISE NOTICE 'Location admins backup: % rows', total_admins;
    RAISE NOTICE 'Missing manager role assignments: %', missing_count;
    
    -- If there are missing assignments, we need to create them
    IF missing_count > 0 THEN
        RAISE NOTICE 'Creating missing manager role assignments...';
        
        -- Insert missing manager role assignments
        INSERT INTO public.user_roles_locations (user_id, role_id, location_id, org_id, assigned_by, is_active)
        SELECT DISTINCT
            la.user_id,
            r.id as role_id,
            la.location_id,
            la.org_id,
            la.user_id as assigned_by, -- Self-assigned for migration
            true as is_active
        FROM public.location_admins la
        JOIN public.roles r ON (r.name = 'manager' AND r.org_id = la.org_id)
        LEFT JOIN public.user_roles_locations url ON (
            url.user_id = la.user_id 
            AND url.location_id = la.location_id
            AND url.role_id = r.id
            AND COALESCE(url.is_active, true) = true
        )
        WHERE url.id IS NULL;
        
        GET DIAGNOSTICS missing_count = ROW_COUNT;
        RAISE NOTICE 'Created % missing manager role assignments', missing_count;
    END IF;
END $$;

-- Step 3: Migrate database functions to use RBAC instead of location_admins

-- 3.1: Update is_manager_for_location function
CREATE OR REPLACE FUNCTION public.is_manager_for_location(loc_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO 'public'
AS $function$
  SELECT
    public.platform_admin()  -- bypass globale SOLO platform admin
    OR EXISTS (
      SELECT 1
      FROM public.user_roles_locations url
      JOIN public.roles r ON r.id = url.role_id
      JOIN public.locations l ON l.id = url.location_id
      WHERE url.user_id = auth.uid()
        AND url.location_id = loc_id
        AND r.name = 'manager'
        AND COALESCE(url.is_active, true) = true
        -- vincolo multi-tenant: l'utente deve appartenere ALLA STESSA ORG della location
        AND public.user_in_org(l.org_id)
        AND url.org_id = l.org_id
    )
$function$;

-- 3.2: Update admin_assign_manager function  
CREATE OR REPLACE FUNCTION public.admin_assign_manager(loc_id uuid, target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare 
  v_uid uuid;
  v_org_id uuid;
  v_manager_role_id uuid;
begin
  if not public.jwt_is_admin() then
    raise exception 'Only admin can assign managers';
  end if;
  
  -- Get user by email
  select u.id into v_uid from auth.users u where lower(u.email) = lower(target_email) limit 1;
  if v_uid is null then
    raise exception 'User with email % not found', target_email;
  end if;
  
  -- Get location org_id
  select l.org_id into v_org_id from public.locations l where l.id = loc_id;
  if v_org_id is null then
    raise exception 'Location % not found', loc_id;
  end if;
  
  -- Get manager role for this org
  select r.id into v_manager_role_id 
  from public.roles r 
  where r.name = 'manager' and r.org_id = v_org_id
  limit 1;
  
  if v_manager_role_id is null then
    raise exception 'Manager role not found for organization';
  end if;
  
  -- Assign manager role via user_roles_locations
  insert into public.user_roles_locations(user_id, role_id, location_id, org_id, assigned_by, is_active)
  values (v_uid, v_manager_role_id, loc_id, v_org_id, auth.uid(), true)
  on conflict (user_id, role_id, location_id) 
  do update set is_active = true, assigned_by = auth.uid(), assigned_at = now();
end;
$function$;

-- 3.3: Update admin_remove_manager function
CREATE OR REPLACE FUNCTION public.admin_remove_manager(loc_id uuid, target_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare 
  v_uid uuid;
  v_org_id uuid;
  v_manager_role_id uuid;
begin
  if not public.jwt_is_admin() then
    raise exception 'Only admin can remove managers';
  end if;
  
  -- Get user by email
  select u.id into v_uid from auth.users u where lower(u.email) = lower(target_email) limit 1;
  if v_uid is null then
    return; -- User not found, nothing to remove
  end if;
  
  -- Get location org_id
  select l.org_id into v_org_id from public.locations l where l.id = loc_id;
  if v_org_id is null then
    raise exception 'Location % not found', loc_id;
  end if;
  
  -- Get manager role for this org
  select r.id into v_manager_role_id 
  from public.roles r 
  where r.name = 'manager' and r.org_id = v_org_id
  limit 1;
  
  if v_manager_role_id is null then
    return; -- No manager role, nothing to remove
  end if;
  
  -- Deactivate manager role assignment
  update public.user_roles_locations
  set is_active = false
  where user_id = v_uid 
    and role_id = v_manager_role_id 
    and location_id = loc_id
    and org_id = v_org_id;
end;
$function$;

-- 3.4: Update admin_list_location_admins function
CREATE OR REPLACE FUNCTION public.admin_list_location_admins(loc_id uuid)
RETURNS TABLE(user_id uuid, email text, created_at timestamp with time zone)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT 
    url.user_id, 
    u.email, 
    url.assigned_at as created_at
  FROM public.user_roles_locations url
  JOIN auth.users u ON u.id = url.user_id
  JOIN public.roles r ON r.id = url.role_id
  WHERE url.location_id = loc_id
    AND r.name = 'manager'
    AND COALESCE(url.is_active, true) = true
  ORDER BY url.assigned_at DESC;
$function$;

-- Step 4: Verify RLS policies are working with updated functions
-- The policies using is_manager_for_location() should now work with RBAC
-- No changes needed to policies as they use the updated function

RAISE NOTICE 'Migration completed successfully. location_admins table backed up and all functions migrated to RBAC.';
RAISE NOTICE 'Next step: Update application code to use RBAC queries instead of location_admins.';