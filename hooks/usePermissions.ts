'use client'

import useSWR from 'swr'
import { normalizeSet } from '@/lib/permissions'

interface PermissionsResponse {
  permissions: string[]
  is_admin?: boolean
}

const fetcher = async (url: string): Promise<PermissionsResponse> => {
  const response = await fetch(url, { credentials: 'include' })
  if (!response.ok) {
    throw new Error('Failed to fetch permissions')
  }
  return response.json()
}

/**
 * Unified permissions hook with SWR caching
 * Replaces old useEffectivePermissions + store pattern
 */
export function usePermissions(locationId?: string) {
  const key = locationId 
    ? `/api/v1/me/permissions?locationId=${locationId}`
    : '/api/v1/me/permissions'
  
  const { data, error, isLoading, mutate } = useSWR<PermissionsResponse>(
    key,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5min cache
      errorRetryCount: 1,
      errorRetryInterval: 2000,
    }
  )

  const permissions = data?.permissions ? normalizeSet(data.permissions) : []
  const isAdmin = data?.is_admin || permissions.includes('*')

  return {
    permissions,
    isAdmin,
    isLoading,
    error,
    mutate, // For manual cache invalidation
  }
}

/**
 * Unified permission checking utility
 * Replaces both can() and hasPermission() patterns
 */
export function hasPermission(permissions: string[], required: string | string[]): boolean {
  if (!permissions || permissions.length === 0) return false
  
  // Admin wildcard check
  if (permissions.includes('*')) return true
  
  const requiredList = Array.isArray(required) ? required : [required]
  
  return requiredList.some(perm => {
    // Direct permission match
    if (permissions.includes(perm)) return true
    
    // Module wildcard check (e.g., 'users:*' covers 'users:view')
    const [module] = perm.split(':')
    if (module && permissions.includes(`${module}:*`)) return true
    
    return false
  })
}

/**
 * Hook for permission checking with current context
 */
export function usePermissionCheck() {
  const { permissions, isLoading } = usePermissions()
  
  return {
    hasPermission: (required: string | string[]) => hasPermission(permissions, required),
    isLoading,
  }
}