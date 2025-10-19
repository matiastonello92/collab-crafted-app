-- Migration 3: Creare permesso users:manage_contracts (fix org_id)

-- Aggiungere il nuovo permesso a tutte le organizzazioni esistenti
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'users:manage_contracts',
  'Gestisci Contratti',
  'users',
  'Gestire contratti di lavoro e flag pianificabilità utenti'
FROM public.organizations o
ON CONFLICT (org_id, name) DO NOTHING;

-- Assegnare automaticamente questo permesso a chi ha già users:manage
INSERT INTO public.role_permissions (role_id, permission_id, org_id)
SELECT 
  rp.role_id,
  p_new.id,
  r.org_id
FROM public.role_permissions rp
JOIN public.roles r ON r.id = rp.role_id
JOIN public.permissions p_old ON p_old.id = rp.permission_id
JOIN public.permissions p_new ON p_new.org_id = p_old.org_id
WHERE p_old.name = 'users:manage'
  AND p_new.name = 'users:manage_contracts'
ON CONFLICT (role_id, permission_id) DO NOTHING;