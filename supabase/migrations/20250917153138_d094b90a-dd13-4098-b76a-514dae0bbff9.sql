-- Automatic default permissions creation for new organizations
-- This ensures every new org gets standard RBAC permissions automatically

-- Step 1: Create function to add default permissions for an organization
CREATE OR REPLACE FUNCTION public.create_default_permissions_for_org(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    permissions_created INTEGER := 0;
BEGIN
    -- Insert default permissions for the organization
    INSERT INTO public.permissions (org_id, name, display_name, category, description)
    VALUES 
        (p_org_id, 'manage_users', 'Manage Users', 'users', 'Create, edit, delete user accounts and manage user assignments'),
        (p_org_id, 'view_settings', 'View Settings', 'settings', 'View system and organization settings'),
        (p_org_id, 'assign_roles', 'Assign Roles', 'users', 'Assign and manage user roles and permissions'),
        (p_org_id, 'edit_locations', 'Edit Locations', 'locations', 'Create, edit and manage organization locations'),
        (p_org_id, 'access_dashboard', 'Access Dashboard', 'general', 'Access to administrative dashboard and analytics'),
        (p_org_id, 'invite_users', 'Invite Users', 'users', 'Send invitations to new users to join the organization')
    ON CONFLICT (org_id, name) DO NOTHING;
    
    -- Count how many permissions were actually inserted
    GET DIAGNOSTICS permissions_created = ROW_COUNT;
    
    -- Log the operation for audit purposes
    RAISE NOTICE 'Created % default permissions for organization %', permissions_created, p_org_id;
    
    RETURN permissions_created;
END;
$$;

-- Step 2: Create trigger function that runs after organization insert
CREATE OR REPLACE FUNCTION public.trigger_create_default_permissions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    created_count INTEGER;
BEGIN
    -- Call the function to create default permissions for the new organization
    SELECT public.create_default_permissions_for_org(NEW.org_id) INTO created_count;
    
    -- Log successful creation
    RAISE NOTICE 'Auto-created % permissions for new organization: % (ID: %)', 
                 created_count, NEW.name, NEW.org_id;
    
    RETURN NEW;
END;
$$;

-- Step 3: Create the trigger on organizations table
DROP TRIGGER IF EXISTS auto_create_permissions_on_org_insert ON public.organizations;
CREATE TRIGGER auto_create_permissions_on_org_insert
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_create_default_permissions();

-- Step 4: Apply default permissions to existing organizations that don't have them
DO $$
DECLARE
    org_record RECORD;
    created_count INTEGER;
    total_created INTEGER := 0;
BEGIN
    FOR org_record IN SELECT org_id, name FROM public.organizations LOOP
        SELECT public.create_default_permissions_for_org(org_record.org_id) INTO created_count;
        total_created := total_created + created_count;
        
        IF created_count > 0 THEN
            RAISE NOTICE 'Added % missing permissions to existing org: % (ID: %)', 
                         created_count, org_record.name, org_record.org_id;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'TOTAL: Added % permissions to existing organizations', total_created;
END;
$$;

-- Final report: Show all organizations and their default permissions
SELECT 
    'ORGANIZATIONS WITH DEFAULT PERMISSIONS' as report_section,
    o.name as org_name,
    o.org_id,
    COUNT(p.id) as permissions_count,
    'Complete' as status
FROM public.organizations o
LEFT JOIN public.permissions p ON p.org_id = o.org_id 
WHERE p.name IN ('manage_users', 'view_settings', 'assign_roles', 'edit_locations', 'access_dashboard', 'invite_users')
GROUP BY o.org_id, o.name
ORDER BY o.name;

-- Detailed permissions report
SELECT 
    'DETAILED PERMISSIONS REPORT' as report_section,
    o.name as org_name,
    p.name as permission_name,
    p.display_name,
    p.category,
    'Active' as status
FROM public.organizations o
JOIN public.permissions p ON p.org_id = o.org_id
WHERE p.name IN ('manage_users', 'view_settings', 'assign_roles', 'edit_locations', 'access_dashboard', 'invite_users')
ORDER BY o.name, p.category, p.name;