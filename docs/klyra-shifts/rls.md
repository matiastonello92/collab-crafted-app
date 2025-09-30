# Klyra Shifts - RLS Policies Documentation

## Overview

This document describes the Row-Level Security (RLS) policies implemented for the Klyra Shifts module, ensuring multi-tenant isolation and role-based access control.

## Core RLS Functions

All policies leverage these existing security functions:

- `is_platform_admin()` - Global admin bypass
- `user_in_org(org_id)` - Multi-tenant org isolation
- `user_in_location(location_id)` - Location-based access
- `user_has_permission(user_id, permission_name)` - Permission-based access

## Permission Tags

### Shifts Module Permissions

| Permission | Display Name | Category | Description |
|------------|--------------|----------|-------------|
| `shifts:view` | View Shifts | shifts | View shift schedules and assignments |
| `shifts:create` | Create Shifts | shifts | Create new shifts in rotas |
| `shifts:assign` | Assign Shifts | shifts | Assign shifts to staff members |
| `shifts:manage` | Manage Shifts | shifts | Full shift management (create, edit, delete, assign) |
| `shifts:approve` | Approve Timesheets | shifts | Approve and validate timesheets |
| `rotas:publish` | Publish Rotas | shifts | Publish draft rotas to make them visible to staff |
| `leave:manage` | Manage Leave Requests | shifts | Approve, reject, and manage staff leave requests |
| `timeclock:manage` | Manage Time Clock | shifts | View and edit time clock events for staff |

### Role → Permission Mapping

| Role | Permissions |
|------|-------------|
| **Platform Admin** | All permissions (bypass) |
| **Org Admin** | All permissions within organization |
| **Manager** | `shifts:manage`, `shifts:assign`, `rotas:publish`, `leave:manage`, `timeclock:manage` (location-scoped) |
| **Base User** | `shifts:view` (self + published), self-service on availability/leave |

## Table-by-Table Policies

### 1. `rotas` - Schedule Templates

#### SELECT Policy: `rotas_select`
```sql
-- Platform Admin: full access
-- Managers with shifts:manage: see all rotas in org
-- Base users: only published rotas in their accessible locations
CREATE POLICY "rotas_select" ON public.rotas
FOR SELECT USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND (
      user_has_permission(auth.uid(), 'shifts:manage')
      OR (status = 'published' AND user_in_location(location_id))
    )
  )
);
```

#### INSERT Policy: `rotas_insert`
```sql
-- Platform Admin or users with shifts:manage permission
CREATE POLICY "rotas_insert" ON public.rotas
FOR INSERT WITH CHECK (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'shifts:manage')
  )
);
```

#### UPDATE Policy: `rotas_update`
```sql
-- Same as INSERT
CREATE POLICY "rotas_update" ON public.rotas
FOR UPDATE USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'shifts:manage')
  )
);
```

#### DELETE Policy: `rotas_delete`
```sql
-- Platform Admin only
CREATE POLICY "rotas_delete" ON public.rotas
FOR DELETE USING (is_platform_admin());
```

---

### 2. `shifts` - Individual Work Shifts

#### SELECT Policy: `shifts_select`
```sql
-- Platform Admin: full access
-- Managers with shifts:manage: see all shifts in org
-- Base users: see shifts assigned to them OR published shifts in their location
CREATE POLICY "shifts_select" ON public.shifts
FOR SELECT USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND (
      user_has_permission(auth.uid(), 'shifts:manage')
      OR (
        user_in_location(location_id)
        AND (
          EXISTS (
            SELECT 1 FROM public.shift_assignments sa
            WHERE sa.shift_id = shifts.id
            AND sa.user_id = auth.uid()
            AND sa.status IN ('assigned', 'accepted')
          )
          OR EXISTS (
            SELECT 1 FROM public.rotas r
            WHERE r.id = shifts.rota_id
            AND r.status = 'published'
          )
        )
      )
    )
  )
);
```

#### INSERT/UPDATE/DELETE Policies
All require `shifts:manage` permission within organization and location.

---

### 3. `shift_assignments` - Staff Assignment to Shifts

#### SELECT Policy: `shift_assignments_select`
```sql
-- Platform Admin, Managers, or self (user sees their own assignments)
CREATE POLICY "shift_assignments_select" ON public.shift_assignments
FOR SELECT USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.shifts s
    WHERE s.id = shift_assignments.shift_id
    AND user_in_org(s.org_id)
    AND user_has_permission(auth.uid(), 'shifts:manage')
  )
);
```

#### INSERT/UPDATE Policies
Require `shifts:assign` permission or self-update for status changes (e.g., accepting shifts).

#### DELETE Policy
`shifts:manage` permission only.

---

### 4. `availability` - User Availability Preferences

**Self-service table**: Users manage their own availability.

#### SELECT Policy
```sql
-- Users see their own availability, managers with shifts:manage see all
CREATE POLICY "availability_select" ON public.availability
FOR SELECT USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:manage'))
);
```

#### INSERT/UPDATE/DELETE Policies
Users can manage their own records, managers can manage all within org.

---

### 5. `leave_types` - Leave Categories

#### SELECT Policy
```sql
-- All authenticated users in org can view leave types
CREATE POLICY "leave_types_select" ON public.leave_types
FOR SELECT USING (
  is_platform_admin() OR user_in_org(org_id)
);
```

#### INSERT/UPDATE/DELETE Policies
Require `leave:manage` permission.

---

### 6. `leave_requests` - Staff Leave Requests

#### SELECT Policy
```sql
-- Users see their own requests, managers with leave:manage see all
CREATE POLICY "leave_requests_select" ON public.leave_requests
FOR SELECT USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'leave:manage'))
);
```

#### INSERT Policy
Users can create their own leave requests.

#### UPDATE Policy
Users can edit pending requests, managers with `leave:manage` can approve/reject.

#### DELETE Policy
Users can delete pending requests, managers can delete any.

---

### 7. `time_clock_events` - Clock In/Out Events

**Immutable audit log**: No updates or deletes.

#### SELECT Policy
```sql
-- Users see their own events, managers with timeclock:manage see all
CREATE POLICY "time_clock_events_select" ON public.time_clock_events
FOR SELECT USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR (
    user_in_org(org_id) 
    AND user_in_location(location_id)
    AND user_has_permission(auth.uid(), 'timeclock:manage')
  )
);
```

#### INSERT Policy
Users can clock in/out for themselves, kiosks use service role.

---

### 8. `timesheets` - Aggregated Time Records

#### SELECT Policy
```sql
-- Users see their own timesheets, managers with shifts:approve see all
CREATE POLICY "timesheets_select" ON public.timesheets
FOR SELECT USING (
  is_platform_admin()
  OR user_id = auth.uid()
  OR (user_in_org(org_id) AND user_has_permission(auth.uid(), 'shifts:approve'))
);
```

#### INSERT Policy
System-generated, requires `shifts:manage` permission.

#### UPDATE Policy
Only managers with `shifts:approve` can approve timesheets.

#### DELETE Policy
Platform Admin only.

---

## Testing RLS Policies

### Test Setup

Create three test users with different roles:

```sql
-- Assuming organizations and locations exist
-- User 1: Platform Admin
-- User 2: Manager at Location A with shifts:manage permission
-- User 3: Base User at Location A with no special permissions
```

### Test Scenarios

#### Scenario 1: Rotas Visibility

| User Type | Draft Rota | Published Rota | Other Org Rota |
|-----------|------------|----------------|----------------|
| Platform Admin | ✅ | ✅ | ✅ |
| Manager (Location A) | ✅ | ✅ | ❌ |
| Base User (Location A) | ❌ | ✅ | ❌ |

#### Scenario 2: Shifts Visibility

| User Type | Own Assigned Shift | Published Shift | Draft Shift | Other User's Shift |
|-----------|-------------------|-----------------|-------------|-------------------|
| Platform Admin | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ✅ | ✅ |
| Base User | ✅ | ✅ | ❌ | ❌* |

*Base users can see published shifts in their location, but not draft shifts or shifts assigned to others (unless in same published rota).

#### Scenario 3: Leave Request Management

| User Type | Create Own | View Own | Approve Own | View Others | Approve Others |
|-----------|-----------|----------|-------------|-------------|----------------|
| Platform Admin | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manager | ✅ | ✅ | ❌ | ✅ | ✅ |
| Base User | ✅ | ✅ | ❌ | ❌ | ❌ |

---

## Security Considerations

### Multi-Tenant Isolation
- All tables include `org_id` for tenant isolation
- `user_in_org()` function prevents cross-organization data leaks
- Location-scoped permissions use `user_in_location()` for additional granularity

### Principle of Least Privilege
- Base users have minimal read access (self + published)
- Managers have location-scoped permissions
- Platform Admins have full access but actions are auditable

### Performance Optimization
- Indices on `(org_id, location_id, week_start_date)` for rotas
- Indices on `(user_id, weekday)` for availability
- Indices on `(rota_id)` and `(location_id, start_at)` for shifts

### Audit Trail
- `time_clock_events` table is immutable (no UPDATE/DELETE)
- All tables include `created_at`, `updated_at` timestamps
- `created_by`, `updated_by` fields track changes

---

## Migration History

| Date | Migration | Description |
|------|-----------|-------------|
| 2025-09-30 | `20250930195655_...sql` | Initial schema: 8 tables, 32 RLS policies, 5 permissions |
| 2025-01-30 | `20250930202228_...sql` | Refined RLS policies, added 3 missing permissions |

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL RLS Documentation](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Klyra Platform Permission System](../RBAC_INTEGRITY_REPORT.md)
