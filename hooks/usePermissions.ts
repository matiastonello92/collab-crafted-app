'use client'

import useSWR from 'swr'
import { normalizePermissions, checkPermission } from '@/lib/permissions'

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
 * 
 * Fetches user permissions from the server and provides permission checking utilities.
 * Includes automatic caching and revalidation via SWR.
 * 
 * @param locationId - Optional location ID to fetch location-scoped permissions
 * @returns Object with permissions, loading state, and utilities
 * 
 * @example
 * const { permissions, isAdmin, can, isLoading } = usePermissions()
 * if (can('users:edit')) { ... }
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
      errorRetryCount: 2,
      errorRetryInterval: 1000,
    }
  )

  const permissions = data?.permissions ? normalizePermissions(data.permissions) : []
  const isAdmin = data?.is_admin || permissions.includes('*')

  /**
   * Check if user has required permission(s)
   */
  const can = (required: string | string[]): boolean => {
    return checkPermission(permissions, required)
  }

  return {
    permissions,
    isAdmin,
    can,
    isLoading,
    error,
    refetch: mutate,
  }
}

/**
 * Standalone permission checker hook
 * Use when you only need to check permissions without accessing the full list
 */
export function usePermissionCheck() {
  const { can, isLoading } = usePermissions()
  return { can, isLoading }
}