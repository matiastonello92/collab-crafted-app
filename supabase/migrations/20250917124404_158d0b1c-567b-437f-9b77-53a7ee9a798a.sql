-- Populate role_permissions using the preset associations (without ON CONFLICT)

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
-- Insert into role_permissions, checking for existing entries
INSERT INTO role_permissions (role_id, permission_id, org_id)
SELECT DISTINCT
  pp.role_id,
  pp.permission_id,
  pp.org_id
FROM preset_permissions pp
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp 
  WHERE rp.role_id = pp.role_id 
    AND rp.permission_id = pp.permission_id 
    AND rp.org_id = pp.org_id
);