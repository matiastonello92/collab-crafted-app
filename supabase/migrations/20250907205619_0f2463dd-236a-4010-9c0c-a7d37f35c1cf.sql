-- HOTFIX: Drop and recreate invitation_accept_v2 to fix "record irl is not assigned yet"
DROP FUNCTION IF EXISTS public.invitation_accept_v2(text);

CREATE OR REPLACE FUNCTION public.invitation_accept_v2(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid          uuid := auth.uid();
  inv          public.invitations%rowtype;
  rl           record;            -- loop record (renamed from irl to avoid collisions)
  ip           record;
  ijt          record;
  role_name_   text;
  exists_row   boolean;
BEGIN
  -- Authentication check
  IF uid IS NULL THEN 
    RETURN json_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  -- Load invitation and lock it
  SELECT * INTO inv
  FROM public.invitations
  WHERE token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN 
    RETURN json_build_object('ok', false, 'code', 'INVALID_TOKEN');
  END IF;
  
  IF inv.accepted_at IS NOT NULL THEN 
    RETURN json_build_object('ok', false, 'code', 'TOKEN_ALREADY_USED');
  END IF;
  
  IF inv.status = 'revoked' OR now() >= inv.expires_at THEN 
    RETURN json_build_object('ok', false, 'code', 'TOKEN_NOT_VALID');
  END IF;

  -- Email validation
  IF lower((SELECT email FROM auth.users WHERE id = uid)) <> lower(inv.email) THEN
    RETURN json_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  -- Guard: check if invitation has any roles/locations associated
  IF NOT EXISTS (
    SELECT 1 FROM public.invitation_roles_locations
    WHERE invitation_id = inv.id
  ) THEN
    RETURN json_build_object('ok', false, 'code', 'INVITE_NO_ROLES');
  END IF;

  -- Safe loop: 'rl' is the loop record; table alias remains 'irl'
  FOR rl IN
    SELECT irl.role_id, irl.location_id, r.name as role_name
    FROM public.invitation_roles_locations AS irl
    JOIN public.roles r ON r.id = irl.role_id
    WHERE irl.invitation_id = inv.id
  LOOP
    role_name_ := coalesce(rl.role_name,'');

    -- Upsert role assignment using rl (loop record)
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles_locations
      WHERE user_id = uid AND role_id = rl.role_id AND location_id = rl.location_id
    ) INTO exists_row;

    IF exists_row THEN
      UPDATE public.user_roles_locations
      SET is_active = true, assigned_by = coalesce(assigned_by, uid), assigned_at = now()
      WHERE user_id = uid AND role_id = rl.role_id AND location_id = rl.location_id;
    ELSE
      INSERT INTO public.user_roles_locations(user_id, role_id, location_id, assigned_by, is_active)
      VALUES (uid, rl.role_id, rl.location_id, uid, true);
    END IF;

    -- Handle manager role
    IF lower(role_name_) = 'manager' THEN
      INSERT INTO public.location_admins(location_id, user_id)
      VALUES (rl.location_id, uid)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Permission overrides per-location
  FOR ip IN
    SELECT ip.permission_id, ip.location_id, ip.granted
    FROM public.invitation_permissions ip
    WHERE ip.invitation_id = inv.id
  LOOP
    IF ip.permission_id IS NULL OR ip.location_id IS NULL THEN 
      CONTINUE; 
    END IF;

    INSERT INTO public.user_permissions(user_id, permission_id, location_id, granted, granted_by)
    VALUES (uid, ip.permission_id, ip.location_id, coalesce(ip.granted,true), uid)
    ON CONFLICT (user_id, permission_id, location_id)
    DO UPDATE SET granted = excluded.granted, granted_by = excluded.granted_by, granted_at = now();
  END LOOP;

  -- Job tags per-location
  FOR ijt IN
    SELECT tag_id, location_id
    FROM public.invitation_job_tags
    WHERE invitation_id = inv.id
  LOOP
    INSERT INTO public.user_job_tags(user_id, tag_id, location_id, assigned_by)
    VALUES (uid, ijt.tag_id, ijt.location_id, uid)
    ON CONFLICT (user_id, tag_id, location_id) DO NOTHING;
  END LOOP;

  -- Complete the acceptance (NO reference to 'rl' here - it's out of scope)
  UPDATE public.invitations
  SET accepted_at = now(), status = 'accepted'
  WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'code', 'INVITE_ACCEPTED');
EXCEPTION
  WHEN others THEN
    -- Re-raise the exception for proper error handling
    RAISE;
END;
$$;