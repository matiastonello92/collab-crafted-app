-- Create permission presets and link them to standard roles

-- Get the org_id from existing permissions
WITH org_info AS (
  SELECT DISTINCT org_id FROM permissions LIMIT 1
),
-- Insert permission presets
preset_insert AS (
  INSERT INTO permission_presets (name, description, org_id)
  SELECT 
    preset.name,
    preset.description,
    org_info.org_id
  FROM (VALUES 
    ('Admin Preset', 'Permessi completi per admin'),
    ('Manager Preset', 'Permessi operativi per manager'),
    ('Base Preset', 'Permessi minimi per utente base')
  ) AS preset(name, description)
  CROSS JOIN org_info
  RETURNING id, name, org_id
),
-- Get role IDs
roles_info AS (
  SELECT 
    'b711d082-c3aa-4580-9665-af1698ea50ab'::uuid as admin_role_id,
    '03587fd7-88ab-4c4a-89dc-027c7c49274f'::uuid as manager_role_id,
    'de10094d-2b9e-40d6-9bf5-2500305b041e'::uuid as base_role_id
),
-- Get preset IDs
presets_info AS (
  SELECT 
    id as preset_id,
    name as preset_name,
    org_id
  FROM preset_insert
)
-- Insert role-preset relationships
INSERT INTO role_permission_presets (role_id, preset_id, org_id)
SELECT 
  CASE 
    WHEN p.preset_name = 'Admin Preset' THEN r.admin_role_id
    WHEN p.preset_name = 'Manager Preset' THEN r.manager_role_id
    WHEN p.preset_name = 'Base Preset' THEN r.base_role_id
  END as role_id,
  p.preset_id,
  p.org_id
FROM presets_info p
CROSS JOIN roles_info r;