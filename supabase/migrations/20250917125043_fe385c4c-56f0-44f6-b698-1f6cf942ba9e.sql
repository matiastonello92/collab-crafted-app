-- Create function for organization bootstrap with first admin

CREATE OR REPLACE FUNCTION public.organization_bootstrap(
  p_user_id uuid,
  p_org_name text DEFAULT 'My Organization',
  p_location_name text DEFAULT 'Main Location'
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_org_id uuid;
  new_location_id uuid;
  admin_role_id uuid;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR p_org_name IS NULL OR p_location_name IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'invalid_input');
  END IF;

  -- Check if user already has an organization
  IF EXISTS (SELECT 1 FROM memberships WHERE user_id = p_user_id) THEN
    RETURN json_build_object('ok', false, 'error', 'user_already_has_org');
  END IF;

  BEGIN
    -- Create organization
    INSERT INTO organizations (name, status, timezone)
    VALUES (p_org_name, 'active', 'Europe/Rome')
    RETURNING org_id INTO new_org_id;

    -- Get admin role for the organization
    SELECT id INTO admin_role_id
    FROM roles 
    WHERE org_id = new_org_id AND name = 'admin'
    LIMIT 1;

    -- If no admin role exists, this is an error (roles should be pre-created)
    IF admin_role_id IS NULL THEN
      -- Create admin role if it doesn't exist
      INSERT INTO roles (org_id, name, display_name, description, level)
      VALUES (new_org_id, 'admin', 'Administrator', 'Amministratore dell\'organizzazione', 100)
      RETURNING id INTO admin_role_id;
    END IF;

    -- Create main location
    INSERT INTO locations (org_id, name, status, timezone)
    VALUES (new_org_id, p_location_name, 'active', 'Europe/Rome')
    RETURNING id INTO new_location_id;

    -- Create membership with admin role
    INSERT INTO memberships (user_id, org_id, role)
    VALUES (p_user_id, new_org_id, 'admin');

    -- Assign admin role to user for the location
    INSERT INTO user_roles_locations (user_id, role_id, location_id, org_id, assigned_by, is_active)
    VALUES (p_user_id, admin_role_id, new_location_id, new_org_id, p_user_id, true);

    -- Create/update profile with org and default location
    INSERT INTO profiles (id, org_id, default_location_id)
    VALUES (p_user_id, new_org_id, new_location_id)
    ON CONFLICT (id) 
    DO UPDATE SET 
      org_id = excluded.org_id,
      default_location_id = excluded.default_location_id;

    RETURN json_build_object(
      'ok', true,
      'org_id', new_org_id,
      'location_id', new_location_id,
      'role_id', admin_role_id
    );

  EXCEPTION WHEN others THEN
    RETURN json_build_object('ok', false, 'error', SQLERRM);
  END;
END;
$$;