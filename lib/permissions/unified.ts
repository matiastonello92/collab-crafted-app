'use client'

// Unified permissions utility - replaces scattered can() and hasPermission() calls
// This is the single source of truth for permission checking logic

/**
 * Check if permissions array contains required permission(s)
 * Supports wildcards and module-level permissions
 */
export function checkPermission(permissions: string[], required: string | string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  
  // Admin wildcard - bypass all checks
  if (permissions.includes('*')) return true
  
  const requiredList = Array.isArray(required) ? required : [required]
  
  return requiredList.some(perm => {
    // Direct match
    if (permissions.includes(perm)) return true
    
    // Module wildcard (e.g., 'users:*' covers 'users:view', 'users:edit')
    const [module] = perm.split(':')
    if (module && permissions.includes(`${module}:*`)) return true
    
    return false
  })
}

/**
 * Check if user has ANY of the required permissions
 */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some(perm => checkPermission(permissions, perm))
}

/**
 * Check if user has ALL of the required permissions  
 */
export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every(perm => checkPermission(permissions, perm))
}

/**
 * Legacy compatibility - maps old can() function calls
 * @deprecated Use checkPermission() instead
 */
export function can(permissions: string[] | Set<string>, required: string | string[]): boolean {
  const permsArray = Array.isArray(permissions) ? permissions : Array.from(permissions)
  return checkPermission(permsArray, required)
}