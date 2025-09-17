-- Populate role_permissions using the preset associations

-- Get role-preset mappings and convert preset items to role permissions
WITH role_preset_mapping AS (
  SELECT 
    rpp.role_id,
    rpp.preset_id,
    rpp.org_id
  FROM role_permission_presets rpp
),
preset_permissions AS (
  SELECT 
    rpm.role_id,
    p.id as permission_id,
    rpm.org_id
  FROM role_preset_mapping rpm
  JOIN permission_preset_items ppi ON ppi.preset_id = rpm.preset_id
  JOIN permissions p ON p.name = ppi.permission AND p.org_id = rpm.org_id
)
-- Insert into role_permissions, avoiding duplicates
INSERT INTO role_permissions (role_id, permission_id, org_id)
SELECT DISTINCT
  pp.role_id,
  pp.permission_id,
  pp.org_id
FROM preset_permissions pp
ON CONFLICT (role_id, permission_id, org_id) DO NOTHING;