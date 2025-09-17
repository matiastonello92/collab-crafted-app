-- Insert permissions from registry into database
-- Using org_id from existing organization

WITH registry_permissions AS (
  -- Flags module permissions
  SELECT 'flags:create' as name, 'Create Flags' as display_name, 'flags' as category, 'Create new feature flags' as description
  UNION ALL
  SELECT 'flags:delete', 'Delete Flags', 'flags', 'Delete existing feature flags'
  UNION ALL  
  SELECT 'flags:edit', 'Edit Flags', 'flags', 'Edit existing feature flags'
  UNION ALL
  SELECT 'flags:manage', 'Manage Flags', 'flags', 'Full management of feature flags'
  UNION ALL
  SELECT 'flags:view', 'View Flags', 'flags', 'View feature flags'
  UNION ALL
  
  -- Suppliers module permissions
  SELECT 'suppliers:view', 'View Suppliers', 'suppliers', 'View supplier information'
  UNION ALL
  
  -- Incidents module permissions  
  SELECT 'incidents:view', 'View Incidents', 'incidents', 'View incident reports'
  UNION ALL
  
  -- Inventory module permissions
  SELECT 'inventory:create', 'Create Inventory', 'inventory', 'Create inventory items'
  UNION ALL
  SELECT 'inventory:edit', 'Edit Inventory', 'inventory', 'Edit inventory items'
  UNION ALL
  SELECT 'inventory:view', 'View Inventory', 'inventory', 'View inventory items'
  UNION ALL
  
  -- Locations module permissions
  SELECT 'locations:create', 'Create Locations', 'locations', 'Create new locations'
  UNION ALL
  SELECT 'locations:delete', 'Delete Locations', 'locations', 'Delete existing locations'
  UNION ALL
  SELECT 'locations:edit', 'Edit Locations', 'locations', 'Edit location details'
  UNION ALL
  SELECT 'locations:manage_flags', 'Manage Location Flags', 'locations', 'Manage feature flags for locations'
  UNION ALL
  SELECT 'locations:manage_permissions', 'Manage Location Permissions', 'locations', 'Manage permissions for locations'
  UNION ALL
  SELECT 'locations:manage_users', 'Manage Location Users', 'locations', 'Manage users in locations'
  UNION ALL
  SELECT 'locations:view', 'View Locations', 'locations', 'View location information'
  UNION ALL
  
  -- Orders module permissions
  SELECT 'orders:approve', 'Approve Orders', 'orders', 'Approve pending orders'
  UNION ALL
  SELECT 'orders:create', 'Create Orders', 'orders', 'Create new orders'
  UNION ALL
  SELECT 'orders:edit', 'Edit Orders', 'orders', 'Edit existing orders'
  UNION ALL
  SELECT 'orders:send_order', 'Send Orders', 'orders', 'Send orders to suppliers'
  UNION ALL
  SELECT 'orders:view', 'View Orders', 'orders', 'View order information'
  UNION ALL
  
  -- Tasks module permissions
  SELECT 'tasks:create', 'Create Tasks', 'tasks', 'Create new tasks'
  UNION ALL
  SELECT 'tasks:edit', 'Edit Tasks', 'tasks', 'Edit existing tasks'
  UNION ALL
  SELECT 'tasks:view', 'View Tasks', 'tasks', 'View task information'
  UNION ALL
  
  -- Technicians module permissions
  SELECT 'technicians:view', 'View Technicians', 'technicians', 'View technician information'
  UNION ALL
  
  -- Users module permissions
  SELECT 'users:create', 'Create Users', 'users', 'Create new users'
  UNION ALL
  SELECT 'users:delete', 'Delete Users', 'users', 'Delete existing users'
  UNION ALL
  SELECT 'users:edit', 'Edit Users', 'users', 'Edit user information'
  UNION ALL
  SELECT 'users:manage', 'Manage Users', 'users', 'Full user management capabilities'
  UNION ALL
  SELECT 'users:view', 'View Users', 'users', 'View user information'
)
INSERT INTO permissions (name, display_name, category, description, org_id)
SELECT 
  rp.name,
  rp.display_name,
  rp.category,
  rp.description,
  '729b60aa-6bc5-4f60-96ba-7f313e6576f8'::uuid as org_id
FROM registry_permissions rp
ON CONFLICT (name, org_id) DO NOTHING;