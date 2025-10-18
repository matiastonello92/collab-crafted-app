-- Populate role_permissions for admin and manager roles (with org_id)

-- Step 1: Assign ALL permissions to admin roles
INSERT INTO role_permissions (role_id, permission_id, org_id)
SELECT DISTINCT r.id as role_id, p.id as permission_id, r.org_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin'
  AND r.org_id = p.org_id
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Step 2: Assign core shifts/rotas/leave permissions to manager roles
INSERT INTO role_permissions (role_id, permission_id, org_id)
SELECT DISTINCT r.id as role_id, p.id as permission_id, r.org_id
FROM roles r
JOIN permissions p ON p.org_id = r.org_id
WHERE r.name = 'manager'
  AND p.name IN (
    'shifts:view',
    'shifts:create',
    'shifts:manage',
    'shifts:approve',
    'rotas:publish',
    'leave:manage',
    'timeclock:manage',
    'finance:view',
    'finance:create',
    'inventory:view',
    'inventory:create',
    'inventory:edit',
    'tasks:view',
    'tasks:create',
    'tasks:edit'
  )
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Step 3: Log results
DO $$
DECLARE
  admin_count int;
  manager_count int;
BEGIN
  SELECT COUNT(*) INTO admin_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  WHERE r.name = 'admin';
  
  SELECT COUNT(*) INTO manager_count
  FROM role_permissions rp
  JOIN roles r ON r.id = rp.role_id
  WHERE r.name = 'manager';
  
  RAISE NOTICE 'Admin role_permissions created: %', admin_count;
  RAISE NOTICE 'Manager role_permissions created: %', manager_count;
END $$;