-- Create finance permissions for all existing organizations
INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'finance:view',
  'Visualizza Finanza',
  'finance',
  'Visualizzare dati finanziari e chiusure di cassa'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.org_id = o.org_id AND p.name = 'finance:view'
);

INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'finance:create',
  'Crea Dati Finanziari',
  'finance',
  'Creare e modificare chiusure di cassa'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.org_id = o.org_id AND p.name = 'finance:create'
);

INSERT INTO public.permissions (org_id, name, display_name, category, description)
SELECT 
  o.org_id,
  'finance:manage',
  'Gestisci Finanza',
  'finance',
  'Gestione completa di metodi di pagamento e configurazioni finanziarie'
FROM organizations o
WHERE NOT EXISTS (
  SELECT 1 FROM permissions p 
  WHERE p.org_id = o.org_id AND p.name = 'finance:manage'
);

-- Assign finance permissions to all org admins for all their active locations
INSERT INTO public.user_permissions (user_id, permission_id, location_id, granted, granted_by, org_id)
SELECT 
  m.user_id,
  p.id as permission_id,
  l.id as location_id,
  true,
  m.user_id,
  m.org_id
FROM memberships m
CROSS JOIN locations l
CROSS JOIN permissions p
WHERE m.role = 'admin'
  AND l.org_id = m.org_id
  AND p.org_id = m.org_id
  AND p.name IN ('finance:view', 'finance:create', 'finance:manage')
  AND l.is_active = true
ON CONFLICT (user_id, permission_id, location_id) DO NOTHING;