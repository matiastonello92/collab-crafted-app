# Database RLS Policies Snapshot - 2025-09-13

**Pre-Migration Multi-Tenant State**

Total RLS Policies: **54**

## Policy Summary by Table

### app_settings (2 policies)
- `app_settings_select` - SELECT - Authenticated users can read
- `app_settings_write_admin` - ALL - Admin-only write access

### invitation_job_tags (2 policies)  
- `ijt_admin_read` - SELECT - Admin read access
- `ijt_admin_or_invite_write` - ALL - Admin or invite_users permission

### invitation_permissions (2 policies)
- `Users with invite_users permission can manage invitation permis` - ALL - Complex permission check
- `Users with invite_users permission can view invitation permissi` - SELECT - Complex permission check

### invitation_roles_locations (2 policies)
- `Users with invite_users permission can manage invitation roles` - ALL - Complex permission check  
- `Users with invite_users permission can view invitation roles` - SELECT - Complex permission check

### invitations (2 policies)
- `Users with invite_users permission can manage invitations` - ALL - Complex permission check
- `Users with invite_users permission can view invitations` - SELECT - Complex permission check

### job_tags (2 policies)
- `job_tags_admin_write` - ALL - Admin write access
- `job_tags_select_all` - SELECT - All authenticated users can read

### location_admins (3 policies)
- `locadmins_delete_admin` - DELETE - Admin delete access  
- `locadmins_insert_admin` - INSERT - Admin insert access
- `locadmins_select_self_or_admin` - SELECT - Self or admin access

### locations (6 policies)
- `Admins can manage all locations` - ALL - Admin full access
- `Users can view locations they have access to` - SELECT - Location-based access
- `locations_delete_admin` - DELETE - Admin delete access
- `locations_insert_admin` - INSERT - Admin insert access  
- `locations_select_all` - SELECT - **⚠️ CRITICAL: Public read access**
- `locations_update_admin_or_assigned` - UPDATE - Admin or manager access

### permission_preset_items (2 policies)
- `ppi_read` - SELECT - Authenticated users can read
- `ppi_write` - ALL - Admin write access (non-system presets)

### permission_presets (2 policies) 
- `pp_read` - SELECT - Authenticated users can read
- `pp_write` - ALL - Admin write access (non-system presets)

### permissions (3 policies)
- `Users can view permissions` - SELECT - Public read access
- `permissions_all_service_role` - ALL - Service role full access
- `permissions_select_admin_gm` - SELECT - Admin read access

### profiles (2 policies)
- `profiles_self_select` - SELECT - Self or admin access
- `profiles_self_update` - UPDATE - Self-only update access

### role_permission_presets (2 policies)
- `rpp_read` - SELECT - Users can read their role presets
- `rpp_write` - ALL - Admin write access

### role_permissions (3 policies)
- `Users can view role permissions` - SELECT - Public read access  
- `role_permissions_all_service_role` - ALL - Service role full access
- `role_permissions_select_admin_gm` - SELECT - Admin read access

### roles (3 policies)
- `Users can view roles` - SELECT - Public read access
- `roles_all_service_role` - ALL - Service role full access
- `roles_select_admin_gm` - SELECT - Admin read access

### system_banners (1 policy)
- `sb_admin_all` - ALL - Admin-only access

### user_job_tags (2 policies)
- `ujt_admin_write` - ALL - Admin write access
- `ujt_select_self_or_admin` - SELECT - Self or admin read access

### user_permissions (3 policies)
- `Users can view their own permissions` - SELECT - Self access
- `Users with assign_roles permission can manage permissions` - ALL - assign_roles permission
- `Users with manage_users permission can view all permissions` - SELECT - manage_users or assign_roles permission

### user_profiles (5 policies)
- `System can insert user profiles` - INSERT - Public insert (system)
- `Users can update their own profile` - UPDATE - Self update
- `Users can view their own profile` - SELECT - Self read
- `Users with manage_users permission can update profiles` - UPDATE - manage_users permission
- `Users with manage_users permission can view all profiles` - SELECT - manage_users or view_users permission

### user_roles_locations (5 policies)
- `URL delete by assign_roles` - DELETE - assign_roles permission
- `URL insert by assign_roles` - INSERT - assign_roles permission  
- `URL select by permission` - SELECT - view_users, manage_users, or assign_roles permission
- `URL update by assign_roles` - UPDATE - assign_roles permission
- `Users can view their own role assignments` - SELECT - Self access

## Critical Security Notes

### ⚠️ **ATTENTION REQUIRED**
1. **locations_select_all** policy allows public read access to ALL locations
2. Multiple tables have public read access (permissions, roles, role_permissions)
3. Complex nested queries in invitation-related policies may impact performance

### Security Pattern Analysis
- **Admin Gates**: Most administrative operations properly gated by `jwt_is_admin()`
- **Permission Checks**: Complex permission verification using `user_has_permission()` 
- **Self-Access**: Proper user isolation using `auth.uid() = user_id` pattern
- **Service Role**: Dedicated service_role policies for system operations

### Multi-Tenant Readiness Assessment
- **Current State**: Single-tenant with location-scoped permissions
- **Migration Impact**: Will need org_id context in most policies
- **Critical Dependencies**: Functions like `jwt_is_admin()` and `user_has_permission()`