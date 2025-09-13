# Database Functions - FINAL STATE
**Pre-Migration Multi-Tenant State - FROZEN**  
**Total Functions: 20**

## Complete Database Function Catalog

### Core Authentication Functions

#### 1. `public.jwt()`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE  
- **Search Path**: search_path=public
- **Return Type**: jsonb
- **Purpose**: Extract JWT claims as JSONB from request context
- **Critical**: Core security function used across RLS policies

#### 2. `public.jwt_is_admin()`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: search_path=public  
- **Return Type**: boolean
- **Purpose**: Check if current JWT has admin privileges
- **Usage**: Used in 15+ RLS policies for admin access control

#### 3. `public.jwt_has_permission(perm text)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: search_path=public
- **Return Type**: boolean  
- **Purpose**: Check if current JWT has specific permission
- **Usage**: Permission verification in RLS policies

#### 4. `public.user_is_admin(p_user uuid)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: search_path=public
- **Return Type**: boolean
- **Purpose**: Check if specific user has admin role
- **Logic**: Queries user_roles_locations for 'admin' role

#### 5. `public.user_has_permission(p_user uuid, p_permission text)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: search_path=public
- **Return Type**: boolean
- **Purpose**: Check if user has specific permission
- **Usage**: Extensively used in RLS policies for permission-based access
- **Logic**: Checks admin status OR role permissions OR direct user permissions

### Location Management Functions

#### 6. `public.is_manager_for_location(loc_id uuid)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: search_path=public
- **Return Type**: boolean
- **Purpose**: Check if current user is manager for specific location
- **Usage**: Used in locations UPDATE policy

#### 7. `public.admin_assign_manager(loc_id uuid, target_email text)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: void
- **Purpose**: Assign manager role to location
- **Admin Check**: Built-in `jwt_is_admin()` verification
- **Logic**: Looks up user by email, inserts into location_admins

#### 8. `public.admin_remove_manager(loc_id uuid, target_email text)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: void
- **Purpose**: Remove manager from location
- **Admin Check**: Built-in `jwt_is_admin()` verification

#### 9. `public.admin_list_location_admins(loc_id uuid)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: TABLE(user_id uuid, email text, created_at timestamptz)
- **Purpose**: List all managers for a location
- **Usage**: Admin interface for location management

#### 10. `public.locations_restrict_manager_updates()`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: trigger
- **Purpose**: Trigger function to restrict manager update permissions
- **Scope**: Allows managers to only update opening_hours and open_days
- **Logic**: Complex field-by-field change detection

### Invitation System Functions

#### 11. `public.invitation_create_v2(...)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: invitations
- **Purpose**: Create invitation with role assignments and permission overrides
- **Permission Check**: Requires admin or invite_users permission
- **Features**: Supports job tags, permission overrides, multi-location assignments

#### 12. `public.invitation_validate_v2(p_token text)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: TABLE(email, role_name, location_ids, overrides, expires_at, is_valid)
- **Purpose**: Validate invitation token and return details
- **Logic**: Comprehensive validation (not revoked, not accepted, not expired)

#### 13. `public.invitation_accept_v2(p_token text)` **[RECENTLY HOTFIXED]**
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: json
- **Purpose**: Accept invitation and assign roles/permissions
- **Status**: Recently hotfixed for variable naming conflicts
- **Features**: Role assignment, permission overrides, job tag assignment, manager promotion

### Profile Management Functions

#### 14. `public.profile_update_self(...)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: profiles
- **Purpose**: Update user's own profile with multiple optional fields
- **Auth Check**: Requires authentication via `auth.uid()`
- **Features**: Supports full_name, avatar_url, phone, locale, timezone, marketing_opt_in, notif_prefs

### Utility Functions

#### 15. `public.permission_id_by_name(p_name text)`
- **Security**: SECURITY INVOKER
- **Volatility**: STABLE
- **Search Path**: search_path=public
- **Return Type**: uuid
- **Purpose**: Lookup permission ID by name
- **Usage**: Helper for invitation and permission management

#### 16. `public.job_tag_id_by_name(p_name text)`
- **Security**: SECURITY INVOKER
- **Volatility**: STABLE
- **Search Path**: search_path=public
- **Return Type**: uuid
- **Purpose**: Lookup job tag ID by name
- **Usage**: Helper for job tag assignment in invitations

### Trigger Functions

#### 17. `public.tg_touch_updated_at()`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: trigger
- **Purpose**: Generic trigger to update updated_at timestamp
- **Usage**: Automated timestamp maintenance

#### 18. `public.touch_updated_at()`
- **Security**: SECURITY INVOKER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: trigger
- **Purpose**: Alternative timestamp update trigger
- **Note**: Duplicate functionality with tg_touch_updated_at

#### 19. `public.update_updated_at_column()`
- **Security**: SECURITY INVOKER
- **Volatility**: VOLATILE
- **Search Path**: search_path=public
- **Return Type**: trigger
- **Purpose**: Standard updated_at column trigger
- **Note**: Third variant of timestamp triggers - consolidation opportunity

## Security Analysis

### SECURITY DEFINER Functions (High Privilege)
**Count**: 14/20 functions run with creator privileges

**Critical Security Functions**:
1. `jwt_is_admin()` - Core admin check used in 15+ RLS policies
2. `user_has_permission()` - Permission verification engine  
3. `invitation_accept_v2()` - **Recently hotfixed** - critical for onboarding
4. `locations_restrict_manager_updates()` - Complex access control logic

### SECURITY INVOKER Functions (User Context)
**Count**: 6/20 functions run with caller privileges
- Primarily utility functions (permission_id_by_name, job_tag_id_by_name)
- Trigger functions (touch_updated_at variants)

### Multi-Tenant Migration Impact

#### High Impact Functions (Require org_id Context)
- `user_has_permission()` - Need org-scoped permission checks
- `user_is_admin()` - Need org-scoped admin verification
- `invitation_create_v2()` - Need org context for invitations
- `invitation_accept_v2()` - Need org validation during acceptance

#### Medium Impact Functions (May Need org Scoping)
- `admin_assign_manager()` - Location management within orgs
- `admin_remove_manager()` - Location management within orgs
- `is_manager_for_location()` - Org-scoped location management

#### Low Impact Functions (Likely Unchanged)
- Utility functions (`permission_id_by_name`, `job_tag_id_by_name`)
- Trigger functions (timestamp updates)
- JWT extraction functions

### Function Dependencies
- Heavy reliance on `auth.uid()` for user identification
- Cross-function calls (e.g., permission_id_by_name used in invitation_create_v2)
- Integration with auth.users table for email lookups
- Complex RLS policy integration

## Critical Notes for Migration
1. **invitation_accept_v2** was recently hotfixed for variable naming conflicts - test thoroughly
2. Multiple trigger functions with similar purposes - consolidation opportunity during migration
3. No organization context in current function signatures - all will require signature updates
4. Functions are core to the permission system - comprehensive testing required during migration

**MIGRATION READY**: All 20 functions documented and frozen for multi-tenant transition.