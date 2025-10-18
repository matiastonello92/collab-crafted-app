-- Migration: Remove shifts:assign permission and use only shifts:manage
-- Step 1: Grant shifts:manage to all roles that have shifts:assign
INSERT INTO role_permissions (role_id, permission_id)
SELECT DISTINCT rp.role_id, p_manage.id
FROM role_permissions rp
JOIN permissions p_assign ON p_assign.id = rp.permission_id
JOIN permissions p_manage ON p_manage.name = 'shifts:manage' AND p_manage.org_id = p_assign.org_id
WHERE p_assign.name = 'shifts:assign'
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp2
    WHERE rp2.role_id = rp.role_id AND rp2.permission_id = p_manage.id
  );

-- Step 2: Remove all role_permissions entries for shifts:assign
DELETE FROM role_permissions
WHERE permission_id IN (
  SELECT id FROM permissions WHERE name = 'shifts:assign'
);

-- Step 3: Remove the shifts:assign permission completely
DELETE FROM permissions WHERE name = 'shifts:assign';

-- Step 4: Update RLS policies for shift_assignments to use only shifts:manage
DROP POLICY IF EXISTS "shift_assignments_insert" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_delete" ON shift_assignments;
DROP POLICY IF EXISTS "shift_assignments_update" ON shift_assignments;

CREATE POLICY "shift_assignments_insert" ON shift_assignments
FOR INSERT
WITH CHECK (
  is_platform_admin() 
  OR (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_assignments.shift_id 
        AND user_in_org(s.org_id) 
        AND user_in_location(s.location_id) 
        AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  )
  OR (
    user_id = auth.uid() 
    AND EXISTS (
      SELECT 1 FROM shifts s 
      WHERE s.id = shift_assignments.shift_id 
      AND s.source = 'actual'
    )
  )
);

CREATE POLICY "shift_assignments_delete" ON shift_assignments
FOR DELETE
USING (
  is_platform_admin() 
  OR (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_assignments.shift_id
        AND user_in_org(s.org_id)
        AND user_in_location(s.location_id)
        AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  )
);

CREATE POLICY "shift_assignments_update" ON shift_assignments
FOR UPDATE
USING (
  is_platform_admin() 
  OR (
    EXISTS (
      SELECT 1 FROM shifts s
      WHERE s.id = shift_assignments.shift_id
        AND user_in_org(s.org_id)
        AND user_in_location(s.location_id)
        AND user_has_permission(auth.uid(), 'shifts:manage')
    )
  )
);