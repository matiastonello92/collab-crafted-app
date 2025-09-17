-- Fix invitation acceptance flow to handle memberships, org_id consistency and default_location_id

CREATE OR REPLACE FUNCTION public.invitation_accept_v2(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid          uuid := auth.uid();
  inv          public.invitations%rowtype;
  rl           record;
  perm_rec     record;
  jt_rec       record;
  role_name_   text;
  exists_row   boolean;
  first_location_id uuid;
  current_org_id uuid;
BEGIN
  -- Autenticazione
  IF uid IS NULL THEN 
    RETURN json_build_object('ok', false, 'code', 'NOT_AUTHENTICATED');
  END IF;

  -- Carica invito e bloccalo
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

  -- Email deve combaciare
  IF lower((SELECT email FROM auth.users WHERE id = uid)) <> lower(inv.email) THEN
    RETURN json_build_object('ok', false, 'code', 'EMAIL_MISMATCH');
  END IF;

  -- Guard: invito deve avere almeno un ruolo/location collegato
  IF NOT EXISTS (
    SELECT 1 FROM public.invitation_roles_locations
    WHERE invitation_id = inv.id
  ) THEN
    RETURN json_build_object('ok', false, 'code', 'INVITE_NO_ROLES');
  END IF;

  -- Get organization ID from invitation
  current_org_id := inv.org_id;

  -- Create membership for the organization if not exists
  INSERT INTO public.memberships (user_id, org_id, role)
  VALUES (uid, current_org_id, 'base')
  ON CONFLICT (user_id, org_id) DO NOTHING;

  -- Loop ruoli/location
  first_location_id := NULL;
  FOR rl IN
    SELECT irl.role_id, irl.location_id, r.name as role_name
    FROM public.invitation_roles_locations AS irl
    JOIN public.roles r ON r.id = irl.role_id
    WHERE irl.invitation_id = inv.id
  LOOP
    role_name_ := coalesce(rl.role_name,'');
    
    -- Store first location for default_location_id
    IF first_location_id IS NULL THEN
      first_location_id := rl.location_id;
    END IF;

    -- Upsert assegnazione ruolo with org_id consistency
    SELECT EXISTS(
      SELECT 1 FROM public.user_roles_locations
      WHERE user_id = uid AND role_id = rl.role_id AND location_id = rl.location_id
    ) INTO exists_row;

    IF exists_row THEN
      UPDATE public.user_roles_locations
      SET is_active = true, assigned_by = coalesce(assigned_by, uid), assigned_at = now()
      WHERE user_id = uid AND role_id = rl.role_id AND location_id = rl.location_id;
    ELSE
      INSERT INTO public.user_roles_locations(user_id, role_id, location_id, assigned_by, is_active, org_id)
      VALUES (uid, rl.role_id, rl.location_id, uid, true, current_org_id);
    END IF;

    -- Update membership role if this is admin or manager
    IF lower(role_name_) IN ('admin', 'manager') THEN
      UPDATE public.memberships 
      SET role = CASE 
        WHEN lower(role_name_) = 'admin' THEN 'admin'
        WHEN lower(role_name_) = 'manager' THEN 'manager'
        ELSE role
      END
      WHERE user_id = uid AND org_id = current_org_id;
    END IF;

    -- Se ruolo è manager, aggiungi a location_admins with org_id
    IF lower(role_name_) = 'manager' THEN
      INSERT INTO public.location_admins(location_id, user_id, org_id)
      VALUES (rl.location_id, uid, current_org_id)
      ON CONFLICT (location_id, user_id) DO NOTHING;
    END IF;
  END LOOP;

  -- Loop permessi invito
  FOR perm_rec IN
    SELECT ipp.permission_id, ipp.location_id, ipp.granted
    FROM public.invitation_permissions AS ipp
    WHERE ipp.invitation_id = inv.id
  LOOP
    IF perm_rec.permission_id IS NULL OR perm_rec.location_id IS NULL THEN 
      CONTINUE; 
    END IF;

    INSERT INTO public.user_permissions(user_id, permission_id, location_id, granted, granted_by, org_id)
    VALUES (uid, perm_rec.permission_id, perm_rec.location_id, coalesce(perm_rec.granted,true), uid, current_org_id)
    ON CONFLICT (user_id, permission_id, location_id)
    DO UPDATE SET granted = excluded.granted, granted_by = excluded.granted_by, granted_at = now();
  END LOOP;

  -- Loop job tags per-location
  FOR jt_rec IN
    SELECT ijt.tag_id, ijt.location_id
    FROM public.invitation_job_tags ijt
    WHERE ijt.invitation_id = inv.id
  LOOP
    INSERT INTO public.user_job_tags(user_id, tag_id, location_id, assigned_by, org_id)
    VALUES (uid, jt_rec.tag_id, jt_rec.location_id, uid, current_org_id)
    ON CONFLICT (user_id, tag_id, location_id) DO NOTHING;
  END LOOP;

  -- Set default_location_id in profile if not already set and we have a location
  IF first_location_id IS NOT NULL THEN
    INSERT INTO public.profiles (id, org_id, default_location_id)
    VALUES (uid, current_org_id, first_location_id)
    ON CONFLICT (id) 
    DO UPDATE SET 
      default_location_id = COALESCE(profiles.default_location_id, excluded.default_location_id),
      org_id = COALESCE(profiles.org_id, excluded.org_id);
  END IF;

  -- Completa accettazione
  UPDATE public.invitations
  SET accepted_at = now(), status = 'accepted'
  WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'code', 'INVITE_ACCEPTED');
EXCEPTION
  WHEN others THEN
    RAISE;
END;
$$;