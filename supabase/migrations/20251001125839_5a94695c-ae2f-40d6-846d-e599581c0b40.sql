-- ================================================================
-- Fix: Infinite Recursion in shift_assignments RLS Policy
-- ================================================================
-- Problem: shift_assignments_select policy queries shifts table,
-- which in turn can query shift_assignments (nested select), causing recursion.
-- Solution: Use SECURITY DEFINER function to break the recursive chain.

-- Step 1: Create security definer function to check shift assignment visibility
CREATE OR REPLACE FUNCTION public.user_can_view_shift_assignment(_shift_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_shift RECORD;
BEGIN
  -- Fetch shift details without triggering RLS on shift_assignments
  SELECT s.org_id, s.location_id, s.rota_id
  INTO v_shift
  FROM public.shifts s
  WHERE s.id = _shift_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Check if user is platform admin
  IF is_platform_admin() THEN
    RETURN TRUE;
  END IF;

  -- Check if user is in org and has shifts:manage permission
  IF user_in_org(v_shift.org_id) AND user_has_permission(auth.uid(), 'shifts:manage') THEN
    RETURN TRUE;
  END IF;

  -- Check if user is in location (for viewing assignments in their location)
  IF user_in_location(v_shift.location_id) THEN
    RETURN TRUE;
  END IF;

  RETURN FALSE;
END;
$$;

-- Step 2: Drop and recreate shift_assignments_select policy with new function
DROP POLICY IF EXISTS shift_assignments_select ON public.shift_assignments;

CREATE POLICY "shift_assignments_select" 
ON public.shift_assignments
FOR SELECT
USING (
  is_platform_admin() 
  OR user_id = auth.uid() 
  OR user_can_view_shift_assignment(shift_id)
);

-- Add comment for documentation
COMMENT ON FUNCTION public.user_can_view_shift_assignment IS 
'SECURITY DEFINER function to check if current user can view a shift assignment. Prevents infinite recursion in RLS policies by avoiding nested queries between shifts and shift_assignments tables.';