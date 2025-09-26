-- =====================================================
-- Permission Tags Module - Idempotent Migration
-- =====================================================

-- Ensure required roles exist
INSERT INTO roles (id, code, name, description) VALUES 
    (gen_random_uuid(), 'admin', 'Administrator', 'Full administrative access'),
    (gen_random_uuid(), 'manager', 'Manager', 'Management level access'), 
    (gen_random_uuid(), 'base', 'Base User', 'Basic user access'),
    (gen_random_uuid(), 'platform_admin', 'Platform Admin', 'Platform administration access')
ON CONFLICT (code) DO NOTHING;

-- Create required module permissions if they don't exist
INSERT INTO permissions (name, description) VALUES
    -- Inventory permissions
    ('inventory:view', 'View inventory items'),
    ('inventory:create', 'Create inventory items'),
    ('inventory:update', 'Update inventory items'),
    ('inventory:delete', 'Delete inventory items'),
    ('inventory:export', 'Export inventory data'),
    
    -- Suppliers permissions  
    ('suppliers:view', 'View suppliers'),
    ('suppliers:create', 'Create suppliers'),
    ('suppliers:update', 'Update suppliers'),
    ('suppliers:delete', 'Delete suppliers'),
    ('suppliers:export', 'Export supplier data'),
    
    -- Purchase Orders permissions
    ('purchase_orders:view', 'View purchase orders'),
    ('purchase_orders:create', 'Create purchase orders'),
    ('purchase_orders:update', 'Update purchase orders'),
    ('purchase_orders:approve', 'Approve purchase orders'),
    ('purchase_orders:send', 'Send purchase orders'),
    ('purchase_orders:receive', 'Receive purchase orders'),
    ('purchase_orders:export', 'Export purchase order data'),
    
    -- HACCP permissions
    ('haccp:view', 'View HACCP records'),
    ('haccp:check', 'Perform HACCP checks'),
    ('haccp:sign', 'Sign HACCP documents'),
    ('haccp:export', 'Export HACCP data'),
    
    -- Technicians permissions
    ('technicians:view', 'View technician records'),
    ('technicians:create', 'Create technician records'),
    ('technicians:update', 'Update technician records'),
    ('technicians:close', 'Close technician tasks'),
    ('technicians:export', 'Export technician data'),
    
    -- Incidents permissions
    ('incidents:view', 'View incidents'),
    ('incidents:create', 'Create incidents'),
    ('incidents:update', 'Update incidents'),
    ('incidents:close', 'Close incidents'),
    ('incidents:export', 'Export incident data'),
    
    -- Tasks permissions
    ('tasks:view', 'View tasks'),
    ('tasks:create', 'Create tasks'),
    ('tasks:update', 'Update tasks'),
    ('tasks:complete', 'Complete tasks'),
    ('tasks:export', 'Export task data'),
    
    -- Widgets permissions
    ('widgets:view', 'View dashboard widgets'),
    ('widgets:configure', 'Configure dashboard widgets'),
    
    -- Import/Export permissions
    ('import_export:import', 'Import data'),
    ('import_export:export', 'Export data'),
    
    -- Settings permissions
    ('settings:view', 'View settings'),
    ('settings:update', 'Update settings'),
    
    -- Webhooks permissions
    ('webhooks:view', 'View webhooks'),
    ('webhooks:create', 'Create webhooks'),
    ('webhooks:delete', 'Delete webhooks')
ON CONFLICT (name) DO NOTHING;

-- Set up default admin permissions (admin gets everything)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'admin'
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Set up default manager permissions (selective access)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'manager'
AND p.name IN (
    'inventory:view', 'inventory:create', 'inventory:update', 'inventory:export',
    'suppliers:view', 'suppliers:create', 'suppliers:update', 'suppliers:export',
    'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:update', 'purchase_orders:approve', 'purchase_orders:export',
    'haccp:view', 'haccp:check', 'haccp:export',
    'technicians:view', 'technicians:create', 'technicians:update', 'technicians:export',
    'incidents:view', 'incidents:create', 'incidents:update', 'incidents:close', 'incidents:export',
    'tasks:view', 'tasks:create', 'tasks:update', 'tasks:complete', 'tasks:export',
    'widgets:view',
    'import_export:export',
    'settings:view'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Set up default base user permissions (read-only + basic actions)
INSERT INTO role_permissions (role_id, permission_id)
SELECT 
    r.id as role_id,
    p.id as permission_id
FROM roles r
CROSS JOIN permissions p
WHERE r.code = 'base'
AND p.name IN (
    'inventory:view',
    'suppliers:view', 
    'purchase_orders:view',
    'haccp:view', 'haccp:check',
    'technicians:view',
    'incidents:view', 'incidents:create',
    'tasks:view', 'tasks:update', 'tasks:complete',
    'widgets:view',
    'settings:view'
)
AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
);

-- Create function to check if user is platform admin
CREATE OR REPLACE FUNCTION is_platform_admin(user_id UUID DEFAULT auth.uid())
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM user_roles_locations url
        JOIN roles r ON r.id = url.role_id
        WHERE url.user_id = $1
        AND r.code = 'platform_admin'
    );
$$;

-- Create RLS policy for platform admin access to permission management
CREATE POLICY "Platform admins can manage all permissions" ON permissions
    FOR ALL USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all role permissions" ON role_permissions
    FOR ALL USING (is_platform_admin());

CREATE POLICY "Platform admins can manage all user roles" ON user_roles_locations
    FOR ALL USING (is_platform_admin());

-- Grant platform admin role to first user (bootstrap)
-- This should be manually assigned to the actual platform admin
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
    
    -- Get first user (you can modify this logic)
    SELECT id INTO first_user_id 
    FROM users ORDER BY created_at LIMIT 1;
    
    -- Assign platform admin role if we have all required data
    IF platform_admin_role_id IS NOT NULL AND first_user_id IS NOT NULL AND demo_org_id IS NOT NULL THEN
        INSERT INTO user_roles_locations (user_id, role_id, organization_id, location_id)
        VALUES (first_user_id, platform_admin_role_id, demo_org_id, NULL)
        ON CONFLICT (user_id, role_id, organization_id, COALESCE(location_id, '00000000-0000-0000-0000-000000000000'::uuid)) 
        DO NOTHING;
    END IF;
END $$;