-- ===================================================================
-- Step 6 Verification Suite - SaaS Hardening & Email Integration
-- ===================================================================

-- === A. FUNZIONI SECURITY DEFINER: search_path ===
-- Elenca le funzioni SECURITY DEFINER nello schema public che NON hanno 'search_path=public' impostato.
SELECT 'A. Functions Hardening Check' as check_category;

WITH sd AS (
  SELECT
    n.nspname AS schema_name,
    p.proname AS func_name,
    pg_get_function_identity_arguments(p.oid) AS args,
    p.proconfig
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.prosecdef = true
)
SELECT 
  'SECURITY_DEFINER_MISSING_SEARCH_PATH' AS check_name,
  CASE 
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  COUNT(*) AS failing_functions,
  COALESCE(STRING_AGG(schema_name || '.' || func_name || '(' || args || ')', ', '), 'none') AS details
FROM sd
WHERE COALESCE(ARRAY_TO_STRING(proconfig, ','), '') NOT LIKE '%search_path=public%';

-- === B. RLS su metadata RBAC: ruoli/permessi leggibili solo da admin ===
SELECT 'B. RLS Metadata RBAC Check' as check_category;

-- 1) Scegliamo dinamicamente un'org e i relativi utenti admin/base
WITH pick AS (
  SELECT
    m.org_id,
    MAX(CASE WHEN m.role='admin' THEN m.user_id END) AS admin_user_id,
    MAX(CASE WHEN m.role<>'admin' THEN m.user_id END) AS base_user_id
  FROM memberships m
  GROUP BY m.org_id
  LIMIT 1
)
SELECT 
  'ORG_USERS_DISCOVERED' AS check_name,
  CASE 
    WHEN admin_user_id IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  org_id,
  admin_user_id,
  base_user_id
FROM pick;

-- 2) Test SELECT su ROLES come ADMIN (dovrebbe ritornare >=1)
DO $$
DECLARE 
  v_org UUID; 
  v_admin UUID; 
  v_count INTEGER;
BEGIN
  SELECT org_id, admin_user_id INTO v_org, v_admin FROM (
    SELECT m.org_id, m.user_id AS admin_user_id
    FROM memberships m WHERE m.role='admin' LIMIT 1
  ) AS t;

  IF v_admin IS NOT NULL THEN
    PERFORM SET_CONFIG('request.jwt.claims',
      JSON_BUILD_OBJECT(
        'sub', v_admin::TEXT,
        'app_metadata', JSON_BUILD_OBJECT('platform_admin', false)
      )::TEXT, true);

    SELECT COUNT(*) INTO v_count FROM roles r WHERE r.org_id = v_org;
    
    RAISE NOTICE 'ADMIN_ROLES_ACCESS: status=%, count=%, org_id=%', 
      CASE WHEN v_count > 0 THEN 'PASS' ELSE 'FAIL' END,
      v_count, 
      v_org;
  ELSE
    RAISE NOTICE 'ADMIN_ROLES_ACCESS: status=SKIP, reason=no_admin_user';
  END IF;
END $$;

-- 3) Test SELECT su ROLES come BASE (dovrebbe tornare 0)
DO $$
DECLARE 
  v_org UUID; 
  v_base UUID;
  v_count INTEGER;
BEGIN
  SELECT org_id, base_user_id INTO v_org, v_base FROM (
    SELECT p.org_id, p.base_user_id
    FROM (
      SELECT m.org_id, MAX(CASE WHEN m.role<>'admin' THEN m.user_id END) AS base_user_id
      FROM memberships m GROUP BY m.org_id
    ) p
    WHERE p.base_user_id IS NOT NULL
    LIMIT 1
  ) AS t;

  IF v_base IS NULL THEN
    RAISE NOTICE 'BASE_ROLES_ACCESS: status=SKIP, reason=no_base_user';
  ELSE
    PERFORM SET_CONFIG('request.jwt.claims',
      JSON_BUILD_OBJECT(
        'sub', v_base::TEXT,
        'app_metadata', JSON_BUILD_OBJECT('platform_admin', false)
      )::TEXT, true);

    SELECT COUNT(*) INTO v_count FROM roles r WHERE r.org_id = v_org;
    
    RAISE NOTICE 'BASE_ROLES_ACCESS: status=%, count=%, org_id=%',
      CASE WHEN v_count = 0 THEN 'PASS' ELSE 'FAIL' END,
      v_count,
      v_org;
  END IF;
END $$;

-- 4) Ripristina contesto piattaforma (service)
SELECT SET_CONFIG('request.jwt.claims', NULL, true);

-- === C. AUDIT EVENTS tabella presente & RLS tenant ===
SELECT 'C. Audit Events Infrastructure Check' as check_category;

-- Esiste tabella?
SELECT 
  'AUDIT_EVENTS_TABLE_EXISTS' AS check_name,
  CASE 
    WHEN TO_REGCLASS('public.audit_events') IS NOT NULL THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  TO_REGCLASS('public.audit_events') AS table_oid;

-- Count policy applicate alla tabella audit_events
SELECT 
  'AUDIT_EVENTS_RLS_POLICIES' AS check_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status,
  COUNT(*) AS policies_count
FROM pg_policy p
JOIN pg_class c ON c.oid = p.polrelid
WHERE c.relname = 'audit_events';

-- === D. RECENTI AUDIT EVENTS (ultimi 24h) ===
SELECT 'D. Recent Audit Activity Check' as check_category;

SELECT 
  'RECENT_AUDIT_ACTIVITY' AS check_name,
  COUNT(*) AS recent_events,
  MIN(created_at) AS oldest_event,
  MAX(created_at) AS newest_event
FROM audit_events 
WHERE created_at > NOW() - INTERVAL '24 hours';

-- === E. TABELLE CRITICHE ESISTENTI ===
SELECT 'E. Critical Tables Check' as check_category;

WITH critical_tables AS (
  SELECT unnest(ARRAY[
    'organizations', 'memberships', 'locations', 'invitations',
    'roles', 'permissions', 'user_roles_locations', 'profiles'
  ]) AS table_name
)
SELECT 
  'CRITICAL_TABLES_EXIST' AS check_name,
  COUNT(*) AS existing_tables,
  STRING_AGG(
    table_name || ':' || CASE WHEN TO_REGCLASS('public.' || table_name) IS NOT NULL THEN 'OK' ELSE 'MISSING' END,
    ', ' ORDER BY table_name
  ) AS table_status
FROM critical_tables;

-- === F. SUMMARY ===
SELECT 'F. Verification Summary' as check_category;
SELECT 
  'STEP6_SQL_VERIFICATION_COMPLETE' AS check_name,
  'INFO' AS status,
  NOW() AS completed_at,
  'Review NOTICE messages above for detailed PASS/FAIL results' AS instructions;