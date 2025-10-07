/**
 * Permission Categories for User-Friendly UI
 * Groups permissions into logical categories for easier management
 */

export interface PermissionCategory {
  key: string
  labelKey: string
  icon: string
  permissions: string[]
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    key: 'location_management',
    labelKey: 'admin.permissions.categories.locationManagement',
    icon: 'Building',
    permissions: [
      'locations:view',
      'locations:edit',
      'locations:create',
      'locations:delete',
      'locations:manage_users',
      'locations:manage_permissions',
      'locations:manage_flags',
    ]
  },
  {
    key: 'inventory_purchasing',
    labelKey: 'admin.permissions.categories.inventoryPurchasing',
    icon: 'Package',
    permissions: [
      'inventory:view',
      'inventory:create',
      'inventory:edit',
      'orders:view',
      'orders:create',
      'orders:edit',
      'orders:approve',
      'orders:send_order',
      'suppliers:view',
    ]
  },
  {
    key: 'team_management',
    labelKey: 'admin.permissions.categories.teamManagement',
    icon: 'Users',
    permissions: [
      'users:view',
      'users:create',
      'users:edit',
      'users:delete',
      'users:manage',
      'technicians:view',
    ]
  },
  {
    key: 'tasks_incidents',
    labelKey: 'admin.permissions.categories.tasksIncidents',
    icon: 'ClipboardList',
    permissions: [
      'tasks:view',
      'tasks:create',
      'tasks:edit',
      'incidents:view',
      'flags:view',
      'flags:create',
      'flags:edit',
      'flags:delete',
      'flags:manage',
    ]
  },
  {
    key: 'shifts_planning',
    labelKey: 'admin.permissions.categories.shiftsPlanning',
    icon: 'Calendar',
    permissions: [
      'shifts:view',
      'shifts:create',
      'shifts:edit',
      'shifts:delete',
      'shifts:manage',
      'shifts:approve',
    ]
  },
  {
    key: 'reports_analytics',
    labelKey: 'admin.permissions.categories.reportsAnalytics',
    icon: 'BarChart',
    permissions: [
      'reports:view',
      'reports:export',
      'analytics:view',
    ]
  }
]

/**
 * Get category for a specific permission
 */
export function getCategoryForPermission(permission: string): PermissionCategory | undefined {
  return PERMISSION_CATEGORIES.find(cat => 
    cat.permissions.includes(permission)
  )
}

/**
 * Get all permissions from all categories (flat list)
 */
export function getAllCategorizedPermissions(): string[] {
  return PERMISSION_CATEGORIES.flatMap(cat => cat.permissions)
}
