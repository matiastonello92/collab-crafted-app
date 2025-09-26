-- =====================================================
-- Setup Platform Admin for Testing
-- =====================================================

-- First, ensure the platform_admin role exists
INSERT INTO roles (id, code, name, description) VALUES 
    (gen_random_uuid(), 'platform_admin', 'Platform Admin', 'Platform administration access')
ON CONFLICT (code) DO NOTHING;

-- Get the current user ID (you'll need to replace this with actual user ID)
-- To find your user ID, run: SELECT id, email FROM auth.users LIMIT 1;

-- Example: Assign platform admin to the first user in the system
DO $$
DECLARE
    platform_admin_role_id UUID;
    first_user_id UUID;
    demo_org_id UUID;
BEGIN
    -- Get platform admin role ID
    SELECT id INTO platform_admin_role_id 
    FROM roles WHERE code = 'platform_admin';
    
    -- Get demo org ID  
    SELECT org_id INTO demo_org_id
    FROM organizations WHERE slug = 'demo-org' LIMIT 1;
    
    -- Get first user
    SELECT id INTO first_user_id 
    FROM users ORDER BY created_at LIMIT 1;
    
    -- Assign platform admin role if we have all required data
    IF platform_admin_role_id IS NOT NULL AND first_user_id IS NOT NULL AND demo_org_id IS NOT NULL THEN
        INSERT INTO user_roles_locations (user_id, role_id, organization_id, location_id)
        VALUES (first_user_id, platform_admin_role_id, demo_org_id, NULL)
        ON CONFLICT (user_id, role_id, organization_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
        DO NOTHING;
        
        RAISE NOTICE 'Platform Admin role assigned to user: %', first_user_id;
    ELSE
        RAISE NOTICE 'Could not assign Platform Admin role. Missing: role_id=%, user_id=%, org_id=%', 
                     platform_admin_role_id, first_user_id, demo_org_id;
    END IF;
END $$;

-- Verify the assignment
SELECT 
    u.email,
    r.name as role_name,
    o.name as organization_name
FROM user_roles_locations url
JOIN users u ON u.id = url.user_id
JOIN roles r ON r.id = url.role_id  
JOIN organizations o ON o.org_id = url.organization_id
WHERE r.code = 'platform_admin';