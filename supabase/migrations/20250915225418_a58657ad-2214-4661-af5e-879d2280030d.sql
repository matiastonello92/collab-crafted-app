-- Complete Platform/Admin separation RPC functions
-- All functions are SECURITY DEFINER with proper access control

-- Core platform admin function (already exists but ensure it's using platform_admins table)
CREATE OR REPLACE FUNCTION public.is_platform_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'platform_admin')::boolean, 
    false
  ) OR EXISTS (
    SELECT 1 FROM platform_admins pa WHERE pa.user_id = auth.uid()
  );
$$;

-- Core org admin function
CREATE OR REPLACE FUNCTION public.is_org_admin(p_org uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT is_platform_admin() OR EXISTS (
    SELECT 1 FROM memberships m 
    WHERE m.org_id = p_org 
      AND m.user_id = auth.uid() 
      AND m.role = 'admin'
  );
$$;

-- Platform RPC: Cross-tenant org counts
CREATE OR REPLACE FUNCTION public.platform_org_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  SELECT jsonb_build_object(
    'total_orgs', (SELECT count(*) FROM organizations),
    'total_users', (SELECT count(*) FROM profiles),
    'active_users_30d', (SELECT count(*) FROM profiles WHERE updated_at > now() - interval '30 days'),
    'total_locations', (SELECT count(*) FROM locations),
    'pending_invites', (SELECT count(*) FROM invitations WHERE status = 'pending')
  ) INTO result;

  RETURN result;
END;
$$;

-- Platform RPC: Plans overview
CREATE OR REPLACE FUNCTION public.platform_plans_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  SELECT jsonb_build_object(
    'plans_by_tier', (
      SELECT COALESCE(jsonb_object_agg(p.key, COALESCE(org_counts.count, 0)), '{}'::jsonb)
      FROM plans p
      LEFT JOIN (
        SELECT op.plan_id, count(*) as count
        FROM org_plans op
        WHERE op.active_to IS NULL OR now() BETWEEN op.active_from AND op.active_to
        GROUP BY op.plan_id
      ) org_counts ON p.plan_id = org_counts.plan_id
    ),
    'feature_overrides_count', (SELECT count(*) FROM org_feature_overrides)
  ) INTO result;

  RETURN result;
END;
$$;

-- Platform RPC: Recent audit events
CREATE OR REPLACE FUNCTION public.platform_audit_recent(p_limit integer DEFAULT 20)
RETURNS TABLE(id bigint, event_key text, org_id uuid, user_id uuid, created_at timestamp with time zone, payload jsonb)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate platform admin
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: platform admin required';
  END IF;

  RETURN QUERY
  SELECT ae.id, ae.event_key, ae.org_id, ae.user_id, ae.created_at, ae.payload
  FROM audit_events ae
  ORDER BY ae.created_at DESC
  LIMIT p_limit;
END;
$$;

-- Org RPC: Dashboard stats for specific org
CREATE OR REPLACE FUNCTION public.org_dashboard_stats(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Validate org admin
  IF NOT is_org_admin(p_org_id) THEN
    RAISE EXCEPTION 'Access denied: org admin required';
  END IF;

  SELECT jsonb_build_object(
    'users_total', (SELECT count(*) FROM memberships WHERE org_id = p_org_id),
    'locations_total', (SELECT count(*) FROM locations WHERE org_id = p_org_id),
    'invites_pending', (SELECT count(*) FROM invitations WHERE org_id = p_org_id AND status = 'pending'),
    'audit_recent', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'id', ae.id,
          'event_key', ae.event_key,
          'user_id', ae.user_id,
          'created_at', ae.created_at
        )
      ), '[]'::jsonb)
      FROM audit_events ae
      WHERE ae.org_id = p_org_id
      ORDER BY ae.created_at DESC
      LIMIT 10
    )
  ) INTO result;

  RETURN result;
END;
$$;

-- Grant permissions
REVOKE ALL ON FUNCTION public.is_platform_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_org_counts() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_plans_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.platform_audit_recent(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.org_dashboard_stats(uuid) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_platform_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_org_counts() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_plans_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.platform_audit_recent(integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.org_dashboard_stats(uuid) TO authenticated, service_role;