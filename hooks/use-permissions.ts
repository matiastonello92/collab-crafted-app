'use client'

import { useAppStore } from '@/lib/store'

export function usePermissions() {
  const state = useAppStore((store) => ({
    permissions: store.permissions,
    loading: store.permissionsLoading,
    can: store.can,
    canAny: store.canAny,
    canAll: store.canAll,
    roleLevel: store.roleLevel,
    orgRoles: store.orgRoles,
    locationRoles: store.locationRoles,
  }))

  return {
    permissions: state.permissions,
    loading: state.loading,
    ready: !state.loading,
    can: state.can,
    canAny: state.canAny,
    canAll: state.canAll,
    roleLevel: state.roleLevel,
    orgRoles: state.orgRoles,
    locationRoles: state.locationRoles,
  }
}
