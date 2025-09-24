import 'server-only'

import { cookies } from 'next/headers'

import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { getEffectivePermissions } from '@/lib/server/permission-service'
import type { HydrationPayload, LocationInfo, OrgInfo, UserInfo } from '@/lib/store'
import { normalizeSet } from '@/lib/permissions'

type AuthenticatedState = HydrationPayload

function emptyState(): AuthenticatedState {
  return {
    user: { id: null, email: null, metadata: null },
    org: null,
    location: null,
    availableLocations: [],
    permissions: [],
    roleLevel: 0,
    orgRoles: [],
    locationRoles: [],
    planTags: [],
    roleTags: [],
    features: []
  }
}

export async function loadAuthenticatedState(): Promise<AuthenticatedState> {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return emptyState()
  }

  const userInfo: UserInfo = {
    id: user.id,
    email: user.email ?? null,
    metadata: (user as any)?.user_metadata ?? null
  }

  const jar = await cookies()
  const persistedLocationId = jar.get('pn_loc')?.value ?? null

  const { data: memberships, error: membershipsError } = await supabase
    .from('user_roles_locations')
    .select('org_id, location_id, locations(id,name)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  if (membershipsError) {
    console.error('[session-context] memberships error', membershipsError)
    return {
      ...emptyState(),
      user: userInfo
    }
  }

  const locationMap = new Map<string, LocationInfo>()
  let resolvedOrgId: string | null = null

  for (const item of memberships ?? []) {
    const orgId = (item as any)?.org_id as string | null ?? null
    const locationId = (item as any)?.location_id as string | null ?? null
    if (orgId && !resolvedOrgId) {
      resolvedOrgId = orgId
    }
    if (!locationId || locationMap.has(locationId)) continue
    const location = (item as any)?.locations ?? {}
    locationMap.set(locationId, {
      id: locationId,
      name: location?.name ?? null
    })
  }

  const availableLocations = Array.from(locationMap.values()).sort((a, b) => {
    return (a.name ?? '').localeCompare(b.name ?? '')
  })

  // Resolve organization from profile if memberships missing org_id
  if (!resolvedOrgId) {
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle()
    resolvedOrgId = profile?.org_id ?? null
  }

  let org: OrgInfo | null = null
  if (resolvedOrgId) {
    const { data: orgRow } = await supabase
      .from('organizations')
      .select('org_id, name')
      .eq('org_id', resolvedOrgId)
      .maybeSingle()
    org = {
      id: resolvedOrgId,
      name: orgRow?.name ?? null
    }
  }

  const activeLocation = availableLocations.find((loc) => loc.id === persistedLocationId) ?? availableLocations[0] ?? null

  if (!org?.id) {
    return {
      ...emptyState(),
      user: userInfo,
      org,
      location: activeLocation,
      availableLocations
    }
  }

  const permissionBundle = await getEffectivePermissions(user.id, org.id, activeLocation?.id ?? null)
  const meta: any = (user as any)?.app_metadata ?? {}
  const claimPermissions: string[] = Array.isArray(meta.permissions) ? meta.permissions : []
  const mergedPermissions = normalizeSet([...permissionBundle.permissions, ...claimPermissions])
  const claimedRoleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0)
  const roleLevel = Math.max(permissionBundle.role_level, Number.isFinite(claimedRoleLevel) ? claimedRoleLevel : 0)
  const effectivePermissions = roleLevel >= 90 && !mergedPermissions.includes('*')
    ? [...mergedPermissions, '*']
    : mergedPermissions

  return {
    user: userInfo,
    org,
    location: activeLocation,
    availableLocations,
    permissions: effectivePermissions,
    roleLevel,
    orgRoles: permissionBundle.org_roles,
    locationRoles: permissionBundle.location_roles,
    planTags: [],
    roleTags: [],
    features: []
  }
}

