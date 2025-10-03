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

export interface JobTag {
  id: string
  key: string
  label_it: string
  color?: string | null
  categoria?: string | null
  is_active: boolean
}

/**
 * Fetch available roles for role assignment
 */
export async function fetchAvailableRoles(inviteOnly: boolean = false): Promise<Role[]> {
  try {
    const params = inviteOnly ? '?inviteOnly=true' : ''
    const response = await fetch(`/api/v1/admin/roles${params}`, {
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

/**
 * Fetch available job tags for assignment
 */
export async function fetchAvailableJobTags(): Promise<JobTag[]> {
  try {
    const response = await fetch('/api/v1/admin/job-tags', {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch job tags')
    }

    const data = await response.json()
    return data.jobTags || []
  } catch (error) {
    console.error('Error fetching job tags:', error)
    return []
  }
}

/**
 * Fetch user job tags for a specific user and location
 */
export async function fetchUserJobTags(userId: string, locationId?: string): Promise<JobTag[]> {
  try {
    const params = new URLSearchParams({ userId })
    if (locationId) params.append('locationId', locationId)
    
    const response = await fetch(`/api/v1/admin/user-job-tags?${params}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user job tags')
    }

    const data = await response.json()
    return data.jobTags || []
  } catch (error) {
    console.error('Error fetching user job tags:', error)
    return []
  }
}

/**
 * Assign job tag to user for a specific location
 */
export async function assignJobTagToUser(userId: string, tagId: string, locationId: string): Promise<void> {
  try {
    const response = await fetch('/api/v1/admin/user-job-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, tagId, locationId }),
    })

    if (!response.ok) {
      throw new Error('Failed to assign job tag')
    }
  } catch (error) {
    console.error('Error assigning job tag:', error)
    throw error
  }
}

/**
 * Remove job tag from user for a specific location
 */
export async function removeJobTagFromUser(userId: string, tagId: string, locationId: string): Promise<void> {
  try {
    const response = await fetch('/api/v1/admin/user-job-tags', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ userId, tagId, locationId }),
    })

    if (!response.ok) {
      throw new Error('Failed to remove job tag')
    }
  } catch (error) {
    console.error('Error removing job tag:', error)
    throw error
  }
}