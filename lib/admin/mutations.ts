'use client'

// Client-side admin mutation functions

export interface AssignRoleRequest {
  role_id: string
  location_id?: string
}

export interface RevokeRoleRequest {
  role_id: string
  location_id?: string
}

export interface SetOverrideRequest {
  permission_id: string
  granted: boolean
  location_id?: string
}

export interface MutationResponse {
  success: boolean
  message?: string
  error?: string
}

/**
 * Assign a role to a user
 */
export async function assignRole(userId: string, request: AssignRoleRequest): Promise<MutationResponse> {
  try {
    const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to assign role' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Error assigning role:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

/**
 * Revoke a role from a user
 */
export async function revokeRole(userId: string, request: RevokeRoleRequest): Promise<MutationResponse> {
  try {
    const response = await fetch(`/api/v1/admin/users/${userId}/roles`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to revoke role' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Error revoking role:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

/**
 * Set a permission override for a user
 */
export async function setPermissionOverride(userId: string, request: SetOverrideRequest): Promise<MutationResponse> {
  try {
    const response = await fetch(`/api/v1/admin/users/${userId}/permissions`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to set permission override' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Error setting permission override:', error)
    return { success: false, error: 'Network error occurred' }
  }
}

/**
 * Remove a permission override for a user
 */
export async function removePermissionOverride(
  userId: string, 
  permissionId: string, 
  locationId?: string
): Promise<MutationResponse> {
  try {
    const params = new URLSearchParams({ permission_id: permissionId })
    if (locationId) {
      params.set('location_id', locationId)
    }

    const response = await fetch(`/api/v1/admin/users/${userId}/permissions?${params}`, {
      method: 'DELETE',
    })

    const data = await response.json()

    if (!response.ok) {
      return { success: false, error: data.error || 'Failed to remove permission override' }
    }

    return { success: true, message: data.message }
  } catch (error) {
    console.error('Error removing permission override:', error)
    return { success: false, error: 'Network error occurred' }
  }
}