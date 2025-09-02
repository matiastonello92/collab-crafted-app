import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppContext {
  org_id: string | null
  location_id: string | null
  location_name: string | null
  user_id: string | null
}

interface AppState {
  context: AppContext
  permissions: string[]
  setContext: (context: AppContext) => void
  setPermissions: (permissions: string[]) => void
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
      setContext: (context) => set({ context }),
      setPermissions: (permissions) => set({ permissions }),
      clearContext: () => set({
        context: { org_id: null, location_id: null, location_name: null, user_id: null },
        permissions: []
      }),
      hasPermission: (permission) => {
        const { permissions } = get()
        return permissions.includes(permission)
      },
    }),
    {
      name: 'app-store',
      partialize: (state) => ({ context: state.context }),
    }
  )
)
