-- Continue migration: Update remaining database functions

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