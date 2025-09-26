-- =====================================================
-- Klyra Staff Management - Database Setup
-- =====================================================

-- Create organizations table if not exists
CREATE TABLE IF NOT EXISTS organizations (
    org_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create locations table if not exists
CREATE TABLE IF NOT EXISTS locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create memberships table (user-organization relationships)
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    org_id UUID NOT NULL REFERENCES organizations(org_id) ON DELETE CASCADE,
    role TEXT DEFAULT 'member',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, org_id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert basic permissions
INSERT INTO permissions (name, description) VALUES
    ('users:manage', 'Manage users'),
    ('users:view', 'View users'),
    ('locations:manage', 'Manage locations'),
    ('locations:view', 'View locations'),
    ('admin:access', 'Admin panel access'),
    ('*', 'All permissions (admin)')
ON CONFLICT (name) DO NOTHING;

-- Create user_permissions table for direct permission assignments
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    granted BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, permission_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- Organizations: Users can only see orgs they're members of
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
CREATE POLICY "Users can view their organizations" ON organizations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships m 
            WHERE m.user_id = auth.uid() 
            AND m.org_id = organizations.org_id
        )
    );

-- Locations: Users can see locations in their orgs
DROP POLICY IF EXISTS "Users can view locations in their orgs" ON locations;
CREATE POLICY "Users can view locations in their orgs" ON locations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM memberships m 
            WHERE m.user_id = auth.uid() 
            AND m.org_id = locations.org_id
        )
    );

-- Users: Users can see themselves
DROP POLICY IF EXISTS "Users can view themselves" ON users;
CREATE POLICY "Users can view themselves" ON users
    FOR SELECT USING (id = auth.uid());

-- Memberships: Users can see their own memberships
DROP POLICY IF EXISTS "Users can view their memberships" ON memberships;
CREATE POLICY "Users can view their memberships" ON memberships
    FOR SELECT USING (user_id = auth.uid());

-- Permissions: All authenticated users can view permissions
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
CREATE POLICY "Authenticated users can view permissions" ON permissions
    FOR SELECT USING (auth.role() = 'authenticated');

-- User permissions: Users can see their own permissions
DROP POLICY IF EXISTS "Users can view their permissions" ON user_permissions;
CREATE POLICY "Users can view their permissions" ON user_permissions
    FOR SELECT USING (user_id = auth.uid());

-- Insert demo organization and location
INSERT INTO organizations (org_id, name, slug) VALUES 
    ('550e8400-e29b-41d4-a716-446655440000', 'Demo Organization', 'demo-org')
ON CONFLICT (org_id) DO NOTHING;

INSERT INTO locations (id, org_id, name) VALUES 
    ('550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440000', 'Main Location')
ON CONFLICT (id) DO NOTHING;

-- Function to bootstrap user (will be called from the app)
CREATE OR REPLACE FUNCTION bootstrap_user(user_email TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id UUID;
    org_uuid UUID;
    location_uuid UUID;
    admin_perm_id UUID;
    result JSONB;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;
    
    -- Get demo org and location
    SELECT org_id INTO org_uuid FROM organizations WHERE slug = 'demo-org' LIMIT 1;
    SELECT id INTO location_uuid FROM locations WHERE org_id = org_uuid LIMIT 1;
    
    -- Insert user if not exists
    INSERT INTO users (id, email) VALUES (current_user_id, user_email)
    ON CONFLICT (id) DO UPDATE SET email = user_email;
    
    -- Create membership
    INSERT INTO memberships (user_id, org_id, role) VALUES (current_user_id, org_uuid, 'admin')
    ON CONFLICT (user_id, org_id) DO UPDATE SET role = 'admin';
    
    -- Grant admin permissions
    SELECT id INTO admin_perm_id FROM permissions WHERE name = '*' LIMIT 1;
    INSERT INTO user_permissions (user_id, permission_id, granted) VALUES (current_user_id, admin_perm_id, true)
    ON CONFLICT (user_id, permission_id) DO UPDATE SET granted = true;
    
    result := jsonb_build_object(
        'success', true,
        'user_id', current_user_id,
        'org_id', org_uuid,
        'location_id', location_uuid
    );
    
    RETURN result;
END;
$$;