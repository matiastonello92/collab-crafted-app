-- =====================================================
-- Posts Permissions Migration - Complete Setup
-- =====================================================

-- Create posts permissions for all organizations
INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:view',
  'View Posts',
  'View posts in the feed',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:view' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:create',
  'Create Posts',
  'Create new posts in the feed',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:create' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:edit',
  'Edit Posts',
  'Edit own posts',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:edit' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:delete',
  'Delete Posts',
  'Delete own posts',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:delete' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:like',
  'Like Posts',
  'Like and unlike posts',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:like' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:comment',
  'Comment on Posts',
  'Add comments to posts',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:comment' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:share',
  'Share Posts',
  'Share posts with others',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:share' AND p.org_id = organizations.org_id
);

INSERT INTO public.permissions (id, name, display_name, description, category, org_id)
SELECT 
  gen_random_uuid(),
  'posts:moderate',
  'Moderate Posts',
  'Moderate posts (pin, archive, handle reports)',
  'posts',
  org_id
FROM public.organizations
WHERE NOT EXISTS (
  SELECT 1 FROM public.permissions p 
  WHERE p.name = 'posts:moderate' AND p.org_id = organizations.org_id
);

-- Assign base posts permissions to all active roles
INSERT INTO public.role_permissions (id, role_id, permission_id, org_id)
SELECT 
  gen_random_uuid(),
  r.id as role_id,
  p.id as permission_id,
  r.org_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.is_active = true
  AND p.name IN ('posts:view', 'posts:like', 'posts:comment', 'posts:share', 'posts:create', 'posts:edit', 'posts:delete')
  AND p.org_id = r.org_id
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );

-- Assign posts:moderate only to manager-level roles (level >= 50)
INSERT INTO public.role_permissions (id, role_id, permission_id, org_id)
SELECT 
  gen_random_uuid(),
  r.id as role_id,
  p.id as permission_id,
  r.org_id
FROM public.roles r
CROSS JOIN public.permissions p
WHERE r.is_active = true
  AND r.level >= 50
  AND p.name = 'posts:moderate'
  AND p.org_id = r.org_id
  AND NOT EXISTS (
    SELECT 1 FROM public.role_permissions rp 
    WHERE rp.role_id = r.id AND rp.permission_id = p.id
  );