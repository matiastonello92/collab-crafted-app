-- Add missing users:invite permission
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
  NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions 
  WHERE name = 'users:invite'
);