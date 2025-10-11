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

export interface UserJobTagAssignment extends JobTag {
  assignmentId: string
  location_id: string | null
  is_primary?: boolean | null
  note?: string | null
}

interface RawJobTagAssignment {
  id: string
  job_tag_id: string | null
  location_id: string | null
  is_primary: boolean | null
  note: string | null
  job_tag?: {
    id: string
    key: string
    label_it: string
    color?: string | null
    categoria?: string | null
    is_active: boolean | null
  } | null
}

function normalizeJobTagAssignment(raw: RawJobTagAssignment): UserJobTagAssignment | null {
  const tag = raw.job_tag
  const jobTagId = raw.job_tag_id ?? tag?.id

  if (!tag || !jobTagId) {
    return null
  }

  return {
    assignmentId: raw.id,
    id: jobTagId,
    key: tag.key ?? jobTagId,
    label_it: tag.label_it ?? jobTagId,
    color: tag.color ?? null,
    categoria: tag.categoria ?? null,
    is_active: (tag.is_active ?? true) as boolean,
    location_id: raw.location_id,
    is_primary: raw.is_primary,
    note: raw.note,
  }
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
export async function fetchUserJobTags(userId: string, locationId?: string | null): Promise<UserJobTagAssignment[]> {
  try {
    const params = new URLSearchParams({ user_id: userId })
    if (locationId) params.append('location_id', locationId)

    const query = params.toString()
    const response = await fetch(`/api/v1/admin/user-job-tags${query ? `?${query}` : ''}`, {
      method: 'GET',
    })

    if (!response.ok) {
      throw new Error('Failed to fetch user job tags')
    }

    const data = await response.json()
    const assignments: RawJobTagAssignment[] = data.assignments || []

    return assignments
      .map(normalizeJobTagAssignment)
      .filter((assignment): assignment is UserJobTagAssignment => assignment !== null)
  } catch (error) {
    console.error('Error fetching user job tags:', error)
    return []
  }
}

/**
 * Assign job tag to user for a specific location
 */
export async function assignJobTagToUser(
  userId: string,
  tagId: string,
  locationId: string | null
): Promise<UserJobTagAssignment> {
  try {
    const response = await fetch('/api/v1/admin/user-job-tags', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: userId,
        job_tag_id: tagId,
        location_id: locationId,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      const message = errorBody?.error || 'Failed to assign job tag'
      throw new Error(message)
    }

    const data = await response.json()
    const assignment = normalizeJobTagAssignment(data.assignment)

    if (!assignment) {
      throw new Error('Invalid assignment payload returned by server')
    }

    return assignment
  } catch (error) {
    console.error('Error assigning job tag:', error)
    throw error
  }
}

/**
 * Remove job tag from user for a specific location
 */
export async function removeJobTagFromUser(assignmentId: string): Promise<void> {
  try {
    const response = await fetch(`/api/v1/admin/user-job-tags/${assignmentId}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null)
      const message = errorBody?.error || 'Failed to remove job tag'
      throw new Error(message)
    }
  } catch (error) {
    console.error('Error removing job tag:', error)
    throw error
  }
}