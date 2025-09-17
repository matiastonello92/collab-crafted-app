-- Fix permissions table structure for multi-org RBAC system
-- Remove global unique constraint on name and add org-specific constraint

-- Step 1: Remove existing UNIQUE constraint on name column
ALTER TABLE public.permissions DROP CONSTRAINT IF EXISTS permissions_name_key;

-- Step 2: Add UNIQUE constraint on (org_id, name) to allow same permission name across different orgs
ALTER TABLE public.permissions ADD CONSTRAINT permissions_org_name_unique UNIQUE (org_id, name);

-- Step 3: Verify org_id is NOT NULL (should already be the case)
-- This is just a verification, not a change
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

-- Step 4: Create manage_users and view_settings permissions for all existing organizations
WITH org_permissions AS (
    SELECT 
        o.org_id,
        unnest(ARRAY['manage_users', 'view_settings']) as permission_name,
        CASE 
            WHEN unnest(ARRAY['manage_users', 'view_settings']) = 'manage_users' THEN 'Manage Users'
            WHEN unnest(ARRAY['manage_users', 'view_settings']) = 'view_settings' THEN 'View Settings'
        END as display_name,
        CASE 
            WHEN unnest(ARRAY['manage_users', 'view_settings']) = 'manage_users' THEN 'users'
            WHEN unnest(ARRAY['manage_users', 'view_settings']) = 'view_settings' THEN 'settings'
        END as category,
        CASE 
            WHEN unnest(ARRAY['manage_users', 'view_settings']) = 'manage_users' THEN 'Permission to manage user accounts and assignments'
            WHEN unnest(ARRAY['manage_users', 'view_settings']) = 'view_settings' THEN 'Permission to view system and organization settings'
        END as description
    FROM public.organizations o
    WHERE NOT EXISTS (
        SELECT 1 FROM public.permissions p 
        WHERE p.org_id = o.org_id 
        AND p.name = unnest(ARRAY['manage_users', 'view_settings'])
    )
)
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT org_id, permission_name, display_name, category, description
FROM org_permissions;

-- Step 5: Final report showing all constraints and created permissions
SELECT 
    'CONSTRAINTS REPORT' as report_type,
    '' as org_name,
    '' as permission_name,
    'permissions_org_name_unique: UNIQUE(org_id, name)' as status;

-- Report: Show all manage_users and view_settings permissions by organization
SELECT 
    'PERMISSIONS REPORT' as report_type,
    o.name as org_name,
    p.name as permission_name,
    p.display_name,
    p.category,
    'Created or verified' as status
FROM public.permissions p
JOIN public.organizations o ON o.org_id = p.org_id
WHERE p.name IN ('manage_users', 'view_settings')
ORDER BY o.name, p.name;