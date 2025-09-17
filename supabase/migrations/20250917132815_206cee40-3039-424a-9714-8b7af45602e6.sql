-- Add users:invite permission for each existing organization
INSERT INTO public.permissions (
  name, 
  display_name, 
  category, 
  description,
  org_id
) 
SELECT 
  'users:invite',
  'Invite Users', 
  'users',
  'Permission to invite new users to the organization',
  o.org_id
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p
  WHERE p.name = 'users:invite' AND p.org_id = o.org_id
);