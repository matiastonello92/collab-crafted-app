-- Insert permissions from registry into database
INSERT INTO permissions (name, display_name, category, description, org_id)
VALUES
  -- Flags module permissions
  ('flags:create', 'Create Flags', 'flags', 'Create new feature flags', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('flags:delete', 'Delete Flags', 'flags', 'Delete existing feature flags', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('flags:edit', 'Edit Flags', 'flags', 'Edit existing feature flags', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('flags:manage', 'Manage Flags', 'flags', 'Full management of feature flags', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('flags:view', 'View Flags', 'flags', 'View feature flags', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Suppliers module permissions
  ('suppliers:view', 'View Suppliers', 'suppliers', 'View supplier information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Incidents module permissions
  ('incidents:view', 'View Incidents', 'incidents', 'View incident reports', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Inventory module permissions
  ('inventory:create', 'Create Inventory', 'inventory', 'Create inventory items', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('inventory:edit', 'Edit Inventory', 'inventory', 'Edit inventory items', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('inventory:view', 'View Inventory', 'inventory', 'View inventory items', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Locations module permissions
  ('locations:create', 'Create Locations', 'locations', 'Create new locations', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('locations:delete', 'Delete Locations', 'locations', 'Delete existing locations', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('locations:edit', 'Edit Locations', 'locations', 'Edit location details', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('locations:manage_flags', 'Manage Location Flags', 'locations', 'Manage feature flags for locations', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('locations:manage_permissions', 'Manage Location Permissions', 'locations', 'Manage permissions for locations', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('locations:manage_users', 'Manage Location Users', 'locations', 'Manage users in locations', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('locations:view', 'View Locations', 'locations', 'View location information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Orders module permissions
  ('orders:approve', 'Approve Orders', 'orders', 'Approve pending orders', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('orders:create', 'Create Orders', 'orders', 'Create new orders', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('orders:edit', 'Edit Orders', 'orders', 'Edit existing orders', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('orders:send_order', 'Send Orders', 'orders', 'Send orders to suppliers', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('orders:view', 'View Orders', 'orders', 'View order information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Tasks module permissions
  ('tasks:create', 'Create Tasks', 'tasks', 'Create new tasks', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('tasks:edit', 'Edit Tasks', 'tasks', 'Edit existing tasks', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('tasks:view', 'View Tasks', 'tasks', 'View task information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Technicians module permissions
  ('technicians:view', 'View Technicians', 'technicians', 'View technician information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  
  -- Users module permissions
  ('users:create', 'Create Users', 'users', 'Create new users', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('users:delete', 'Delete Users', 'users', 'Delete existing users', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('users:edit', 'Edit Users', 'users', 'Edit user information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('users:manage', 'Manage Users', 'users', 'Full user management capabilities', '729b60aa-6bc5-4f60-96ba-7f313e6576f8'),
  ('users:view', 'View Users', 'users', 'View user information', '729b60aa-6bc5-4f60-96ba-7f313e6576f8');