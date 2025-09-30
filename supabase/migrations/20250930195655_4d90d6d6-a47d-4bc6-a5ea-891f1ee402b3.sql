-- ============================================================================
-- Klyra Shifts MVP Sprint 1 - Schema Migration
-- Version: 1.0.0
-- Date: 2025-01-30
-- Description: Core tables for staff scheduling, rotas, availability, and timekeeping
-- ============================================================================

-- This migration creates the foundational schema for the Klyra Shifts module:
-- - rotas: Weekly staff planning containers
-- - shifts: Individual work shifts
-- - shift_assignments: User-to-shift mappings
-- - availability: User weekly availability preferences
-- - leave_types: Customizable leave categories per organization
-- - leave_requests: Employee leave/vacation requests
-- - time_clock_events: Clock in/out tracking
-- - timesheets: Approved work hour summaries

-- All tables are multi-tenant (org_id + location_id scoped) and integrate
-- with existing RLS functions: user_in_org(), user_in_location(), 
-- is_platform_admin(), user_has_permission()

-- ============================================================================
-- SECTION 1: TABLE CREATION
-- ============================================================================

-- -----------------------------------------------------------------------------
-- 1.1 ROTAS: Weekly staff planning container
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'locked')),
  labor_budget_eur NUMERIC(10,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Business constraints
  CONSTRAINT rotas_unique_week_location UNIQUE (location_id, week_start_date),
  CONSTRAINT rotas_week_start_monday CHECK (EXTRACT(DOW FROM week_start_date) = 1)
);

COMMENT ON TABLE public.rotas IS 'Weekly staff planning containers (rota = weekly schedule)';
COMMENT ON COLUMN public.rotas.week_start_date IS 'Monday of the week (ISO 8601)';
COMMENT ON COLUMN public.rotas.status IS 'draft: editable, published: visible to staff, locked: archived';
COMMENT ON COLUMN public.rotas.labor_budget_eur IS 'Optional weekly labor budget for planning';

-- -----------------------------------------------------------------------------
-- 1.2 SHIFTS: Individual work periods
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  rota_id UUID NOT NULL REFERENCES public.rotas(id) ON DELETE CASCADE,
  job_tag_id UUID REFERENCES public.job_tags(id) ON DELETE SET NULL,
  
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),
  
  notes TEXT,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Business constraints
  CONSTRAINT shifts_end_after_start CHECK (end_at > start_at),
  CONSTRAINT shifts_reasonable_duration CHECK (
    EXTRACT(EPOCH FROM (end_at - start_at)) / 3600 <= 24
  )
);

COMMENT ON TABLE public.shifts IS 'Individual work shifts within a rota';
COMMENT ON COLUMN public.shifts.job_tag_id IS 'Required role/qualification for this shift';
COMMENT ON COLUMN public.shifts.break_minutes IS 'Unpaid break time in minutes';

-- -----------------------------------------------------------------------------
-- 1.3 SHIFT_ASSIGNMENTS: User assignments to shifts
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.shift_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  status TEXT NOT NULL DEFAULT 'proposed' CHECK (status IN ('proposed', 'assigned', 'accepted', 'dropped')),
  published_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Prevent duplicate assignments
  CONSTRAINT shift_assignments_unique_user_shift UNIQUE (shift_id, user_id)
);

COMMENT ON TABLE public.shift_assignments IS 'Links users to shifts with assignment status';
COMMENT ON COLUMN public.shift_assignments.status IS 'proposed: draft, assigned: published, accepted: confirmed by user, dropped: removed';
COMMENT ON COLUMN public.shift_assignments.published_at IS 'When shift was published to user';
COMMENT ON COLUMN public.shift_assignments.acknowledged_at IS 'When user viewed/acknowledged shift';

-- -----------------------------------------------------------------------------
-- 1.4 AVAILABILITY: User weekly availability preferences
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  weekday INTEGER NOT NULL CHECK (weekday BETWEEN 1 AND 7),
  time_range TSTZRANGE NOT NULL,
  preference TEXT NOT NULL DEFAULT 'ok' CHECK (preference IN ('avoid', 'ok', 'prefer')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.availability IS 'User weekly availability patterns (1=Monday, 7=Sunday)';
COMMENT ON COLUMN public.availability.weekday IS 'ISO 8601 weekday (1=Monday, 7=Sunday)';
COMMENT ON COLUMN public.availability.time_range IS 'Time range using timestamptz range type';
COMMENT ON COLUMN public.availability.preference IS 'avoid: try not to schedule, ok: neutral, prefer: preferred time';

-- -----------------------------------------------------------------------------
-- 1.5 LEAVE_TYPES: Customizable leave categories
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  
  key TEXT NOT NULL,
  label TEXT NOT NULL,
  color TEXT,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT leave_types_unique_key UNIQUE (org_id, key)
);

COMMENT ON TABLE public.leave_types IS 'Organization-specific leave types (vacation, sick, etc.)';
COMMENT ON COLUMN public.leave_types.key IS 'Machine-readable key (e.g., vacation, sick_leave)';
COMMENT ON COLUMN public.leave_types.label IS 'Human-readable label (e.g., "Annual Leave")';

-- -----------------------------------------------------------------------------
-- 1.6 LEAVE_REQUESTS: Employee leave requests
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type_id UUID NOT NULL REFERENCES public.leave_types(id) ON DELETE RESTRICT,
  
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),
  
  approver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  reason TEXT,
  notes TEXT,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT leave_requests_end_after_start CHECK (end_at > start_at)
);

COMMENT ON TABLE public.leave_requests IS 'Employee leave/vacation requests';
COMMENT ON COLUMN public.leave_requests.status IS 'pending: awaiting approval, approved: granted, rejected: denied, cancelled: withdrawn';
COMMENT ON COLUMN public.leave_requests.reason IS 'User-provided reason for leave';
COMMENT ON COLUMN public.leave_requests.notes IS 'Admin notes about the request';

-- -----------------------------------------------------------------------------
-- 1.7 TIME_CLOCK_EVENTS: Clock in/out tracking
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.time_clock_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  location_id UUID NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  kind TEXT NOT NULL CHECK (kind IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
  occurred_at TIMESTAMPTZ NOT NULL,
  source TEXT NOT NULL DEFAULT 'mobile' CHECK (source IN ('kiosk', 'mobile', 'manual')),
  meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.time_clock_events IS 'Immutable clock in/out events for time tracking';
COMMENT ON COLUMN public.time_clock_events.kind IS 'Type of clock event';
COMMENT ON COLUMN public.time_clock_events.source IS 'Where event was recorded (kiosk, mobile app, manual entry)';
COMMENT ON COLUMN public.time_clock_events.meta IS 'Additional metadata (GPS coordinates, device info, etc.)';

-- -----------------------------------------------------------------------------
-- 1.8 TIMESHEETS: Approved work hour summaries
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES public.organizations(org_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  totals JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  CONSTRAINT timesheets_unique_user_period UNIQUE (user_id, period_start, period_end),
  CONSTRAINT timesheets_end_after_start CHECK (period_end >= period_start)
);

COMMENT ON TABLE public.timesheets IS 'Approved summaries of worked hours per period';
COMMENT ON COLUMN public.timesheets.totals IS 'JSON with hours breakdown: {regular: 40, overtime: 5, total: 45}';
COMMENT ON COLUMN public.timesheets.period_start IS 'Typically Monday of the week';
COMMENT ON COLUMN public.timesheets.period_end IS 'Typically Sunday of the week';

-- ============================================================================
-- SECTION 2: PERFORMANCE INDICES
-- ============================================================================

-- Rotas: Lookup by location and date
CREATE INDEX IF NOT EXISTS idx_rotas_location_date ON public.rotas(location_id, week_start_date DESC);
CREATE INDEX IF NOT EXISTS idx_rotas_org ON public.rotas(org_id);

-- Shifts: Lookup by rota, location, time range
CREATE INDEX IF NOT EXISTS idx_shifts_rota ON public.shifts(rota_id);
CREATE INDEX IF NOT EXISTS idx_shifts_location_time ON public.shifts(location_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_shifts_job_tag ON public.shifts(job_tag_id) WHERE job_tag_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shifts_org ON public.shifts(org_id);

-- Shift Assignments: Lookup by user or shift
CREATE INDEX IF NOT EXISTS idx_shift_assignments_user ON public.shift_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_shift_assignments_shift ON public.shift_assignments(shift_id);

-- Availability: Lookup by user and weekday
CREATE INDEX IF NOT EXISTS idx_availability_user_weekday ON public.availability(user_id, weekday);
CREATE INDEX IF NOT EXISTS idx_availability_org ON public.availability(org_id);

-- Leave Types: Lookup by org
CREATE INDEX IF NOT EXISTS idx_leave_types_org ON public.leave_types(org_id, is_active);

-- Leave Requests: Lookup by user, org, date range
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON public.leave_requests(user_id, start_at, end_at);
CREATE INDEX IF NOT EXISTS idx_leave_requests_org_status ON public.leave_requests(org_id, status, start_at);

-- Time Clock Events: Lookup by user and location
CREATE INDEX IF NOT EXISTS idx_time_clock_events_user ON public.time_clock_events(user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_time_clock_events_location ON public.time_clock_events(location_id, occurred_at DESC);

-- Timesheets: Lookup by user and period
CREATE INDEX IF NOT EXISTS idx_timesheets_user_period ON public.timesheets(user_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_timesheets_org ON public.timesheets(org_id);

-- ============================================================================
-- SECTION 3: AUTOMATIC UPDATED_AT TRIGGERS
-- ============================================================================

-- Create trigger function if not exists
CREATE OR REPLACE FUNCTION public.trigger_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Apply to all tables with updated_at
CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.rotas
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shifts
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.shift_assignments
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leave_types
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

-- ============================================================================
-- SECTION 4: ROW LEVEL SECURITY POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.rotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_clock_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 4.1 ROTAS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "rotas_select" ON public.rotas
  FOR SELECT
  USING (
    is_platform_admin() 
    OR user_in_location(location_id)
  );

CREATE POLICY "rotas_insert" ON public.rotas
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "rotas_update" ON public.rotas
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
      AND status != 'locked'
    )
  );

CREATE POLICY "rotas_delete" ON public.rotas
  FOR DELETE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
      AND status = 'draft'
    )
  );

-- -----------------------------------------------------------------------------
-- 4.2 SHIFTS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "shifts_select" ON public.shifts
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_in_location(location_id)
  );

CREATE POLICY "shifts_insert" ON public.shifts
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "shifts_update" ON public.shifts
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "shifts_delete" ON public.shifts
  FOR DELETE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

-- -----------------------------------------------------------------------------
-- 4.3 SHIFT_ASSIGNMENTS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "shift_assignments_select" ON public.shift_assignments
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
        AND user_in_location(s.location_id)
    )
  );

CREATE POLICY "shift_assignments_insert" ON public.shift_assignments
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
        AND user_in_org(s.org_id)
        AND user_in_location(s.location_id)
        AND user_has_permission(auth.uid(), 'shifts:assign')
    )
  );

CREATE POLICY "shift_assignments_update" ON public.shift_assignments
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      user_id = auth.uid() 
      AND status IN ('proposed', 'assigned')
    )
    OR EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
        AND user_in_org(s.org_id)
        AND user_in_location(s.location_id)
        AND user_has_permission(auth.uid(), 'shifts:assign')
    )
  );

CREATE POLICY "shift_assignments_delete" ON public.shift_assignments
  FOR DELETE
  USING (
    is_platform_admin()
    OR EXISTS (
      SELECT 1 FROM public.shifts s
      WHERE s.id = shift_assignments.shift_id
        AND user_in_org(s.org_id)
        AND user_in_location(s.location_id)
        AND user_has_permission(auth.uid(), 'shifts:assign')
    )
  );

-- -----------------------------------------------------------------------------
-- 4.4 AVAILABILITY Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "availability_select" ON public.availability
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "availability_insert" ON public.availability
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND user_in_org(org_id)
  );

CREATE POLICY "availability_update" ON public.availability
  FOR UPDATE
  USING (
    user_id = auth.uid()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "availability_delete" ON public.availability
  FOR DELETE
  USING (
    user_id = auth.uid()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

-- -----------------------------------------------------------------------------
-- 4.5 LEAVE_TYPES Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "leave_types_select" ON public.leave_types
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_in_org(org_id)
  );

CREATE POLICY "leave_types_insert" ON public.leave_types
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "leave_types_update" ON public.leave_types
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

CREATE POLICY "leave_types_delete" ON public.leave_types
  FOR DELETE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  );

-- -----------------------------------------------------------------------------
-- 4.6 LEAVE_REQUESTS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "leave_requests_select" ON public.leave_requests
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
    )
  );

CREATE POLICY "leave_requests_insert" ON public.leave_requests
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND user_in_org(org_id)
  );

CREATE POLICY "leave_requests_update" ON public.leave_requests
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      user_id = auth.uid()
      AND status = 'pending'
    )
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
    )
  );

CREATE POLICY "leave_requests_delete" ON public.leave_requests
  FOR DELETE
  USING (
    is_platform_admin()
    OR (
      user_id = auth.uid()
      AND status = 'pending'
    )
  );

-- -----------------------------------------------------------------------------
-- 4.7 TIME_CLOCK_EVENTS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "time_clock_events_select" ON public.time_clock_events
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (
      user_in_org(org_id)
      AND user_in_location(location_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
    )
  );

CREATE POLICY "time_clock_events_insert" ON public.time_clock_events
  FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    AND user_in_org(org_id)
    AND user_in_location(location_id)
  );

-- No UPDATE/DELETE policies - time clock events are immutable

-- -----------------------------------------------------------------------------
-- 4.8 TIMESHEETS Policies
-- -----------------------------------------------------------------------------

CREATE POLICY "timesheets_select" ON public.timesheets
  FOR SELECT
  USING (
    is_platform_admin()
    OR user_id = auth.uid()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
    )
  );

CREATE POLICY "timesheets_insert" ON public.timesheets
  FOR INSERT
  WITH CHECK (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
    )
  );

CREATE POLICY "timesheets_update" ON public.timesheets
  FOR UPDATE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
    )
  );

CREATE POLICY "timesheets_delete" ON public.timesheets
  FOR DELETE
  USING (
    is_platform_admin()
    OR (
      user_in_org(org_id)
      AND user_has_permission(auth.uid(), 'shifts:approve')
      AND approved_at IS NULL
    )
  );

-- ============================================================================
-- SECTION 5: SHIFTS PERMISSIONS INITIALIZATION
-- ============================================================================

-- Insert default shift permissions for each existing organization
-- These will be available for role assignments in the RBAC system

DO $$
DECLARE
  org RECORD;
BEGIN
  FOR org IN SELECT org_id FROM public.organizations
  LOOP
    -- Core shift viewing permission
    INSERT INTO public.permissions (org_id, name, display_name, category, description)
    VALUES (
      org.org_id,
      'shifts:view',
      'View Shifts',
      'shifts',
      'View rotas, shifts, and assignments'
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- Create/edit shifts
    INSERT INTO public.permissions (org_id, name, display_name, category, description)
    VALUES (
      org.org_id,
      'shifts:create',
      'Create Shifts',
      'shifts',
      'Create new rotas and shifts'
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- Assign users to shifts
    INSERT INTO public.permissions (org_id, name, display_name, category, description)
    VALUES (
      org.org_id,
      'shifts:assign',
      'Assign Shifts',
      'shifts',
      'Assign or unassign users to/from shifts'
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- Full shift management (edit rotas, publish, lock)
    INSERT INTO public.permissions (org_id, name, display_name, category, description)
    VALUES (
      org.org_id,
      'shifts:manage',
      'Manage Shifts',
      'shifts',
      'Full shift management including publishing and locking rotas'
    )
    ON CONFLICT (org_id, name) DO NOTHING;

    -- Approve leave requests and timesheets
    INSERT INTO public.permissions (org_id, name, display_name, category, description)
    VALUES (
      org.org_id,
      'shifts:approve',
      'Approve Timesheets',
      'shifts',
      'Approve leave requests, timesheets, and time adjustments'
    )
    ON CONFLICT (org_id, name) DO NOTHING;

  END LOOP;
END $$;

-- ============================================================================
-- SECTION 6: VALIDATION & TESTING HELPERS
-- ============================================================================

-- Function to validate rota dates don't overlap for same location
CREATE OR REPLACE FUNCTION public.validate_rota_no_overlap()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.rotas
    WHERE location_id = NEW.location_id
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND week_start_date = NEW.week_start_date
  ) THEN
    RAISE EXCEPTION 'Rota already exists for location % on week starting %', 
      NEW.location_id, NEW.week_start_date;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_rota_dates
  BEFORE INSERT OR UPDATE ON public.rotas
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_rota_no_overlap();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary:
-- ✅ 8 tables created with full multi-tenant support
-- ✅ Performance indices on all lookup patterns
-- ✅ Automatic updated_at triggers
-- ✅ Comprehensive RLS policies using existing security functions
-- ✅ 5 shift permissions added to all organizations
-- ✅ Data integrity constraints and validations

-- Next Steps:
-- 1. Test RLS policies with different user roles
-- 2. Create API endpoints for CRUD operations
-- 3. Build UI components for rota management
-- 4. Implement real-time subscriptions for shift updates
-- 5. Add email notifications for shift assignments

-- Rollback Instructions:
-- To rollback this migration, run:
/*
DROP TRIGGER IF EXISTS validate_rota_dates ON public.rotas;
DROP FUNCTION IF EXISTS public.validate_rota_no_overlap();
DROP TRIGGER IF EXISTS set_updated_at ON public.timesheets;
DROP TRIGGER IF EXISTS set_updated_at ON public.leave_requests;
DROP TRIGGER IF EXISTS set_updated_at ON public.leave_types;
DROP TRIGGER IF EXISTS set_updated_at ON public.availability;
DROP TRIGGER IF EXISTS set_updated_at ON public.shift_assignments;
DROP TRIGGER IF EXISTS set_updated_at ON public.shifts;
DROP TRIGGER IF EXISTS set_updated_at ON public.rotas;
DROP TABLE IF EXISTS public.timesheets CASCADE;
DROP TABLE IF EXISTS public.time_clock_events CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;
DROP TABLE IF EXISTS public.leave_types CASCADE;
DROP TABLE IF EXISTS public.availability CASCADE;
DROP TABLE IF EXISTS public.shift_assignments CASCADE;
DROP TABLE IF EXISTS public.shifts CASCADE;
DROP TABLE IF EXISTS public.rotas CASCADE;
DELETE FROM public.permissions WHERE category = 'shifts';
*/