-- Fix Job Tags: Link manage_users permission to admin role and remove duplicate RLS policy

-- 1. Link manage_users permission to admin role for all organizations
INSERT INTO role_permissions (role_id, permission_id, org_id)
SELECT 
  r.id,
  p.id,
  r.org_id
FROM roles r
CROSS JOIN permissions p
WHERE r.name = 'admin' 
  AND p.name = 'manage_users'
  AND r.org_id = p.org_id
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp
    WHERE rp.role_id = r.id
      AND rp.permission_id = p.id
  );

-- 2. Remove duplicate SELECT policy on user_job_tags (keep user_job_tags_select only)
DROP POLICY IF EXISTS user_job_tags_self_or_org_or_admin ON public.user_job_tags;