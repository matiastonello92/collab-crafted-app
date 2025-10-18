-- Permettere agli utenti di assegnare turni a sé stessi dal kiosk
-- shift_assignments non ha org_id, verifichiamo tramite shift
CREATE POLICY "shift_assignments_insert_self"
ON shift_assignments
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND EXISTS (
    SELECT 1 FROM shifts 
    WHERE shifts.id = shift_assignments.shift_id 
    AND user_in_org(shifts.org_id)
    AND user_in_location(shifts.location_id)
  )
);