-- Assign admin roles to organizational admins for all their locations
-- This ensures all users with 'admin' role in memberships get proper RBAC access

INSERT INTO public.user_roles_locations (
  user_id, 
  role_id, 
  location_id, 
  org_id, 
  assigned_by, 
  is_active
)
SELECT DISTINCT
  m.user_id,
  r.id as role_id,
  l.id as location_id,
  m.org_id,
  m.user_id as assigned_by, -- Self-assigned during migration
  true as is_active
FROM public.memberships m
JOIN public.locations l ON l.org_id = m.org_id
JOIN public.roles r ON r.org_id = m.org_id AND r.name = 'admin'
WHERE m.role = 'admin'
  AND NOT EXISTS (
    -- Avoid duplicates: only insert if the combination doesn't already exist
    SELECT 1 FROM public.user_roles_locations url
    WHERE url.user_id = m.user_id 
      AND url.role_id = r.id 
      AND url.location_id = l.id
  );