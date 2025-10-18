-- Fix shift assignment issues by updating RLS policies and status defaults

-- 1. Update shifts_select policy to remove 'accepted' status references
DROP POLICY IF EXISTS "shifts_select" ON shifts;

CREATE POLICY "shifts_select"
ON shifts
FOR SELECT
TO public
USING (
  is_platform_admin() 
  OR (
    user_in_org(org_id) 
    AND (
      user_has_permission(auth.uid(), 'shifts:manage')
      OR (
        user_in_location(location_id) 
        AND (
          EXISTS (
            SELECT 1 FROM shift_assignments sa
            WHERE sa.shift_id = shifts.id
              AND sa.user_id = auth.uid()
              AND sa.status = 'assigned'
          )
          OR EXISTS (
            SELECT 1 FROM rotas r
            WHERE r.id = shifts.rota_id
              AND r.status = 'published'
          )
        )
      )
    )
  )
);

-- 2. Change default status from 'proposed' to 'assigned' in shift_assignments
ALTER TABLE shift_assignments 
ALTER COLUMN status SET DEFAULT 'assigned';

-- 3. Update existing rows with 'proposed' status to 'assigned'
UPDATE shift_assignments 
SET status = 'assigned' 
WHERE status = 'proposed';