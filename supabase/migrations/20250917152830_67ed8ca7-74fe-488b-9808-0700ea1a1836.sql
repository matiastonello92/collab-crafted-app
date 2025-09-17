-- Fix permissions table structure for multi-org RBAC system
-- Remove global unique constraint on name and add org-specific constraint

-- Step 1: Remove existing UNIQUE constraint on name column
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;

-- Step 2: Add UNIQUE constraint on (org_id, name) to allow same permission name across different orgs
ALTER TABLE public.permissions ADD CONSTRAINT permissions_org_name_unique UNIQUE (org_id, name);

-- Step 3: Verify org_id is NOT NULL (should already be the case)
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'permissions' 
        AND column_name = 'org_id' 
        AND is_nullable = 'YES'
    ) THEN
        RAISE EXCEPTION 'org_id column should be NOT NULL';
    END IF;
END $$;

-- Step 4: Create manage_users permission for all existing organizations
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
    o.org_id,
    'manage_users',
    'Manage Users',
    'users',
    'Permission to manage user accounts and assignments'
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.permissions p 
    WHERE p.org_id = o.org_id 
    AND p.name = 'manage_users'
);

-- Step 5: Create view_settings permission for all existing organizations
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
    o.org_id,
    'view_settings',
    'View Settings',
    'settings',
    'Permission to view system and organization settings'
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.permissions p 
    WHERE p.org_id = o.org_id 
    AND p.name = 'view_settings'
);

-- Report: Show constraint status
SELECT 
    'CONSTRAINT REPORT: permissions_org_name_unique UNIQUE(org_id, name) - Active' as final_report;

-- Report: Show all manage_users and view_settings permissions by organization
SELECT 
    'ORG: ' || o.name || ' | PERMISSION: ' || p.name || ' (' || p.display_name || ') - Created/Verified' as final_report
FROM public.permissions p
JOIN public.organizations o ON o.org_id = p.org_id
WHERE p.name IN ('manage_users', 'view_settings')
ORDER BY o.name, p.name;