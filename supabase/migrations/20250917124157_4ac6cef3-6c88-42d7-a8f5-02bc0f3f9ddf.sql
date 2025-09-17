-- Populate permission preset items for each preset

-- Get preset IDs and org_id
WITH preset_ids AS (
  SELECT 
    id as preset_id,
    name as preset_name,
    org_id
  FROM permission_presets
),
-- Admin preset: all permissions
admin_permissions AS (
  SELECT 
    p.preset_id,
    perm.name as permission,
    p.org_id
  FROM preset_ids p
  CROSS JOIN (
    SELECT name FROM permissions 
    WHERE org_id = (SELECT DISTINCT org_id FROM permissions LIMIT 1)
  ) perm
  WHERE p.preset_name = 'Admin Preset'
),
-- Manager preset: locations, inventory, users (view/edit)
manager_permissions AS (
  SELECT 
    p.preset_id,
    perm.permission,
    p.org_id
  FROM preset_ids p
  CROSS JOIN (VALUES
    ('locations:view'),
    ('locations:edit'),
    ('locations:manage_users'),
    ('inventory:view'),
    ('inventory:edit'),
    ('inventory:create'),
    ('users:view'),
    ('users:edit'),
    ('users:create'),
    ('tasks:view'),
    ('tasks:edit')
  ) perm(permission)
  WHERE p.preset_name = 'Manager Preset'
),
-- Base preset: only view permissions for locations and tasks
base_permissions AS (
  SELECT 
    p.preset_id,
    perm.permission,
    p.org_id
  FROM preset_ids p
  CROSS JOIN (VALUES
    ('locations:view'),
    ('tasks:view')
  ) perm(permission)
  WHERE p.preset_name = 'Base Preset'
),
-- Combine all permissions
all_preset_permissions AS (
  SELECT * FROM admin_permissions
  UNION ALL
  SELECT * FROM manager_permissions
  UNION ALL
  SELECT * FROM base_permissions
)
-- Insert into permission_preset_items
INSERT INTO permission_preset_items (preset_id, permission, org_id)
SELECT 
  preset_id,
  permission,
  org_id
FROM all_preset_permissions;