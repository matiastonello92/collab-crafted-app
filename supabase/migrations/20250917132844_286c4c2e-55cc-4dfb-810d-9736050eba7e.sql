-- Add users:invite permission for Mitron Bakery organization
INSERT INTO public.permissions (
  name, 
  display_name, 
  category, 
  description,
  org_id
) VALUES (
  'users:invite',
  'Invite Users', 
  'users',
  'Permission to invite new users to the organization',
  '729b60aa-6bc5-4f60-96ba-7f313e6576f8'
);