-- Add platform admin bypass to key RLS policies for full access

-- Users table (profiles) - Platform admin can see all users
DROP POLICY IF EXISTS "profiles_select_by_org" ON public.profiles;
CREATE POLICY "profiles_select_by_org" ON public.profiles
FOR SELECT USING (
  is_platform_admin() OR user_in_org(org_id) OR (id = auth.uid())
);

-- Organizations - Platform admin can see all orgs
DROP POLICY IF EXISTS "org_select" ON public.organizations;
CREATE POLICY "org_select" ON public.organizations
FOR SELECT USING (
  is_platform_admin() OR user_is_org_admin(org_id)
);

-- Locations - Platform admin can see all locations
DROP POLICY IF EXISTS "locations_select_by_org" ON public.locations;
CREATE POLICY "locations_select_by_org" ON public.locations
FOR SELECT USING (
  is_platform_admin() OR user_in_org(org_id)
);

-- User roles locations - Platform admin can see all assignments
DROP POLICY IF EXISTS "url_select_by_permission_org" ON public.user_roles_locations;
CREATE POLICY "url_select_by_permission_org" ON public.user_roles_locations
FOR SELECT USING (
  is_platform_admin() OR 
  (auth.uid() = user_id) OR 
  user_in_org(org_id) OR 
  user_has_permission(auth.uid(), 'view_users'::text) OR 
  user_has_permission(auth.uid(), 'manage_users'::text) OR 
  user_has_permission(auth.uid(), 'assign_roles'::text)
);

-- Roles - Platform admin can see all roles
DROP POLICY IF EXISTS "roles_select_by_org" ON public.roles;
CREATE POLICY "roles_select_by_org" ON public.roles
FOR SELECT USING (
  is_platform_admin() OR user_in_org(org_id)
);

-- Permissions - Platform admin can see all permissions
DROP POLICY IF EXISTS "permissions_select_by_org" ON public.permissions;
CREATE POLICY "permissions_select_by_org" ON public.permissions
FOR SELECT USING (
  is_platform_admin() OR user_in_org(org_id)
);

-- Role permissions - Platform admin can see all role permission mappings
DROP POLICY IF EXISTS "role_permissions_select_by_org" ON public.role_permissions;
CREATE POLICY "role_permissions_select_by_org" ON public.role_permissions
FOR SELECT USING (
  is_platform_admin() OR user_in_org(org_id)
);