
create or replace function public.invitation_accept_v2(p_token text)
returns json
language plpgsql
security definer
set search_path = public
as $$
DECLARE
  uid          uuid := auth.uid();
  inv          public.invitations%rowtype;
  rl           record;         -- loop record per ruoli/location
  perm_rec     record;         -- loop record per permessi (rinominato da 'ip')
  jt_rec       record;         -- loop record per job tags (rinominato da 'ijt')
  role_name_   text;
  exists_row   boolean;
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

  -- Loop ruoli/location
  FOR rl IN
    SELECT irl.role_id, irl.location_id, r.name as role_name
    FROM public.invitation_roles_locations AS irl
    JOIN public.roles r ON r.id = irl.role_id
    WHERE irl.invitation_id = inv.id
  LOOP
    role_name_ := coalesce(rl.role_name,'');

    -- Upsert assegnazione ruolo
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

    -- Se ruolo è manager, aggiungi a location_admins
    IF lower(role_name_) = 'manager' THEN
      INSERT INTO public.location_admins(location_id, user_id)
      VALUES (rl.location_id, uid)
      ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;

  -- Loop permessi invito (rinominati alias e record per evitare collisioni)
  FOR perm_rec IN
    SELECT ipp.permission_id, ipp.location_id, ipp.granted
    FROM public.invitation_permissions AS ipp
    WHERE ipp.invitation_id = inv.id
  LOOP
    IF perm_rec.permission_id IS NULL OR perm_rec.location_id IS NULL THEN 
      CONTINUE; 
    END IF;

    INSERT INTO public.user_permissions(user_id, permission_id, location_id, granted, granted_by)
    VALUES (uid, perm_rec.permission_id, perm_rec.location_id, coalesce(perm_rec.granted,true), uid)
    ON CONFLICT (user_id, permission_id, location_id)
    DO UPDATE SET granted = excluded.granted, granted_by = excluded.granted_by, granted_at = now();
  END LOOP;

  -- Loop job tags per-location (rinominato record)
  FOR jt_rec IN
    SELECT ijt.tag_id, ijt.location_id
    FROM public.invitation_job_tags ijt
    WHERE ijt.invitation_id = inv.id
  LOOP
    INSERT INTO public.user_job_tags(user_id, tag_id, location_id, assigned_by)
    VALUES (uid, jt_rec.tag_id, jt_rec.location_id, uid)
    ON CONFLICT (user_id, tag_id, location_id) DO NOTHING;
  END LOOP;

  -- Completa accettazione
  UPDATE public.invitations
  SET accepted_at = now(), status = 'accepted'
  WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'code', 'INVITE_ACCEPTED');
EXCEPTION
  WHEN others THEN
    -- Propaga per debug (manteniamo il comportamento attuale)
    RAISE;
END;
$$;
