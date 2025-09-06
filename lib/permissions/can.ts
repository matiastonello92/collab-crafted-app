// Centralized permission checking utility
// Works both server-side and client-side

export interface PermissionContext {
  orgId?: string
  locationId?: string
}

/**
 * Check if user has specific permission
 * Server-side: uses direct DB queries with RLS
 * Client-side: uses API endpoint
 */
export async function can(
  userId: string, 
  permission: string, 
  context?: PermissionContext
): Promise<boolean> {
  try {
    // Server-side check (when running in Node.js environment)
    if (typeof window === 'undefined') {
      // Import server utilities only on server-side
      const { createSupabaseAdminClient } = await import('@/lib/supabase/server')
      const supabaseAdmin = createSupabaseAdminClient()

      // Use fallback query with optimized admin check
      return await canFallbackQuery(supabaseAdmin, userId, permission, context)
    } else {
      // Client-side check via API
      const params = new URLSearchParams()
      if (context?.orgId) params.set('orgId', context.orgId)
      if (context?.locationId) params.set('locationId', context.locationId)

      const response = await fetch(`/api/v1/me/permissions?${params}`, {
        credentials: 'include'
      })

      if (!response.ok) {
        console.error('Failed to fetch permissions from API')
        return false
      }

      const data = await response.json()
      const permissions = Array.isArray(data?.permissions) ? data.permissions : []
      return permissions.includes(permission)
    }
  } catch (error) {
    console.error('Error in can() check:', error)
    return false // Fail closed
  }
}

/**
 * Fallback permission check using direct table queries
 * Used when RPC function is not available
 */
async function canFallbackQuery(
  supabaseAdmin: any,
  userId: string,
  permission: string,
  context?: PermissionContext
): Promise<boolean> {
  try {
    // Check for wildcard permission first
    if (permission === '*') {
      const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: userId })
      return Boolean(isAdmin)
    }

    // Check if user has admin privileges (admin can do everything)
    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: userId })
    if (isAdmin) {
      return true // Admin has all permissions
    }

    // Check specific permission through role assignments
    const { data: rolePermissions } = await supabaseAdmin
      .from('user_roles_locations')
      .select(`
        roles!inner (
          role_permissions!inner (
            permissions!inner (
              name
            )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_active', true)

    if (rolePermissions) {
      for (const roleAssignment of rolePermissions) {
        const role = roleAssignment.roles as any
        if (role?.role_permissions) {
          for (const rolePerm of role.role_permissions) {
            if (rolePerm?.permissions?.name === permission) {
              return true
            }
          }
        }
      }
    }

    // Check direct permission overrides
    const { data: overrides } = await supabaseAdmin
      .from('user_permissions')
      .select(`
        granted,
        permissions!inner (
          name
        )
      `)
      .eq('user_id', userId)
      .eq('permissions.name', permission)

    if (overrides && overrides.length > 0) {
      // Return the last override value
      return overrides[overrides.length - 1].granted === true
    }

    return false
  } catch (error) {
    console.error('Error in fallback permission query:', error)
    return false
  }
}

/**
 * Check multiple permissions (any of them)
 */
export async function canAny(
  userId: string, 
  permissions: string[], 
  context?: PermissionContext
): Promise<boolean> {
  try {
    const results = await Promise.all(
      permissions.map(permission => can(userId, permission, context))
    )
    return results.some(result => result === true)
  } catch (error) {
    console.error('Error in canAny() check:', error)
    return false
  }
}

/**
 * Check multiple permissions (all of them)
 */
export async function canAll(
  userId: string, 
  permissions: string[], 
  context?: PermissionContext
): Promise<boolean> {
  try {
    const results = await Promise.all(
      permissions.map(permission => can(userId, permission, context))
    )
    return results.every(result => result === true)
  } catch (error) {
    console.error('Error in canAll() check:', error)
    return false
  }
}