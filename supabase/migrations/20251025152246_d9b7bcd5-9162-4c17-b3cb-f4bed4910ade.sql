-- Link HACCP permissions to admin and manager roles
-- This migration ensures org admins can access the HACCP module

-- 1. Link all 5 HACCP permissions to admin role for all organizations
INSERT INTO public.role_permissions (role_id, permission_id, org_id)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  r.org_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'admin'
  AND p.name IN ('haccp:view', 'haccp:check', 'haccp:sign', 'haccp:export', 'haccp:manage')
  AND r.org_id = p.org_id
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 2. Link HACCP view, check, and sign permissions to manager role
-- Managers can view and execute tasks, but not manage configuration or export reports
INSERT INTO public.role_permissions (role_id, permission_id, org_id)
SELECT 
  r.id as role_id,
  p.id as permission_id,
  r.org_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.name = 'manager'
  AND p.name IN ('haccp:view', 'haccp:check', 'haccp:sign')
  AND r.org_id = p.org_id
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- 3. Verify and log the results
DO $$
DECLARE
  admin_links_count INTEGER;
  manager_links_count INTEGER;
  orgs_count INTEGER;
BEGIN
  -- Count admin role links
  SELECT COUNT(*) INTO admin_links_count
  FROM public.role_permissions rp
  JOIN public.roles r ON r.id = rp.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE r.name = 'admin' AND p.name LIKE 'haccp:%';
  
  -- Count manager role links
  SELECT COUNT(*) INTO manager_links_count
  FROM public.role_permissions rp
  JOIN public.roles r ON r.id = rp.role_id
  JOIN public.permissions p ON p.id = rp.permission_id
  WHERE r.name = 'manager' AND p.name LIKE 'haccp:%';
  
  -- Count organizations
  SELECT COUNT(*) INTO orgs_count FROM public.organizations;
  
  RAISE NOTICE '✅ HACCP Permissions Migration Complete';
  RAISE NOTICE '   Organizations: %', orgs_count;
  RAISE NOTICE '   Admin role HACCP permissions: %', admin_links_count;
  RAISE NOTICE '   Manager role HACCP permissions: %', manager_links_count;
END $$;