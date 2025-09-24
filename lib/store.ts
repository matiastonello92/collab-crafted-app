'use client'

import { create } from 'zustand'
import { normalizeSet, can as evaluateCan } from '@/lib/permissions'
import type { AppBootstrap, LocationSummary, OrgSummary, UserSummary } from '@/types/app-bootstrap'

type AppContext = {
  user: UserSummary | null
  org: OrgSummary | null
  location: LocationSummary | null
}

type PermissionInput = string | ReadonlyArray<string>

type AppState = {
  context: AppContext
  permissions: string[]
  roleLevel: number
  orgRoles: string[]
  locationRoles: string[]
  features: string[]
  plan_tags: string[]
  role_tags: string[]
  permissionsLoading: boolean
  hydrate: (payload: AppBootstrap) => void
  setContext: (patch: Partial<AppContext> | null) => void
  setPermissionsLoading: (loading: boolean) => void
  clear: () => void
  can: (permission: PermissionInput) => boolean
  canAny: (permissions: PermissionInput) => boolean
  canAll: (permissions: PermissionInput) => boolean
}

const emptyContext: AppContext = {
  user: null,
  org: null,
  location: null,
}

function createInitialState() {
  return {
    context: { ...emptyContext },
    permissions: [] as string[],
    roleLevel: 0,
    orgRoles: [] as string[],
    locationRoles: [] as string[],
    features: [] as string[],
    plan_tags: [] as string[],
    role_tags: [] as string[],
    permissionsLoading: true,
  }
}

function ensureLocation(location: LocationSummary | null | undefined): LocationSummary | null {
  if (!location) return null
  return {
    id: location.id,
    name: location.name || 'Sede',
    city: location.city ?? '',
  }
}

export const useAppStore = create<AppState>()((set, get) => ({
  ...createInitialState(),
  hydrate: (payload) => {
    set({
      context: {
        user: payload.context?.user ?? null,
        org: payload.context?.org ?? null,
        location: ensureLocation(payload.context?.location),
      },
      permissions: normalizeSet(payload.permissions ?? []),
      roleLevel: payload.role_level ?? 0,
      orgRoles: Array.isArray(payload.org_roles) ? Array.from(new Set(payload.org_roles)) : [],
      locationRoles: Array.isArray(payload.location_roles)
        ? Array.from(new Set(payload.location_roles))
        : [],
      features: Array.isArray(payload.features) ? payload.features : [],
      plan_tags: Array.isArray(payload.plan_tags) ? payload.plan_tags : [],
      role_tags: Array.isArray(payload.role_tags) ? payload.role_tags : [],
      permissionsLoading: false,
    })
  },
  setContext: (patch) => {
    if (!patch) {
      set({ context: { ...emptyContext } })
      return
    }
    set((state) => ({
      context: {
        user: patch.user ?? state.context.user,
        org: patch.org ?? state.context.org,
        location:
          patch.location !== undefined
            ? ensureLocation(patch.location)
            : state.context.location,
      },
    }))
  },
  setPermissionsLoading: (loading) => set({ permissionsLoading: loading }),
  clear: () => set(createInitialState()),
  can: (permission) => evaluateCan(get().permissions, permission),
  canAny: (permissions) => {
    const requirements = Array.isArray(permissions) ? permissions : [permissions]
    return requirements.some((permission) => evaluateCan(get().permissions, permission))
  },
  canAll: (permissions) => {
    const requirements = Array.isArray(permissions) ? permissions : [permissions]
    return requirements.every((permission) => evaluateCan(get().permissions, permission))
  },
}))
