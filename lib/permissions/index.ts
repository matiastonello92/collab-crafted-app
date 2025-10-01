/**
 * Unified Permission System
 * 
 * Single source of truth for permission checking across the application.
 * Replaces scattered can(), hasPermission(), and checkPermission() implementations.
 * 
 * @module lib/permissions
 */

export type { Permission } from './registry'

/**
 * Check if permissions array contains required permission(s)
 * Supports wildcards (*) and module-level permissions (module:*)
 * 
 * @param permissions - Array of user's permissions
 * @param required - Single permission or array of permissions to check
 * @returns true if user has the required permission(s)
 * 
 * @example
 * checkPermission(['users:view', 'users:edit'], 'users:view') // true
 * checkPermission(['users:*'], 'users:delete') // true
 * checkPermission(['*'], 'anything:action') // true
 */
export function checkPermission(permissions: string[], required: string | string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  
  // Admin wildcard - bypass all checks
  if (permissions.includes('*')) return true
  
  const requiredList = Array.isArray(required) ? required : [required]
  
  return requiredList.every(perm => {
    // Direct match
    if (permissions.includes(perm)) return true
    
    // Module wildcard (e.g., 'users:*' covers 'users:view', 'users:edit')
    const [module] = perm.split(':')
    if (module && permissions.includes(`${module}:*`)) return true
    
    return false
  })
}

/**
 * Check if user has ANY of the required permissions (OR logic)
 */
export function hasAnyPermission(permissions: string[], required: string[]): boolean {
  return required.some(perm => checkPermission(permissions, perm))
}

/**
 * Check if user has ALL of the required permissions (AND logic)
 */
export function hasAllPermissions(permissions: string[], required: string[]): boolean {
  return required.every(perm => checkPermission(permissions, perm))
}

/**
 * Normalize permission format to module:action
 * Handles common variations and converts to standard format
 */
export function normalizePermission(raw: string): string {
  if (!raw) return ''
  
  // Convert to lowercase and replace common separators
  const normalized = String(raw)
    .trim()
    .toLowerCase()
    .replace(/[.\s]/g, ':')
    .replace(/_{2,}/g, '_')
  
  // Common synonyms mapping
  const synonyms: Record<string, string> = {
    'manage_users': 'users:manage',
    'view_users': 'users:view',
    'invite_users': 'users:invite',
    'manage_settings': 'settings:manage',
    'view_settings': 'settings:view',
  }
  
  if (synonyms[normalized]) {
    return synonyms[normalized]
  }
  
  return normalized
}

/**
 * Normalize and deduplicate a list of permissions
 */
export function normalizePermissions(list: string[]): string[] {
  const normalized = new Set<string>()
  
  for (const raw of list) {
    const norm = normalizePermission(raw)
    if (norm) normalized.add(norm)
  }
  
  return Array.from(normalized)
}

/**
 * Legacy function - Normalize and deduplicate a list of permissions
 * @deprecated Use normalizePermissions() instead
 */
export function normalizeSet(list: Array<string | Permission>): Permission[] {
  const normalized = new Set<Permission>()
  
  for (const raw of list) {
    const norm = normalizePermission(String(raw)) as Permission
    if (norm) normalized.add(norm)
  }
  
  return Array.from(normalized)
}

/**
 * Legacy function - Check if permissions array contains required permission(s)
 * @deprecated Use checkPermission() instead
 */
export function can(perms: string[] | Set<string> | readonly string[], required: string | string[]): boolean {
  const permsArray = Array.isArray(perms) ? perms : Array.from(perms)
  return checkPermission(permsArray, required)
}

/**
 * Legacy function - Get user permissions from API
 * @deprecated Use usePermissions() hook instead
 */
export async function getUserPermissions(locationId?: string): Promise<Permission[]> {
  const qs = new URLSearchParams()
  if (locationId) qs.set('locationId', locationId)
  
  const res = await fetch(`/api/v1/me/permissions?${qs.toString()}`, {
    credentials: 'include',
  })
  
  if (!res.ok) return []
  
  const json = await res.json()
  const perms = Array.isArray(json?.permissions)
    ? (json.permissions as Array<string | Permission>)
    : []
  
  return normalizeSet(perms)
}

// Re-export permission types
export type { Permission } from './registry'