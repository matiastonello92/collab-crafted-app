'use client'

// Client-side data fetching functions for optimistic updates

export interface Role {
  id: string
  name: string
  display_name: string
  level: number
}

export interface Permission {
  id: string
  name: string
  display_name: string
  category: string
}

export interface Location {
  id: string
  name: string
}

/**
 * Fetch available roles for role assignment
 */
export async function fetchAvailableRoles(): Promise<Role[]> {
  try {
    const response = await fetch('/api/v1/admin/roles', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch roles')
    }

    const data = await response.json()
    return data.roles || []
  } catch (error) {
    console.error('Error fetching roles:', error)
    return []
  }
}

/**
 * Fetch available permissions for override assignment
 */
export async function fetchAvailablePermissions(): Promise<Permission[]> {
  try {
    const response = await fetch('/api/v1/admin/permissions', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch permissions')
    }

    const data = await response.json()
    return data.permissions || []
  } catch (error) {
    console.error('Error fetching permissions:', error)
    return []
  }
}

/**
 * Fetch available locations for scoped assignments
 */
export async function fetchAvailableLocations(): Promise<Location[]> {
  try {
    const response = await fetch('/api/v1/admin/locations', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch locations')
    }

    const data = await response.json()
    return data.locations || []
  } catch (error) {
    console.error('Error fetching locations:', error)
    return []
  }
}