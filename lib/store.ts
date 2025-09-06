import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { can } from './permissions'

interface AppContext {
  org_id: string | null
  location_id: string | null
  location_name: string | null
  user_id: string | null
}

interface AppState {
  context: AppContext
  permissions: string[]
  permissionsLoading: boolean
  setContext: (context: AppContext) => void
  setPermissions: (permissions: string[]) => void
  setPermissionsLoading: (loading: boolean) => void
  clearContext: () => void
  hasPermission: (permission: string) => boolean
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      context: {
        org_id: null,
        location_id: null,
        location_name: null,
        user_id: null,
      },
      permissions: [],
      permissionsLoading: false,
      setContext: (context) => set({ context }),
      setPermissions: (permissions) => set({ permissions }),
      setPermissionsLoading: (loading) => set({ permissionsLoading: loading }),
      clearContext: () => set({
        context: { org_id: null, location_id: null, location_name: null, user_id: null },
        permissions: [],
        permissionsLoading: false,
      }),
      hasPermission: (permission) => {
        const { permissions } = get()
        return can(permissions, permission)
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ context: state.context }),
    }
  )
)
