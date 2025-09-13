# RLS Policies Detailed Report

**Generated on:** $(date +"%Y-%m-%d %H:%M:%S")  
**Database Schema:** public

## Executive Summary

| Metric | Count |
|--------|-------|
| **Total RLS Policies** | **62** |
| **Tables with RLS Enabled** | **23** |
| **Tables with RLS Disabled** | **0** |

## Operation Type Breakdown

| Operation | Count | Percentage |
|-----------|-------|------------|
| SELECT | 29 | 46.8% |
| ALL (CRUD) | 18 | 29.0% |
| UPDATE | 6 | 9.7% |
| INSERT | 5 | 8.1% |
| DELETE | 4 | 6.5% |

## Tables by Policy Count

### High-Complexity Tables (4+ policies)
| Table | Policies | RLS Status | Primary Use Case |
|-------|----------|------------|------------------|
| `locations` | 6 | ✅ ENABLED | Location management with admin/manager access |
| `user_profiles` | 5 | ✅ ENABLED | User profile data with self/admin access |
| `user_roles_locations` | 5 | ✅ ENABLED | Role assignments per location |
| `memberships` | 4 | ✅ ENABLED | **🆕 ORG LAYER** - Organization membership |

### Medium-Complexity Tables (3 policies)
| Table | Policies | RLS Status | Purpose |
|-------|----------|------------|---------|
| `location_admins` | 3 | ✅ ENABLED | Location manager assignments |
| `permissions` | 3 | ✅ ENABLED | Permission definitions |
| `role_permissions` | 3 | ✅ ENABLED | Role-permission mappings |
| `roles` | 3 | ✅ ENABLED | Role definitions |
| `user_permissions` | 3 | ✅ ENABLED | User-specific permission overrides |

### Standard Tables (2 policies)
| Table | Policies | RLS Status | Notes |
|-------|----------|------------|-------|
| `organizations` | 2 | ✅ ENABLED | **🆕 ORG LAYER** - Organization data |
| `organization_domains` | 2 | ✅ ENABLED | **🆕 ORG LAYER** - Domain mappings |
| `app_settings` | 2 | ✅ ENABLED | Application configuration |
| `invitation_job_tags` | 2 | ✅ ENABLED | Job tag assignments in invitations |
| `invitation_permissions` | 2 | ✅ ENABLED | Permission overrides in invitations |
| `invitation_roles_locations` | 2 | ✅ ENABLED | Role-location mappings in invitations |
| `invitations` | 2 | ✅ ENABLED | User invitation system |
| `job_tags` | 2 | ✅ ENABLED | Job tag definitions |
| `permission_preset_items` | 2 | ✅ ENABLED | Permission preset compositions |
| `permission_presets` | 2 | ✅ ENABLED | Permission preset definitions |
| `profiles` | 2 | ✅ ENABLED | Legacy profile table |
| `role_permission_presets` | 2 | ✅ ENABLED | Role-preset mappings |
| `user_job_tags` | 2 | ✅ ENABLED | User job tag assignments |

### Simple Tables (1 policy)
| Table | Policies | RLS Status | Purpose |
|-------|----------|------------|---------|
| `system_banners` | 1 | ✅ ENABLED | System-wide banner messages |

## 🆕 New Organization Layer Analysis

The recent migration added **3 new tables** with **8 total policies**:

### `organizations` (2 policies)
- `org_select` - Platform admins or org admins can view
- `org_iud` - Platform admins or org admins can manage (INSERT/UPDATE/DELETE)

### `organization_domains` (2 policies)  
- `orgdom_select` - Platform admins or org admins can view
- `orgdom_iud` - Platform admins or org admins can manage (INSERT/UPDATE/DELETE)

### `memberships` (4 policies)
- `memb_select` - Platform admins, org admins, or users can view their own membership
- `memb_insert` - Platform admins or org admins can add memberships
- `memb_update` - Platform admins or org admins can modify memberships  
- `memb_delete` - Platform admins or org admins can remove memberships

## Key Policy Patterns

### 1. Admin-Only Access
- **Tables:** `app_settings`, `system_banners`, `job_tags`
- **Pattern:** `jwt_is_admin()` for full access

### 2. Self + Admin Access  
- **Tables:** `user_profiles`, `profiles`, `location_admins`
- **Pattern:** `(auth.uid() = user_id) OR jwt_is_admin()`

### 3. Permission-Based Access
- **Tables:** `invitations`, `user_permissions`, `user_roles_locations`
- **Pattern:** Complex permission checks via `user_has_permission()`

### 4. 🆕 Organization-Scoped Access
- **Tables:** `organizations`, `organization_domains`, `memberships`
- **Pattern:** `is_platform_admin() OR user_is_org_admin(org_id)`

### 5. Location-Scoped Access
- **Tables:** `locations`, `user_roles_locations`
- **Pattern:** Location-specific access via role assignments

## Security Analysis

### ✅ Strengths
- **100% RLS Coverage:** All 23 tables have RLS enabled
- **Defense in Depth:** Multiple access patterns prevent unauthorized access
- **Granular Control:** Permission-based access for sensitive operations
- **Multi-tenancy Ready:** New org layer provides tenant isolation

### ⚠️ Considerations
- **Complex Permission Logic:** Some policies have intricate JOIN conditions
- **Performance Impact:** 62 policies may affect query performance
- **Maintenance Overhead:** Complex policies require careful updates

## Migration Impact

The Step-1 org layer migration successfully added **8 new policies** across **3 new tables**, implementing:

- ✅ Platform admin super-user access
- ✅ Organization admin scoped access
- ✅ Self-service membership visibility
- ✅ Proper tenant isolation

## Recommendations

1. **Monitor Performance:** Track query execution times for policy-heavy tables
2. **Regular Audits:** Review policies quarterly for security and efficiency
3. **Documentation:** Maintain policy documentation for complex access patterns
4. **Testing:** Verify policy behavior with different user roles and contexts

---

**Report Status:** ✅ Complete  
**Total Policies Analyzed:** 62  
**Security Coverage:** 100% (All tables protected)