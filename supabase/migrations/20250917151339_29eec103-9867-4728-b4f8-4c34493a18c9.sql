-- Add global permissions for manage_users and view_settings
-- These permissions are global (org_id = NULL) and should exist once in the system

INSERT INTO public.permissions (name, display_name, category, org_id, description)
VALUES 
  ('manage_users', 'Manage Users', 'users', NULL, 'Permission to manage user accounts and assignments'),
  ('view_settings', 'View Settings', 'settings', NULL, 'Permission to view system and organization settings')
ON CONFLICT (name) DO NOTHING;

-- Report: Show the final state of global permissions
SELECT 
  id,
  name, 
  display_name, 
  category,
  org_id,
  'Created or already exists' as status
FROM public.permissions 
WHERE name IN ('manage_users', 'view_settings')
ORDER BY name;