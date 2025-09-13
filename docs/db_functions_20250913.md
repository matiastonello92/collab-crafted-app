# Database Functions Snapshot - 2025-09-13

**Pre-Migration Multi-Tenant State**

Total Functions: **20**

## Function Catalog

### Authentication & Authorization Functions

#### 1. `jwt_is_admin()`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE  
- **Search Path**: public
- **Purpose**: Check if current JWT has admin privileges
- **Returns**: boolean
- **Critical**: Core security function used across multiple RLS policies

#### 2. `user_has_permission(p_user uuid, p_permission text)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: public  
- **Purpose**: Check if user has specific permission
- **Returns**: boolean
- **Usage**: Extensively used in RLS policies for permission-based access

#### 3. `user_is_admin(p_user uuid)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: public
- **Purpose**: Check if specific user has admin role
- **Returns**: boolean

#### 4. `jwt_has_permission(perm text)`
- **Security**: SECURITY DEFINER  
- **Volatility**: STABLE
- **Search Path**: public
- **Purpose**: Check if current JWT has specific permission
- **Returns**: boolean

#### 5. `jwt()`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: public
- **Purpose**: Extract JWT claims as JSONB
- **Returns**: jsonb

### Location Management Functions

#### 6. `admin_assign_manager(loc_id uuid, target_email text)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Assign manager role to location
- **Returns**: void
- **Admin Check**: Built-in admin verification

#### 7. `admin_remove_manager(loc_id uuid, target_email text)`  
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Remove manager from location
- **Returns**: void
- **Admin Check**: Built-in admin verification

#### 8. `admin_list_location_admins(loc_id uuid)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE  
- **Search Path**: public
- **Purpose**: List all managers for a location
- **Returns**: TABLE(user_id uuid, email text, created_at timestamptz)

#### 9. `is_manager_for_location(loc_id uuid)`
- **Security**: SECURITY DEFINER
- **Volatility**: STABLE
- **Search Path**: public
- **Purpose**: Check if current user is manager for specific location  
- **Returns**: boolean

#### 10. `locations_restrict_manager_updates()`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Trigger function to restrict manager update permissions
- **Returns**: trigger
- **Scope**: Allows managers to only update opening_hours and open_days

### Invitation System Functions

#### 11. `invitation_create_v2(p_email text, p_role_id uuid, p_location_ids uuid[], p_days integer, p_overrides jsonb)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Create invitation with role assignments and permission overrides
- **Returns**: invitations record
- **Permission Check**: Requires admin or invite_users permission

#### 12. `invitation_validate_v2(p_token text)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE  
- **Search Path**: public
- **Purpose**: Validate invitation token and return details
- **Returns**: TABLE(email, role_name, location_ids, overrides, expires_at, is_valid)

#### 13. `invitation_accept_v2(p_token text)` **[HOTFIXED]**
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Accept invitation and assign roles/permissions
- **Returns**: json
- **Status**: Recently hotfixed for variable naming conflicts

### Profile & User Management Functions

#### 14. `profile_update_self(...)`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public  
- **Purpose**: Update user's own profile with multiple optional fields
- **Returns**: profiles record
- **Auth Check**: Requires authentication

### Utility Functions

#### 15. `permission_id_by_name(p_name text)`
- **Security**: Not specified
- **Volatility**: STABLE
- **Search Path**: public
- **Purpose**: Lookup permission ID by name
- **Returns**: uuid

#### 16. `job_tag_id_by_name(p_name text)`
- **Security**: Not specified  
- **Volatility**: STABLE
- **Search Path**: public
- **Purpose**: Lookup job tag ID by name
- **Returns**: uuid

### Trigger Functions

#### 17. `tg_touch_updated_at()`
- **Security**: SECURITY DEFINER
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Generic trigger to update updated_at timestamp
- **Returns**: trigger

#### 18. `touch_updated_at()`
- **Security**: Not specified
- **Volatility**: VOLATILE  
- **Search Path**: public
- **Purpose**: Alternative timestamp update trigger
- **Returns**: trigger

#### 19. `update_updated_at_column()`
- **Security**: Not specified
- **Volatility**: VOLATILE
- **Search Path**: public
- **Purpose**: Standard updated_at column trigger
- **Returns**: trigger

## Security Analysis

### SECURITY DEFINER Functions (High Privilege)
- **Count**: 14/20 functions
- **Pattern**: Most auth/admin functions use SECURITY DEFINER
- **Risk**: Functions run with creator privileges, bypassing RLS

### Key Security Functions
1. `jwt_is_admin()` - Core admin check used in 15+ RLS policies  
2. `user_has_permission()` - Permission verification engine
3. `invitation_accept_v2()` - **Recently hotfixed** - critical for onboarding

### Multi-Tenant Migration Impact
- **High Impact**: All auth functions will need org_id context
- **Medium Impact**: Location management functions may need org scoping
- **Low Impact**: Utility and trigger functions likely unchanged

### Function Dependencies  
- Heavy reliance on `auth.uid()` for user identification
- Cross-function calls (e.g., permission_id_by_name used in invitation_create_v2)
- Integration with auth.users table for email lookups

## Critical Notes
1. **invitation_accept_v2** was recently hotfixed for variable naming conflicts
2. Multiple trigger functions with similar purposes - consolidation opportunity
3. No organization context in current function signatures - will require migration
4. Functions are core to the permission system - test thoroughly during migration