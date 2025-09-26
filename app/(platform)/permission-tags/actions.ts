'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { requirePlatformAdmin } from '@/lib/guards/requirePlatformAdmin'
import { PermissionTag, ModuleKey, getPermissionKey, PERMISSION_TAGS } from '@/lib/permissions/modules'

// ============================================================================
// Validation Schemas
// ============================================================================

const AssignTagSchema = z.object({
  userId: z.string().uuid(),
  orgId: z.string().uuid(),
  locationId: z.string().uuid().optional(),
  tag: z.enum(['admin', 'manager', 'base'])
})

const BulkAssignTagSchema = z.object({
  userIds: z.array(z.string().uuid()),
  orgId: z.string().uuid(), 
  locationId: z.string().uuid().optional(),
  tag: z.enum(['admin', 'manager', 'base'])
})

const ModulePermissionSchema = z.object({
  moduleKey: z.string(),
  actionKey: z.string(),
  tag: z.enum(['admin', 'manager', 'base'])
})

const UserFilterSchema = z.object({
  orgId: z.string().uuid().optional(),
  locationId: z.string().uuid().optional(),
  q: z.string().optional(),
  page: z.number().min(1).default(1),
  pageSize: z.number().min(1).max(100).default(20)
})

// ============================================================================
// Helper Functions
// ============================================================================

async function getRoleIdByCode(supabase: any, roleCode: string): Promise<string | null> {
  const { data: role } = await supabase
    .from('roles')
    .select('id')
    .eq('code', roleCode)
    .single()
  
  return role?.id || null
}

async function getPermissionIdByKey(supabase: any, permissionKey: string): Promise<string | null> {
  const { data: permission } = await supabase
    .from('permissions')
    .select('id')
    .eq('name', permissionKey)
    .single()
  
  return permission?.id || null
}

// ============================================================================
// User Tag Management Actions
// ============================================================================

export async function assignTagToUser(formData: FormData) {
  try {
    await requirePlatformAdmin()
    
    const rawData = {
      userId: formData.get('userId'),
      orgId: formData.get('orgId'),
      locationId: formData.get('locationId') || undefined,
      tag: formData.get('tag')
    }
    
    const { userId, orgId, locationId, tag } = AssignTagSchema.parse(rawData)
    
    const supabase = await createSupabaseServerClient()
    
    // Get role ID for tag
    const roleCode = PERMISSION_TAGS[tag].roleCode
    const roleId = await getRoleIdByCode(supabase, roleCode)
    
    if (!roleId) {
      throw new Error(`Role not found: ${roleCode}`)
    }
    
    // Insert or update user role assignment
    const { error } = await supabase
      .from('user_roles_locations')
      .upsert({
        user_id: userId,
        role_id: roleId,
        organization_id: orgId,
        location_id: locationId || null
      })
    
    if (error) {
      console.error('Failed to assign tag:', error)
      throw new Error('Failed to assign tag to user')
    }
    
    revalidatePath('/permission-tags')
    
    return { success: true, message: `Tag ${tag} assigned successfully` }
    
  } catch (error) {
    console.error('assignTagToUser error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to assign tag'
    }
  }
}

export async function removeTagFromUser(formData: FormData) {
  try {
    await requirePlatformAdmin()
    
    const rawData = {
      userId: formData.get('userId'),
      orgId: formData.get('orgId'),
      locationId: formData.get('locationId') || undefined,
      tag: formData.get('tag')
    }
    
    const { userId, orgId, locationId, tag } = AssignTagSchema.parse(rawData)
    
    const supabase = await createSupabaseServerClient()
    
    // Get role ID for tag
    const roleCode = PERMISSION_TAGS[tag].roleCode
    const roleId = await getRoleIdByCode(supabase, roleCode)
    
    if (!roleId) {
      throw new Error(`Role not found: ${roleCode}`)
    }
    
    // Remove user role assignment
    let query = supabase
      .from('user_roles_locations')
      .delete()
      .eq('user_id', userId)
      .eq('role_id', roleId)
      .eq('organization_id', orgId)
    
    if (locationId) {
      query = query.eq('location_id', locationId)
    } else {
      query = query.is('location_id', null)
    }
    
    const { error } = await query
    
    if (error) {
      console.error('Failed to remove tag:', error)
      throw new Error('Failed to remove tag from user')
    }
    
    revalidatePath('/permission-tags')
    
    return { success: true, message: `Tag ${tag} removed successfully` }
    
  } catch (error) {
    console.error('removeTagFromUser error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to remove tag'
    }
  }
}

export async function bulkAssignTagToUsers(formData: FormData) {
  try {
    await requirePlatformAdmin()
    
    const rawData = {
      userIds: JSON.parse(formData.get('userIds') as string || '[]'),
      orgId: formData.get('orgId'),
      locationId: formData.get('locationId') || undefined,
      tag: formData.get('tag')
    }
    
    const { userIds, orgId, locationId, tag } = BulkAssignTagSchema.parse(rawData)
    
    const supabase = await createSupabaseServerClient()
    
    // Get role ID for tag
    const roleCode = PERMISSION_TAGS[tag].roleCode
    const roleId = await getRoleIdByCode(supabase, roleCode)
    
    if (!roleId) {
      throw new Error(`Role not found: ${roleCode}`)
    }
    
    // Bulk insert/update user role assignments
    const assignments = userIds.map(userId => ({
      user_id: userId,
      role_id: roleId,
      organization_id: orgId,
      location_id: locationId || null
    }))
    
    const { error } = await supabase
      .from('user_roles_locations')
      .upsert(assignments)
    
    if (error) {
      console.error('Failed to bulk assign tags:', error)
      throw new Error('Failed to bulk assign tags')
    }
    
    revalidatePath('/permission-tags')
    
    return { 
      success: true, 
      message: `Tag ${tag} assigned to ${userIds.length} users successfully` 
    }
    
  } catch (error) {
    console.error('bulkAssignTagToUsers error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to bulk assign tags'
    }
  }
}

// ============================================================================
// Module Permission Management Actions  
// ============================================================================

export async function grantModulePermissionToTag(formData: FormData) {
  try {
    await requirePlatformAdmin()
    
    const rawData = {
      moduleKey: formData.get('moduleKey'),
      actionKey: formData.get('actionKey'),
      tag: formData.get('tag')
    }
    
    const { moduleKey, actionKey, tag } = ModulePermissionSchema.parse(rawData)
    
    const supabase = await createSupabaseServerClient()
    
    // Get role ID and permission ID
    const roleCode = PERMISSION_TAGS[tag].roleCode
    const roleId = await getRoleIdByCode(supabase, roleCode)
    const permissionKey = getPermissionKey(moduleKey as ModuleKey, actionKey)
    const permissionId = await getPermissionIdByKey(supabase, permissionKey)
    
    if (!roleId) throw new Error(`Role not found: ${roleCode}`)
    if (!permissionId) throw new Error(`Permission not found: ${permissionKey}`)
    
    // Grant permission to role
    const { error } = await supabase
      .from('role_permissions')
      .upsert({
        role_id: roleId,
        permission_id: permissionId
      })
    
    if (error) {
      console.error('Failed to grant permission:', error)
      throw new Error('Failed to grant permission to role')
    }
    
    revalidatePath('/permission-tags')
    
    return { success: true, message: 'Permission granted successfully' }
    
  } catch (error) {
    console.error('grantModulePermissionToTag error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to grant permission'
    }
  }
}

export async function revokeModulePermissionFromTag(formData: FormData) {
  try {
    await requirePlatformAdmin()
    
    const rawData = {
      moduleKey: formData.get('moduleKey'),
      actionKey: formData.get('actionKey'),
      tag: formData.get('tag')
    }
    
    const { moduleKey, actionKey, tag } = ModulePermissionSchema.parse(rawData)
    
    const supabase = await createSupabaseServerClient()
    
    // Get role ID and permission ID
    const roleCode = PERMISSION_TAGS[tag].roleCode
    const roleId = await getRoleIdByCode(supabase, roleCode)
    const permissionKey = getPermissionKey(moduleKey as ModuleKey, actionKey)
    const permissionId = await getPermissionIdByKey(supabase, permissionKey)
    
    if (!roleId) throw new Error(`Role not found: ${roleCode}`)
    if (!permissionId) throw new Error(`Permission not found: ${permissionKey}`)
    
    // Revoke permission from role
    const { error } = await supabase
      .from('role_permissions')
      .delete()
      .eq('role_id', roleId)
      .eq('permission_id', permissionId)
    
    if (error) {
      console.error('Failed to revoke permission:', error)
      throw new Error('Failed to revoke permission from role')
    }
    
    revalidatePath('/permission-tags')
    
    return { success: true, message: 'Permission revoked successfully' }
    
  } catch (error) {
    console.error('revokeModulePermissionFromTag error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to revoke permission'
    }
  }
}

// ============================================================================
// Data Fetching Actions
// ============================================================================

export async function getUsersWithTags(searchParams: URLSearchParams) {
  try {
    await requirePlatformAdmin()
    
    const filters = UserFilterSchema.parse({
      orgId: searchParams.get('orgId') || undefined,
      locationId: searchParams.get('locationId') || undefined,
      q: searchParams.get('q') || undefined,
      page: parseInt(searchParams.get('page') || '1'),
      pageSize: parseInt(searchParams.get('pageSize') || '20')
    })
    
    const supabase = await createSupabaseServerClient()
    const offset = (filters.page - 1) * filters.pageSize
    
    // Build query for users with their roles/tags
    let query = supabase
      .from('users')
      .select(`
        id,
        email,
        full_name,
        created_at,
        user_roles_locations!inner(
          organization_id,
          location_id,
          roles(id, code, name),
          organizations(name),
          locations(name)
        )
      `)
      .range(offset, offset + filters.pageSize - 1)
      .order('created_at', { ascending: false })
    
    // Apply filters
    if (filters.orgId) {
      query = query.eq('user_roles_locations.organization_id', filters.orgId)
    }
    
    if (filters.locationId) {
      query = query.eq('user_roles_locations.location_id', filters.locationId)
    }
    
    if (filters.q) {
      query = query.or(`email.ilike.%${filters.q}%,full_name.ilike.%${filters.q}%`)
    }
    
    const { data: users, error } = await query
    
    if (error) {
      console.error('Failed to fetch users:', error)
      throw new Error('Failed to fetch users with tags')
    }
    
    // Get total count for pagination
    let countQuery = supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
    
    if (filters.orgId) {
      countQuery = countQuery.eq('user_roles_locations.organization_id', filters.orgId)
    }
    
    const { count, error: countError } = await countQuery
    
    if (countError) {
      console.error('Failed to count users:', countError)
    }
    
    return {
      success: true,
      data: {
        users: users || [],
        totalCount: count || 0,
        page: filters.page,
        pageSize: filters.pageSize,
        totalPages: Math.ceil((count || 0) / filters.pageSize)
      }
    }
    
  } catch (error) {
    console.error('getUsersWithTags error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch users'
    }
  }
}

export async function getModulePermissionsMatrix() {
  try {
    await requirePlatformAdmin()
    
    const supabase = await createSupabaseServerClient()
    
    // Fetch all role-permission mappings
    const { data: rolePermissions, error } = await supabase
      .from('role_permissions')
      .select(`
        roles(code),
        permissions(name)
      `)
    
    if (error) {
      console.error('Failed to fetch role permissions:', error)
      throw new Error('Failed to fetch module permissions matrix')
    }
    
    return {
      success: true,
      data: rolePermissions || []
    }
    
  } catch (error) {
    console.error('getModulePermissionsMatrix error:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to fetch permissions matrix'
    }
  }
}