-- ============================================================================
-- Klyra Shifts - RLS Policy Testing Script
-- ============================================================================
-- Description: Manual test queries to verify RLS policies work correctly
--              for Platform Admin, Manager, and Base User roles
-- Usage: Run these queries while authenticated as different user types
-- ============================================================================

-- ============================================================================
-- SETUP: Verify Test Prerequisites
-- ============================================================================

-- Check that organizations and locations exist
SELECT org_id, name, status FROM public.organizations LIMIT 3;
SELECT id, name, org_id, status FROM public.locations LIMIT 3;

-- Check that permission tags are created
SELECT org_id, name, display_name 
FROM public.permissions 
WHERE name LIKE 'shifts:%' OR name LIKE 'rotas:%' OR name LIKE 'leave:%' OR name LIKE 'timeclock:%'
ORDER BY org_id, name;

-- Expected: 8 permissions per organization
-- shifts:view, shifts:create, shifts:assign, shifts:manage, shifts:approve
-- rotas:publish, leave:manage, timeclock:manage

-- ============================================================================
-- TEST 1: ROTAS TABLE
-- ============================================================================

-- Insert test data (run as Platform Admin or service role)
-- Note: Replace with actual org_id and location_id from your database
DO $$
DECLARE
  test_org_id uuid;
  test_location_id uuid;
BEGIN
  -- Get first org and location
  SELECT org_id INTO test_org_id FROM public.organizations LIMIT 1;
  SELECT id INTO test_location_id FROM public.locations WHERE org_id = test_org_id LIMIT 1;
  
  -- Insert draft rota
  INSERT INTO public.rotas (org_id, location_id, week_start_date, status, labor_budget_eur)
  VALUES (test_org_id, test_location_id, '2025-02-03', 'draft', 5000)
  ON CONFLICT DO NOTHING;
  
  -- Insert published rota
  INSERT INTO public.rotas (org_id, location_id, week_start_date, status, labor_budget_eur)
  VALUES (test_org_id, test_location_id, '2025-02-10', 'published', 5500)
  ON CONFLICT DO NOTHING;
END $$;

-- Test as Platform Admin: Should see all rotas
-- Expected: 2+ rotas (draft + published)
SELECT id, status, week_start_date, org_id, location_id 
FROM public.rotas 
ORDER BY week_start_date DESC;

-- Test as Manager (with shifts:manage permission in location):
-- Expected: 2+ rotas (draft + published) in their locations
-- Run after assigning shifts:manage permission to test user:
-- INSERT INTO public.user_permissions (user_id, permission_id, location_id, granted, granted_by, org_id)
-- VALUES (
--   '<manager_user_id>', 
--   (SELECT id FROM permissions WHERE name = 'shifts:manage' AND org_id = '<org_id>' LIMIT 1),
--   '<location_id>',
--   true,
--   '<admin_user_id>',
--   '<org_id>'
-- );

-- Test as Base User (no special permissions):
-- Expected: Only published rotas in their location
-- Should NOT see draft rotas
SELECT id, status, week_start_date, org_id, location_id 
FROM public.rotas 
WHERE status = 'published'
ORDER BY week_start_date DESC;

-- ============================================================================
-- TEST 2: SHIFTS TABLE
-- ============================================================================

-- Insert test shifts (run as Platform Admin or service role)
DO $$
DECLARE
  test_org_id uuid;
  test_location_id uuid;
  test_rota_id uuid;
  test_job_tag_id uuid;
BEGIN
  -- Get test IDs
  SELECT org_id INTO test_org_id FROM public.organizations LIMIT 1;
  SELECT id INTO test_location_id FROM public.locations WHERE org_id = test_org_id LIMIT 1;
  SELECT id INTO test_rota_id FROM public.rotas WHERE org_id = test_org_id AND status = 'published' LIMIT 1;
  SELECT id INTO test_job_tag_id FROM public.job_tags WHERE org_id = test_org_id LIMIT 1;
  
  -- Insert test shift in published rota
  INSERT INTO public.shifts (org_id, location_id, rota_id, job_tag_id, start_at, end_at, break_minutes, created_by)
  VALUES (
    test_org_id, 
    test_location_id, 
    test_rota_id, 
    test_job_tag_id,
    '2025-02-10 09:00:00+01'::timestamptz,
    '2025-02-10 17:00:00+01'::timestamptz,
    30,
    auth.uid()
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Test as Platform Admin: Should see all shifts
SELECT id, rota_id, start_at, end_at, org_id, location_id 
FROM public.shifts 
ORDER BY start_at DESC 
LIMIT 10;

-- Test as Manager (with shifts:manage): Should see all shifts in org
-- Expected: All shifts in their organization

-- Test as Base User: Should only see shifts assigned to them OR published shifts
-- Expected: Only shifts where:
--   1. User is assigned (status = 'assigned' or 'accepted')
--   2. OR shift is in a published rota in their location
SELECT s.id, s.start_at, s.end_at, r.status as rota_status,
       sa.user_id as assigned_to_me,
       sa.status as assignment_status
FROM public.shifts s
LEFT JOIN public.rotas r ON r.id = s.rota_id
LEFT JOIN public.shift_assignments sa ON sa.shift_id = s.id AND sa.user_id = auth.uid()
WHERE r.status = 'published' OR sa.user_id = auth.uid()
ORDER BY s.start_at DESC;

-- ============================================================================
-- TEST 3: SHIFT_ASSIGNMENTS TABLE
-- ============================================================================

-- Insert test assignment (run as Platform Admin or Manager with shifts:assign)
DO $$
DECLARE
  test_shift_id uuid;
  test_user_id uuid;
BEGIN
  SELECT id INTO test_shift_id FROM public.shifts LIMIT 1;
  SELECT id INTO test_user_id FROM public.profiles LIMIT 1;
  
  INSERT INTO public.shift_assignments (shift_id, user_id, status)
  VALUES (test_shift_id, test_user_id, 'assigned')
  ON CONFLICT DO NOTHING;
END $$;

-- Test as Platform Admin: Should see all assignments
SELECT sa.id, sa.shift_id, sa.user_id, sa.status, s.start_at
FROM public.shift_assignments sa
JOIN public.shifts s ON s.id = sa.shift_id
ORDER BY s.start_at DESC
LIMIT 10;

-- Test as Base User: Should only see their own assignments
-- Expected: Only assignments where user_id = auth.uid()
SELECT sa.id, sa.shift_id, sa.status, s.start_at, s.end_at
FROM public.shift_assignments sa
JOIN public.shifts s ON s.id = sa.shift_id
WHERE sa.user_id = auth.uid()
ORDER BY s.start_at DESC;

-- ============================================================================
-- TEST 4: AVAILABILITY TABLE
-- ============================================================================

-- Insert test availability (run as any authenticated user for themselves)
INSERT INTO public.availability (org_id, user_id, weekday, time_range, preference)
VALUES (
  (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1),
  auth.uid(),
  1, -- Monday
  '[2025-01-30 09:00:00+01, 2025-01-30 17:00:00+01)'::tstzrange,
  'prefer'
)
ON CONFLICT DO NOTHING;

-- Test as Base User: Should see only their own availability
SELECT id, weekday, time_range, preference, created_at
FROM public.availability
WHERE user_id = auth.uid()
ORDER BY weekday;

-- Test as Manager (with shifts:manage): Should see all availability in org
-- Expected: All availability records for users in their organization
SELECT a.id, a.user_id, p.full_name, a.weekday, a.preference
FROM public.availability a
JOIN public.profiles p ON p.id = a.user_id
WHERE a.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
ORDER BY a.user_id, a.weekday;

-- ============================================================================
-- TEST 5: LEAVE_REQUESTS TABLE
-- ============================================================================

-- Insert test leave request (run as any authenticated user)
DO $$
DECLARE
  test_org_id uuid;
  test_leave_type_id uuid;
BEGIN
  SELECT org_id INTO test_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  
  -- Create leave type if not exists
  INSERT INTO public.leave_types (org_id, key, label, color)
  VALUES (test_org_id, 'annual_leave', 'Annual Leave', '#3b82f6')
  ON CONFLICT (org_id, key) DO NOTHING
  RETURNING id INTO test_leave_type_id;
  
  IF test_leave_type_id IS NULL THEN
    SELECT id INTO test_leave_type_id FROM public.leave_types WHERE org_id = test_org_id LIMIT 1;
  END IF;
  
  -- Insert leave request
  INSERT INTO public.leave_requests (org_id, user_id, type_id, start_at, end_at, status, reason)
  VALUES (
    test_org_id,
    auth.uid(),
    test_leave_type_id,
    '2025-03-01 00:00:00+01'::timestamptz,
    '2025-03-07 23:59:59+01'::timestamptz,
    'pending',
    'Vacation'
  )
  ON CONFLICT DO NOTHING;
END $$;

-- Test as Base User: Should see only their own leave requests
SELECT lr.id, lr.status, lr.start_at, lr.end_at, lr.reason, lt.label as leave_type
FROM public.leave_requests lr
JOIN public.leave_types lt ON lt.id = lr.type_id
WHERE lr.user_id = auth.uid()
ORDER BY lr.start_at DESC;

-- Test as Manager (with leave:manage): Should see all leave requests in org
-- Expected: All leave requests for users in their organization
SELECT lr.id, p.full_name, lr.status, lr.start_at, lr.end_at, lt.label
FROM public.leave_requests lr
JOIN public.profiles p ON p.id = lr.user_id
JOIN public.leave_types lt ON lt.id = lr.type_id
WHERE lr.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
ORDER BY lr.start_at DESC;

-- ============================================================================
-- TEST 6: TIME_CLOCK_EVENTS TABLE
-- ============================================================================

-- Insert test clock event (run as any authenticated user)
DO $$
DECLARE
  test_org_id uuid;
  test_location_id uuid;
BEGIN
  SELECT org_id INTO test_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  SELECT id INTO test_location_id FROM public.locations WHERE org_id = test_org_id LIMIT 1;
  
  INSERT INTO public.time_clock_events (org_id, location_id, user_id, kind, occurred_at, source)
  VALUES (
    test_org_id,
    test_location_id,
    auth.uid(),
    'clock_in',
    now(),
    'mobile'
  );
END $$;

-- Test as Base User: Should see only their own clock events
SELECT id, kind, occurred_at, source, location_id
FROM public.time_clock_events
WHERE user_id = auth.uid()
ORDER BY occurred_at DESC
LIMIT 10;

-- Test as Manager (with timeclock:manage): Should see all events in their locations
-- Expected: All clock events for users in their managed locations
SELECT tce.id, p.full_name, tce.kind, tce.occurred_at, tce.source
FROM public.time_clock_events tce
JOIN public.profiles p ON p.id = tce.user_id
WHERE tce.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
  AND tce.location_id IN (
    SELECT url.location_id 
    FROM public.user_roles_locations url
    JOIN public.role_permissions rp ON rp.role_id = url.role_id
    JOIN public.permissions perm ON perm.id = rp.permission_id
    WHERE url.user_id = auth.uid() 
      AND perm.name = 'timeclock:manage'
      AND COALESCE(url.is_active, true)
  )
ORDER BY tce.occurred_at DESC;

-- ============================================================================
-- TEST 7: TIMESHEETS TABLE
-- ============================================================================

-- Insert test timesheet (run as Manager or system)
DO $$
DECLARE
  test_org_id uuid;
  test_user_id uuid;
BEGIN
  SELECT org_id INTO test_org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1;
  SELECT id INTO test_user_id FROM public.profiles WHERE org_id = test_org_id LIMIT 1;
  
  INSERT INTO public.timesheets (org_id, user_id, period_start, period_end, totals)
  VALUES (
    test_org_id,
    test_user_id,
    '2025-02-03',
    '2025-02-09',
    '{"hours_worked": 40, "overtime": 2, "breaks": 2.5}'::jsonb
  )
  ON CONFLICT (user_id, period_start, period_end) DO NOTHING;
END $$;

-- Test as Base User: Should see only their own timesheets
SELECT id, period_start, period_end, totals, approved_at, approved_by
FROM public.timesheets
WHERE user_id = auth.uid()
ORDER BY period_start DESC;

-- Test as Manager (with shifts:approve): Should see all timesheets in org
-- Expected: All timesheets for users in their organization
SELECT ts.id, p.full_name, ts.period_start, ts.period_end, ts.totals, ts.approved_at
FROM public.timesheets ts
JOIN public.profiles p ON p.id = ts.user_id
WHERE ts.org_id = (SELECT org_id FROM public.profiles WHERE id = auth.uid() LIMIT 1)
ORDER BY ts.period_start DESC;

-- ============================================================================
-- CLEANUP: Remove Test Data
-- ============================================================================

-- Run these as Platform Admin to clean up test data
-- DELETE FROM public.timesheets WHERE period_start >= '2025-02-03';
-- DELETE FROM public.time_clock_events WHERE occurred_at >= '2025-01-30';
-- DELETE FROM public.leave_requests WHERE start_at >= '2025-03-01';
-- DELETE FROM public.availability WHERE weekday = 1 AND preference = 'prefer';
-- DELETE FROM public.shift_assignments WHERE created_at >= '2025-01-30';
-- DELETE FROM public.shifts WHERE start_at >= '2025-02-10';
-- DELETE FROM public.rotas WHERE week_start_date >= '2025-02-03';

-- ============================================================================
-- VERIFICATION: Policy Count Check
-- ============================================================================

-- Verify all RLS policies are active
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN (
    'rotas', 'shifts', 'shift_assignments', 'availability',
    'leave_types', 'leave_requests', 'time_clock_events', 'timesheets'
  )
ORDER BY tablename, cmd, policyname;

-- Expected: 32+ policies across 8 tables
-- Each table should have policies for SELECT, INSERT, UPDATE, DELETE (some exceptions)

-- ============================================================================
-- END OF TEST SCRIPT
-- ============================================================================
