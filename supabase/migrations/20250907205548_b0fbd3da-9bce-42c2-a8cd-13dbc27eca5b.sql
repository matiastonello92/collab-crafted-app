-- HOTFIX: invitation_accept_v2 — safe loop + guard to fix "record irl is not assigned yet"
CREATE OR REPLACE FUNCTION public.invitation_accept_v2(p_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv   public.invitations%rowtype;
  rl    record;            -- loop record (renamed from irl to avoid collisions)
  had_rows boolean := false;
BEGIN
  -- 1) Load invitation and lock it
  SELECT *
    INTO inv
  FROM public.invitations
  WHERE token = p_token
    AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('ok', false, 'code', 'INVITE_NOT_FOUND_OR_PENDING_MISSING');
  END IF;

  -- 2) Guard: no roles/locations associated → handle in controlled way
  IF NOT EXISTS (
    SELECT 1 FROM public.invitation_roles_locations
    WHERE invitation_id = inv.id
  ) THEN
    RETURN json_build_object('ok', false, 'code', 'INVITE_NO_ROLES');
  END IF;

  -- 3) Safe loop: 'rl' is the loop record; table alias remains 'irl'
  FOR rl IN
    SELECT
      irl.role_id,
      irl.location_id,
      r.name as role_name
    FROM public.invitation_roles_locations AS irl
    JOIN public.roles r ON r.id = irl.role_id
    WHERE irl.invitation_id = inv.id
  LOOP
    had_rows := true;

    -- Insert user role assignments using rl (loop record)
    INSERT INTO public.user_roles_locations (user_id, role_id, location_id, assigned_by, assigned_at)
    VALUES (auth.uid(), rl.role_id, rl.location_id, inv.invited_by, now())
    ON CONFLICT (user_id, role_id, location_id) DO NOTHING;

    -- Handle permission overrides if they exist
    INSERT INTO public.user_permissions (user_id, permission_id, location_id, granted, granted_by, granted_at)
    SELECT 
      auth.uid(), 
      ip.permission_id, 
      ip.location_id, 
      ip.granted, 
      inv.invited_by, 
      now()
    FROM public.invitation_permissions ip
    WHERE ip.invitation_id = inv.id
      AND (ip.location_id = rl.location_id OR ip.location_id IS NULL)
    ON CONFLICT (user_id, permission_id, location_id) DO NOTHING;

    -- Handle job tags if they exist
    INSERT INTO public.user_job_tags (user_id, tag_id, location_id, assigned_by, assigned_at)
    SELECT 
      auth.uid(), 
      ijt.tag_id, 
      ijt.location_id, 
      inv.invited_by, 
      now()
    FROM public.invitation_job_tags ijt
    WHERE ijt.invitation_id = inv.id
      AND ijt.location_id = rl.location_id
    ON CONFLICT (user_id, tag_id, location_id) DO NOTHING;

  END LOOP;

  -- 4) Complete the acceptance (NO reference to 'rl' here - it might not be assigned if loop didn't execute)
  UPDATE public.invitations
     SET status = 'accepted',
         accepted_at = now()
   WHERE id = inv.id;

  RETURN json_build_object('ok', true, 'code', 'INVITE_ACCEPTED');
EXCEPTION
  WHEN others THEN
    -- Re-raise the exception for proper error handling
    RAISE;
END;
$$;