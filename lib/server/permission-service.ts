import 'server-only';

import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeSet } from '@/lib/permissions';
import type { PermissionEnvelope } from '@/types/app-bootstrap';

const DEFAULT_ENVELOPE: PermissionEnvelope = {
  permissions: [],
  role_level: 0,
  org_roles: [],
  location_roles: [],
}

function isMissingRpc(err: unknown) {
  if (!err) return false
  if (typeof err !== 'object') return false
  const message = 'message' in err ? String((err as any).message ?? '') : ''
  return message.includes('function app.get_effective_permissions') || message.includes('does not exist')
}

async function fetchRoleContext(
  supabase = createSupabaseAdminClient(),
  userId: string,
  orgId: string,
  locationId?: string,
) {
  const { data: assignments = [] } = await supabase
    .from('user_roles_locations')
    .select('role_id, location_id, is_active')
    .eq('user_id', userId)
    .eq('org_id', orgId)

  const allowedAssignments = Array.isArray(assignments)
    ? assignments.filter((assignment) => {
        if (assignment?.is_active === false) return false
        if (!assignment?.role_id) return false
        if (!assignment?.location_id) return true
        if (!locationId) return false
        return assignment.location_id === locationId
      })
    : []

  const roleIds = Array.from(
    new Set(
      allowedAssignments
        .map((assignment) => assignment.role_id as string | null)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  )

  if (roleIds.length === 0) {
    return { assignments: allowedAssignments, rolesById: new Map<string, { name: string; level: number }>() }
  }

  const { data: roles = [] } = await supabase
    .from('roles')
    .select('id, name, level')
    .in('id', roleIds)

  const rolesById = new Map<string, { name: string; level: number }>()
  for (const role of roles) {
    if (!role?.id) continue
    rolesById.set(role.id, { name: String(role.name ?? ''), level: Number(role.level ?? 0) })
  }

  return { assignments: allowedAssignments, rolesById }
}

async function resolveWithFallback(
  userId: string,
  orgId: string,
  locationId?: string,
): Promise<PermissionEnvelope> {
  const supabase = createSupabaseAdminClient()
  const permSet = new Set<string>()
  let roleLevel = 0
  const orgRoles = new Set<string>()
  const locationRoles = new Set<string>()

  const { assignments, rolesById } = await fetchRoleContext(supabase, userId, orgId, locationId)

  for (const assignment of assignments) {
    const role = assignment?.role_id ? rolesById.get(assignment.role_id) : undefined
    if (!role) continue
    const code = role.name?.toString() ?? ''
    if (code) {
      if (!assignment.location_id) orgRoles.add(code)
      else if (locationId && assignment.location_id === locationId) locationRoles.add(code)
    }
    if (Number.isFinite(role.level)) {
      roleLevel = Math.max(roleLevel, Number.isFinite(role.level) ? role.level : 0)
    }
  }

  const roleIds = Array.from(rolesById.keys())
  if (roleIds.length > 0) {
    const { data: rolePermissions = [] } = await supabase
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds)

    const permissionIds = Array.from(
      new Set(
        rolePermissions
          .map((item) => item?.permission_id as string | null)
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      ),
    )

    if (permissionIds.length > 0) {
      const { data: permissions = [] } = await supabase
        .from('permissions')
        .select('name')
        .in('id', permissionIds)

      for (const permission of permissions) {
        if (!permission?.name) continue
        permSet.add(String(permission.name))
      }
    }
  }

  const { data: overrides = [] } = await supabase
    .from('user_permissions')
    .select('permission_id, granted, location_id')
    .eq('user_id', userId)
    .eq('org_id', orgId)

  const overridePermissionIds = Array.from(
    new Set(
      overrides
        .map((override) => override?.permission_id as string | null)
        .filter((value): value is string => typeof value === 'string' && value.length > 0),
    ),
  )

  let overrideNames = new Map<string, string>()
  if (overridePermissionIds.length > 0) {
    const { data: overridePermissions = [] } = await supabase
      .from('permissions')
      .select('id, name')
      .in('id', overridePermissionIds)

    overrideNames = new Map(
      overridePermissions
        .filter((item) => item?.id && item?.name)
        .map((item) => [item.id, String(item.name)] as const),
    )
  }

  for (const override of overrides) {
    if (!override) continue
    if (override.location_id && locationId && override.location_id !== locationId) continue
    if (override.location_id && !locationId) continue
    const name = override.permission_id ? overrideNames.get(override.permission_id) : undefined
    if (!name) continue
    if (override.granted) permSet.add(name)
    else permSet.delete(name)
  }

  const { data: isAdmin } = await supabase.rpc('user_is_admin', { p_user: userId })
  if (isAdmin) permSet.add('*')

  return {
    permissions: normalizeSet(Array.from(permSet)),
    role_level: roleLevel,
    org_roles: Array.from(orgRoles),
    location_roles: Array.from(locationRoles),
  }
}

export async function getEffectivePermissions(
  userId: string,
  orgId: string,
  locationId?: string,
): Promise<PermissionEnvelope> {
  if (!userId || !orgId) return DEFAULT_ENVELOPE

  const supabase = createSupabaseAdminClient()
  const params = { p_user: userId, p_org: orgId, p_location: locationId ?? null }

  try {
    const { data, error } = await supabase.rpc('app.get_effective_permissions', params)
    if (error && !isMissingRpc(error)) throw error

    if (!error && Array.isArray(data)) {
      const permissions = normalizeSet(
        data
          .map((row) => {
            if (!row) return null
            if (typeof row === 'string') return row
            if (typeof row === 'object' && 'permission' in row) return String((row as any).permission ?? '')
            return null
          })
          .filter((value): value is string => typeof value === 'string' && value.length > 0),
      )

      const { assignments, rolesById } = await fetchRoleContext(supabase, userId, orgId, locationId)
      let roleLevel = 0
      const orgRoles = new Set<string>()
      const locationRoles = new Set<string>()

      for (const assignment of assignments) {
        const role = assignment?.role_id ? rolesById.get(assignment.role_id) : undefined
        if (!role) continue
        const code = role.name?.toString() ?? ''
        if (code) {
          if (!assignment.location_id) orgRoles.add(code)
          else if (locationId && assignment.location_id === locationId) locationRoles.add(code)
        }
        if (Number.isFinite(role.level)) {
          roleLevel = Math.max(roleLevel, Number.isFinite(role.level) ? role.level : 0)
        }
      }

      const { data: isAdmin } = await supabase.rpc('user_is_admin', { p_user: userId })
      const permissionSet = new Set(permissions)
      if (isAdmin) permissionSet.add('*')

      return {
        permissions: Array.from(permissionSet),
        role_level: roleLevel,
        org_roles: Array.from(orgRoles),
        location_roles: Array.from(locationRoles),
      }
    }

    return await resolveWithFallback(userId, orgId, locationId)
  } catch (error) {
    return await resolveWithFallback(userId, orgId, locationId)
  }
}
