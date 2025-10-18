-- Drop old conflicting policies
DROP POLICY IF EXISTS "shift_assignments_insert" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_insert_self" ON shift_assignments;

-- Create unified INSERT policy for shift_assignments
CREATE POLICY "shift_assignments_insert_unified"
ON shift_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  -- Managers/admins can assign to anyone in their org/location
  (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_assignments.shift_id
      AND user_in_org(s.org_id)
      AND user_in_location(s.location_id)
      AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  )
  OR
  -- Users can self-assign from kiosk
  (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_assignments.shift_id
      AND user_in_org(s.org_id)
      AND user_in_location(s.location_id)
    )
  )
);

-- Create function to update shift status on assignment
CREATE OR REPLACE FUNCTION public.update_shift_status_on_assignment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- When a shift_assignment is created, update the shift status from draft to assigned
  UPDATE shifts
  SET status = 'assigned'
  WHERE id = NEW.shift_id
    AND status = 'draft';
  
  RETURN NEW;
END;
$$;

-- Create trigger for shift status update
DROP TRIGGER IF EXISTS on_shift_assignment_created ON shift_assignments;
CREATE TRIGGER on_shift_assignment_created
  AFTER INSERT ON shift_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_shift_status_on_assignment();