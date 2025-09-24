'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { RoleSummary } from '@/types/permissions'

export type UserInfo = {
  id: string | null
  email: string | null
  metadata: Record<string, unknown> | null
}

export type OrgInfo = {
  id: string
  name: string | null
}

export type LocationInfo = {
  id: string
  name: string | null
}

export type HydrationPayload = {
  user: UserInfo
  org: OrgInfo | null
  location: LocationInfo | null
  availableLocations: LocationInfo[]
  permissions: string[]
  roleLevel: number
  orgRoles: RoleSummary[]
  locationRoles: RoleSummary[]
  planTags?: string[]
  roleTags?: string[]
  features?: string[]
}

export type ContextUpdatePayload = Partial<Omit<HydrationPayload, 'user'>> & {
  user?: Partial<UserInfo>
}

type StoreState = {
  hydrated: boolean
  user: UserInfo
  org: OrgInfo | null
  location: LocationInfo | null
  availableLocations: LocationInfo[]
  permissions: string[]
  roleLevel: number
  orgRoles: RoleSummary[]
  locationRoles: RoleSummary[]
  planTags: string[]
  roleTags: string[]
  features: string[]
}

type AppState = StoreState & {
  hydrate: (payload: HydrationPayload) => void
  updateContext: (payload: ContextUpdatePayload) => void
  clear: () => void
}

const initialState: StoreState = {
  hydrated: false,
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

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,
      hydrate: ({
        user,
        org,
        location,
        availableLocations,
        permissions,
        roleLevel,
        orgRoles,
        locationRoles,
        planTags = [],
        roleTags = [],
        features = []
      }) => {
        set({
          hydrated: true,
          user,
          org,
          location,
          availableLocations,
          permissions,
          roleLevel,
          orgRoles,
          locationRoles,
          planTags,
          roleTags,
          features
        })
      },
      updateContext: (payload) => {
        const current = get()
        set({
          hydrated: true,
          user: {
            ...current.user,
            ...(payload.user ?? {})
          },
          org: payload.org ?? current.org,
          location: payload.location ?? current.location,
          availableLocations: payload.availableLocations ?? current.availableLocations,
          permissions: payload.permissions ?? current.permissions,
          roleLevel: payload.roleLevel ?? current.roleLevel,
          orgRoles: payload.orgRoles ?? current.orgRoles,
          locationRoles: payload.locationRoles ?? current.locationRoles,
          planTags: payload.planTags ?? current.planTags,
          roleTags: payload.roleTags ?? current.roleTags,
          features: payload.features ?? current.features
        })
      },
      clear: () => set({ ...initialState })
    }),
    {
      name: 'app-store',
      partialize: (state) => ({
        user: state.user,
        org: state.org,
        location: state.location,
        availableLocations: state.availableLocations
      })
    }
  )
)

