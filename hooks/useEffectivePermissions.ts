'use client'

import { useEffect, useRef } from 'react'
import { useHydratedStore } from '@/lib/store/useHydratedStore'
import { useAppStore } from '@/lib/store/unified'
import { getUserPermissions, normalizeSet } from '@/lib/permissions'
import { createSupabaseBrowserClient } from '@/utils/supabase/client'

export function useEffectivePermissions() {
  const { context, setPermissions, setPermissionsLoading } = useHydratedStore()
  const hasHydrated = useAppStore(state => state.hasHydrated) // Use selector instead of getState()
  const storeContext = useAppStore(state => state.context) // Use selector
  const globalPerms = useRef<string[]>([])

  // load global permissions once
  useEffect(() => {
    let mounted = true
    async function loadGlobal() {
      setPermissionsLoading(true)
      try {
        // Derive admin from JWT claims to ensure '*' is present immediately
        const supabase = createSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        let claimStar = false
        if (user) {
          const meta: any = (user as any).app_metadata || {}
          const claimPerms: string[] = Array.isArray(meta.permissions) ? meta.permissions : []
          const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0)
          claimStar = claimPerms.includes('*') || (Number.isFinite(roleLevel) && roleLevel >= 90)
        }

        const perms = await getUserPermissions()
        if (!mounted) return

        const merged = normalizeSet([...perms, ...(claimStar ? ['*'] : [])])
        globalPerms.current = merged
        // Use captured values from selectors instead of getState()
        const ctx = hasHydrated ? storeContext : { location_id: null }
        if (!ctx.location_id) {
          setPermissions(merged)
        }
      } finally {
        if (mounted) setPermissionsLoading(false)
      }
    }
    void loadGlobal()
    return () => {
      mounted = false
    }
  }, [setPermissions, setPermissionsLoading, hasHydrated, storeContext])

  // load location scoped permissions when location changes
  useEffect(() => {
    let mounted = true
    async function loadScoped() {
      setPermissionsLoading(true)
      try {
        if (context.location_id) {
          const scoped = await getUserPermissions(context.location_id)
          if (!mounted) return
          // Merge global permissions with scoped, never reset
          setPermissions(normalizeSet([...globalPerms.current, ...scoped]))
        } else {
          // Keep global permissions when no location selected
          setPermissions(normalizeSet(globalPerms.current))
        }
      } finally {
        if (mounted) setPermissionsLoading(false)
      }
    }
    void loadScoped()
    return () => {
      mounted = false
    }
  }, [context.location_id, setPermissions, setPermissionsLoading])
}
