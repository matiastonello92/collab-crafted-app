-- Migration: Complete Prompt 2 - RLS & Permissions Refinement
-- Description: Refine RLS policies for Base User restrictions and add missing permissions
-- Date: 2025-01-30

-- ============================================================================
-- PART 1: DROP EXISTING POLICIES TO BE REFINED
-- ============================================================================

-- Drop rotas policies that need refinement
DROP POLICY IF EXISTS "rotas_select" ON public.rotas;

-- Drop shifts policies that need refinement  
DROP POLICY IF EXISTS "shifts_select" ON public.shifts;

-- ============================================================================
-- PART 2: CREATE REFINED RLS POLICIES
-- ============================================================================

-- Rotas: Base users can only see published rotas in their accessible locations
CREATE POLICY "rotas_select" ON public.rotas
FOR SELECT USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND (
      -- Org Admin or Manager with shifts:manage can see all rotas
      user_has_permission(auth.uid(), 'shifts:manage')
      -- Base users only see published rotas in their locations
      OR (status = 'published' AND user_in_location(location_id))
    )
  )
);

-- Shifts: Base users can only see shifts assigned to them or published shifts in their location
CREATE POLICY "shifts_select" ON public.shifts
FOR SELECT USING (
  is_platform_admin()
  OR (
    user_in_org(org_id)
    AND (
      -- Managers with shifts:manage can see all shifts
      user_has_permission(auth.uid(), 'shifts:manage')
      -- Base users see shifts assigned to them or published shifts in their location
      OR (
        user_in_location(location_id)
        AND (
          -- Shifts assigned to the user
          EXISTS (
            SELECT 1 FROM public.shift_assignments sa
            WHERE sa.shift_id = shifts.id
            AND sa.user_id = auth.uid()
            AND sa.status IN ('assigned', 'accepted')
          )
          -- Or published shifts in rota visible to user
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

-- ============================================================================
-- PART 3: ADD MISSING PERMISSIONS
-- ============================================================================

-- Insert missing permission tags for all existing organizations
-- This ensures backward compatibility and multi-tenant isolation

-- rotas:publish - Permission to publish rotas (Managers+)
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'rotas:publish',
  'Publish Rotas',
  'shifts',
  'Publish draft rotas to make them visible to staff'
FROM public.organizations o
ON CONFLICT (org_id, name) DO NOTHING;

-- leave:manage - Permission to manage leave requests (Managers+)
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'leave:manage',
  'Manage Leave Requests',
  'shifts',
  'Approve, reject, and manage staff leave requests'
FROM public.organizations o
ON CONFLICT (org_id, name) DO NOTHING;

-- timeclock:manage - Permission to manage time clock events (Managers+)
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'timeclock:manage',
  'Manage Time Clock',
  'shifts',
  'View and edit time clock events for staff'
FROM public.organizations o
ON CONFLICT (org_id, name) DO NOTHING;

-- ============================================================================
-- VERIFICATION QUERIES (for manual testing)
-- ============================================================================

-- Verify all 8 permissions exist for each organization
-- Expected: 8 rows per organization (shifts:view, shifts:create, shifts:assign, 
--           shifts:manage, shifts:approve, rotas:publish, leave:manage, timeclock:manage)
-- SELECT org_id, COUNT(*) as permission_count
-- FROM public.permissions
-- WHERE name LIKE 'shifts:%' OR name LIKE 'rotas:%' OR name LIKE 'leave:%' OR name LIKE 'timeclock:%'
-- GROUP BY org_id;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS
-- ============================================================================

-- To rollback this migration:
-- 1. Restore original simple policies:
--    DROP POLICY "rotas_select" ON public.rotas;
--    CREATE POLICY "rotas_select" ON public.rotas FOR SELECT USING (is_platform_admin() OR user_in_org(org_id));
--    DROP POLICY "shifts_select" ON public.shifts;
--    CREATE POLICY "shifts_select" ON public.shifts FOR SELECT USING (is_platform_admin() OR user_in_org(org_id));
--
-- 2. Remove added permissions:
--    DELETE FROM public.permissions WHERE name IN ('rotas:publish', 'leave:manage', 'timeclock:manage');