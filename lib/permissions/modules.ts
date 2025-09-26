/**
 * Module definitions and permission mappings
 * Maps to existing permission structure in Supabase
 */

export const APP_MODULES = {
  inventory: {
    name: 'Inventory',
    description: 'Manage inventory items and stock',
    permissions: ['view', 'create', 'update', 'delete', 'export']
  },
  suppliers: {
    name: 'Suppliers', 
    description: 'Manage supplier relationships',
    permissions: ['view', 'create', 'update', 'delete', 'export']
  },
  purchase_orders: {
    name: 'Purchase Orders',
    description: 'Handle purchase order workflow', 
    permissions: ['view', 'create', 'update', 'approve', 'send', 'receive', 'export']
  },
  haccp: {
    name: 'HACCP',
    description: 'Food safety compliance tracking',
    permissions: ['view', 'check', 'sign', 'export']
  },
  technicians: {
    name: 'Technicians',
    description: 'Manage technician schedules and tasks',
    permissions: ['view', 'create', 'update', 'close', 'export']
  },
  incidents: {
    name: 'Incidents', 
    description: 'Track and resolve incidents',
    permissions: ['view', 'create', 'update', 'close', 'export']
  },
  tasks: {
    name: 'Tasks',
    description: 'Task management and tracking',
    permissions: ['view', 'create', 'update', 'complete', 'export']
  },
  widgets: {
    name: 'Dashboard Widgets',
    description: 'Configure dashboard widgets',
    permissions: ['view', 'configure']
  },
  import_export: {
    name: 'Import/Export',
    description: 'Data import and export utilities',
    permissions: ['import', 'export']
  },
  settings: {
    name: 'Settings',
    description: 'System and user settings',
    permissions: ['view', 'update']
  },
  webhooks: {
    name: 'Webhooks',
    description: 'API webhook configuration',
    permissions: ['view', 'create', 'delete']
  }
} as const

export type ModuleKey = keyof typeof APP_MODULES
export type PermissionAction = string

/**
 * Permission Tags (1:1 mapping to existing roles)
 */
export const PERMISSION_TAGS = {
  admin: {
    name: 'Admin',
    description: 'Full administrative access',
    roleCode: 'admin'
  },
  manager: {
    name: 'Manager', 
    description: 'Management level access',
    roleCode: 'manager'
  },
  base: {
    name: 'Base User',
    description: 'Basic user access',
    roleCode: 'base'
  }
} as const

export type PermissionTag = keyof typeof PERMISSION_TAGS

/**
 * Generate permission key for module:action
 */
export function getPermissionKey(module: ModuleKey, action: string): string {
  return `${module}:${action}`
}

/**
 * Get all permission keys that need to exist in database
 */
export function getAllRequiredPermissions(): string[] {
  const permissions: string[] = []
  
  Object.entries(APP_MODULES).forEach(([moduleKey, moduleConfig]) => {
    moduleConfig.permissions.forEach(action => {
      permissions.push(getPermissionKey(moduleKey as ModuleKey, action))
    })
  })
  
  return permissions
}

/**
 * Default permission presets for each tag
 */
export const DEFAULT_TAG_PERMISSIONS: Record<PermissionTag, string[]> = {
  admin: getAllRequiredPermissions(), // Admin gets everything
  manager: [
    // Managers get most permissions except critical actions
    'inventory:view', 'inventory:create', 'inventory:update', 'inventory:export',
    'suppliers:view', 'suppliers:create', 'suppliers:update', 'suppliers:export',
    'purchase_orders:view', 'purchase_orders:create', 'purchase_orders:update', 'purchase_orders:approve', 'purchase_orders:export',
    'haccp:view', 'haccp:check', 'haccp:export',
    'technicians:view', 'technicians:create', 'technicians:update', 'technicians:export',
    'incidents:view', 'incidents:create', 'incidents:update', 'incidents:close', 'incidents:export',
    'tasks:view', 'tasks:create', 'tasks:update', 'tasks:complete', 'tasks:export',
    'widgets:view',
    'import_export:export',
    'settings:view'
  ],
  base: [
    // Base users get read-only + basic actions
    'inventory:view',
    'suppliers:view', 
    'purchase_orders:view',
    'haccp:view', 'haccp:check',
    'technicians:view',
    'incidents:view', 'incidents:create',
    'tasks:view', 'tasks:update', 'tasks:complete',
    'widgets:view',
    'settings:view'
  ]
}