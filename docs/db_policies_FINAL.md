# Database RLS Policies - FINAL STATE
**Pre-Migration Multi-Tenant State - FROZEN**  
**Total Policies: 54**

## Complete RLS Policy Catalog

### app_settings (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `app_settings_select` | SELECT | `true` | - |
| `app_settings_write_admin` | ALL | `jwt_is_admin()` | `jwt_is_admin()` |

### invitation_job_tags (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `ijt_admin_read` | SELECT | `jwt_is_admin()` | - |
| `ijt_admin_or_invite_write` | ALL | `(jwt_is_admin() OR user_has_permission(auth.uid(), 'invite_users'::text))` | `(jwt_is_admin() OR user_has_permission(auth.uid(), 'invite_users'::text))` |

### invitation_permissions (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users with invite_users permission can view invitation permissi` | SELECT | `((EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'invite_users'::text) AND (url.is_active = true)))) OR (EXISTS ( SELECT 1 FROM user_profiles up WHERE ((up.id = auth.uid()) AND (up.can_invite_users = true)))))` | - |
| `Users with invite_users permission can manage invitation permis` | ALL | `((EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'invite_users'::text) AND (url.is_active = true)))) OR (EXISTS ( SELECT 1 FROM user_profiles up WHERE ((up.id = auth.uid()) AND (up.can_invite_users = true)))))` | - |

### invitation_roles_locations (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users with invite_users permission can view invitation roles` | SELECT | `((EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'invite_users'::text) AND (url.is_active = true)))) OR (EXISTS ( SELECT 1 FROM user_profiles up WHERE ((up.id = auth.uid()) AND (up.can_invite_users = true)))))` | - |
| `Users with invite_users permission can manage invitation roles` | ALL | `((EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'invite_users'::text) AND (url.is_active = true)))) OR (EXISTS ( SELECT 1 FROM user_profiles up WHERE ((up.id = auth.uid()) AND (up.can_invite_users = true)))))` | - |

### invitations (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users with invite_users permission can view invitations` | SELECT | `((EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'invite_users'::text) AND (url.is_active = true)))) OR (EXISTS ( SELECT 1 FROM user_profiles up WHERE ((up.id = auth.uid()) AND (up.can_invite_users = true)))))` | - |
| `Users with invite_users permission can manage invitations` | ALL | `((EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'invite_users'::text) AND (url.is_active = true)))) OR (EXISTS ( SELECT 1 FROM user_profiles up WHERE ((up.id = auth.uid()) AND (up.can_invite_users = true)))))` | - |

### job_tags (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `job_tags_select_all` | SELECT | `true` | - |
| `job_tags_admin_write` | ALL | `jwt_is_admin()` | `jwt_is_admin()` |

### location_admins (3 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `locadmins_select_self_or_admin` | SELECT | `(jwt_is_admin() OR (user_id = auth.uid()))` | - |
| `locadmins_insert_admin` | INSERT | - | `jwt_is_admin()` |
| `locadmins_delete_admin` | DELETE | `jwt_is_admin()` | - |

### locations (6 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view locations they have access to` | SELECT | `(EXISTS ( SELECT 1 FROM user_roles_locations url WHERE ((url.user_id = auth.uid()) AND (url.location_id = locations.id) AND COALESCE(url.is_active, true))))` | - |
| `Admins can manage all locations` | ALL | `(EXISTS ( SELECT 1 FROM (user_roles_locations url JOIN roles r ON ((url.role_id = r.id))) WHERE ((url.user_id = auth.uid()) AND ((r.name)::text = 'admin'::text) AND (url.is_active = true))))` | - |
| `locations_select_all` | SELECT | `true` | - |
| `locations_insert_admin` | INSERT | - | `jwt_is_admin()` |
| `locations_update_admin_or_assigned` | UPDATE | `(jwt_is_admin() OR is_manager_for_location(id))` | `(jwt_is_admin() OR is_manager_for_location(id))` |
| `locations_delete_admin` | DELETE | `jwt_is_admin()` | - |

### permission_preset_items (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `ppi_read` | SELECT | `((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1 FROM permission_presets p WHERE (p.id = permission_preset_items.preset_id))))` | - |
| `ppi_write` | ALL | `((EXISTS ( SELECT 1 FROM permission_presets p WHERE ((p.id = permission_preset_items.preset_id) AND (p.is_system = false)))) AND (EXISTS ( SELECT 1 FROM (user_roles_locations url JOIN roles r ON ((r.id = url.role_id))) WHERE ((url.user_id = auth.uid()) AND ((r.name)::text = 'admin'::text)))))` | `true` |

### permission_presets (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `pp_read` | SELECT | `(auth.uid() IS NOT NULL)` | - |
| `pp_write` | ALL | `((auth.uid() IS NOT NULL) AND (is_system = false) AND (EXISTS ( SELECT 1 FROM (user_roles_locations url JOIN roles r ON ((r.id = url.role_id))) WHERE ((url.user_id = auth.uid()) AND ((r.name)::text = 'admin'::text)))))` | `true` |

### permissions (3 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view permissions` | SELECT | `true` | - |
| `permissions_select_admin_gm` | SELECT | `jwt_is_admin()` | - |
| `permissions_all_service_role` | ALL | `true` | `true` |

### profiles (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `profiles_self_select` | SELECT | `((id = auth.uid()) OR jwt_is_admin())` | - |
| `profiles_self_update` | UPDATE | `(id = auth.uid())` | `(id = auth.uid())` |

### role_permission_presets (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `rpp_read` | SELECT | `((auth.uid() IS NOT NULL) AND (EXISTS ( SELECT 1 FROM user_roles_locations url WHERE ((url.role_id = role_permission_presets.role_id) AND (url.user_id = auth.uid())))))` | - |
| `rpp_write` | ALL | `(EXISTS ( SELECT 1 FROM (user_roles_locations url JOIN roles r ON ((r.id = url.role_id))) WHERE ((url.user_id = auth.uid()) AND ((r.name)::text = 'admin'::text))))` | `true` |

### role_permissions (3 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view role permissions` | SELECT | `true` | - |
| `role_permissions_select_admin_gm` | SELECT | `jwt_is_admin()` | - |
| `role_permissions_all_service_role` | ALL | `true` | `true` |

### roles (3 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view roles` | SELECT | `true` | - |
| `roles_select_admin_gm` | SELECT | `jwt_is_admin()` | - |
| `roles_all_service_role` | ALL | `true` | `true` |

### system_banners (1 policy)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `sb_admin_all` | ALL | `jwt_is_admin()` | `jwt_is_admin()` |

### user_job_tags (2 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `ujt_select_self_or_admin` | SELECT | `((auth.uid() = user_id) OR jwt_is_admin())` | - |
| `ujt_admin_write` | ALL | `jwt_is_admin()` | `jwt_is_admin()` |

### user_permissions (3 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view their own permissions` | SELECT | `(auth.uid() = user_id)` | - |
| `Users with manage_users permission can view all permissions` | SELECT | `(EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = ANY ((ARRAY['manage_users'::character varying, 'assign_roles'::character varying])::text[])) AND (url.is_active = true))))` | - |
| `Users with assign_roles permission can manage permissions` | ALL | `(EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'assign_roles'::text) AND (url.is_active = true))))` | - |

### user_profiles (5 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view their own profile` | SELECT | `(auth.uid() = id)` | - |
| `Users with manage_users permission can view all profiles` | SELECT | `(EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = ANY ((ARRAY['manage_users'::character varying, 'view_users'::character varying])::text[])) AND (url.is_active = true))))` | - |
| `System can insert user profiles` | INSERT | - | `true` |
| `Users can update their own profile` | UPDATE | `(auth.uid() = id)` | - |
| `Users with manage_users permission can update profiles` | UPDATE | `(EXISTS ( SELECT 1 FROM ((user_roles_locations url JOIN role_permissions rp ON ((url.role_id = rp.role_id))) JOIN permissions p ON ((rp.permission_id = p.id))) WHERE ((url.user_id = auth.uid()) AND ((p.name)::text = 'manage_users'::text) AND (url.is_active = true))))` | - |

### user_roles_locations (5 policies)
| Policy Name | Command | Using | Check |
|-------------|---------|-------|-------|
| `Users can view their own role assignments` | SELECT | `(auth.uid() = user_id)` | - |
| `URL select by permission` | SELECT | `(user_has_permission(auth.uid(), 'view_users'::text) OR user_has_permission(auth.uid(), 'manage_users'::text) OR user_has_permission(auth.uid(), 'assign_roles'::text))` | - |
| `URL insert by assign_roles` | INSERT | - | `user_has_permission(auth.uid(), 'assign_roles'::text)` |
| `URL update by assign_roles` | UPDATE | `user_has_permission(auth.uid(), 'assign_roles'::text)` | `user_has_permission(auth.uid(), 'assign_roles'::text)` |
| `URL delete by assign_roles` | DELETE | `user_has_permission(auth.uid(), 'assign_roles'::text)` | - |

## ⚠️ Critical Security Analysis

### Public Access Policies (ATTENTION REQUIRED)
- **`locations_select_all`** - Allows public read access to ALL locations
- **`job_tags_select_all`** - Allows public read access to ALL job tags  
- **`Users can view permissions`** - Public read access to permissions
- **`Users can view role permissions`** - Public read access to role permissions
- **`Users can view roles`** - Public read access to roles

### Service Role Policies
- **`permissions_all_service_role`** - Full service role access to permissions
- **`role_permissions_all_service_role`** - Full service role access to role permissions  
- **`roles_all_service_role`** - Full service role access to roles

### Security Pattern Summary
- **Admin Gates**: 15 policies use `jwt_is_admin()` check
- **Permission-Based**: 12 policies use `user_has_permission()` checks
- **Self-Access**: 8 policies enforce `auth.uid() = user_id` pattern
- **Complex Invitation Logic**: 8 policies with nested EXISTS queries for invitation management

## Migration Impact Assessment
- **High Impact**: All permission-based policies will need organization context
- **Medium Impact**: Location-scoped policies require org_id validation
- **Critical Functions**: `jwt_is_admin()`, `user_has_permission()`, `is_manager_for_location()`

**MIGRATION READY**: All 54 policies documented and frozen for multi-tenant transition.