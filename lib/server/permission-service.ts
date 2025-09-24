import 'server-only'

import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { normalizeSet } from '@/lib/permissions'
import type { RoleSummary } from '@/types/permissions'

type RoleRecord = {
  role_id: string
  location_id: string | null
  org_id: string
  roles: {
    id: string
    name: string
    display_name: string
    level: number
  } | null
  locations: {
    id: string
    name: string | null
  } | null
}

export type EffectivePermissionsPayload = {
  permissions: string[]
  role_level: number
  org_roles: RoleSummary[]
  location_roles: RoleSummary[]
}

function mapRole(record: RoleRecord): RoleSummary | null {
  const role = record.roles
  if (!role || !record.role_id) return null

  return {
    id: record.role_id,
    code: role.name,
    name: role.display_name ?? role.name,
    level: role.level ?? 0,
    location_id: record.location_id ?? null,
    location_name: record.locations?.name ?? null
  }
}

export async function getEffectivePermissions(
  userId: string,
  orgId: string,
  locationId?: string | null
): Promise<EffectivePermissionsPayload> {
  const supabase = await createSupabaseUserClient()

  if (orgId) {
    await supabase.rpc('app.set_context', {
      p_org: orgId,
      p_location: locationId ?? null
    })
  }

  const [{ data: permissionsRows, error: permError }, { data: roleRows, error: roleError }] = await Promise.all([
    supabase
      .rpc('app.get_effective_permissions', {
        p_user: userId,
        p_org: orgId,
        p_location: locationId ?? null
      }),
    supabase
      .from('user_roles_locations')
      .select(
        'role_id, location_id, org_id, roles(id, name, display_name, level), locations(id, name)'
      )
      .eq('user_id', userId)
      .eq('org_id', orgId)
      .is('is_active', true)
  ])

  if (permError) {
    throw permError
  }

  if (roleError) {
    throw roleError
  }

  const permissions = normalizeSet(
    Array.isArray(permissionsRows)
      ? permissionsRows
          .map((row: { permission?: string } | string) =>
            typeof row === 'string' ? row : row?.permission ?? ''
          )
          .filter(Boolean)
      : []
  )

  const summaries = Array.isArray(roleRows)
    ? roleRows
        .map((row) => mapRole(row as RoleRecord))
        .filter((value): value is RoleSummary => Boolean(value))
    : []

  const roleLevel = summaries.reduce((max, role) => Math.max(max, role.level), 0)

  const orgRoles = summaries.filter((role) => role.location_id === null)
  const locationRoles = summaries.filter((role) => {
    if (!role.location_id) return false
    if (!locationId) return true
    return role.location_id === locationId
  })

  return {
    permissions,
    role_level: roleLevel,
    org_roles: orgRoles,
    location_roles: locationRoles
  }
}

