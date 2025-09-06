'use client'

import { useEffect, useRef } from 'react'
import { useAppStore } from '@/lib/store'
import { getUserPermissions, normalizeSet } from '@/lib/permissions'

export function useEffectivePermissions() {
  const { context, setPermissions } = useAppStore()
  const globalPerms = useRef<string[]>([])

  // load global permissions once
  useEffect(() => {
    let mounted = true
    async function loadGlobal() {
      const perms = await getUserPermissions()
      if (!mounted) return
      globalPerms.current = perms
      const { context: ctx } = useAppStore.getState()
      if (!ctx.location_id) {
        setPermissions(normalizeSet(perms))
      }
    }
    void loadGlobal()
    return () => {
      mounted = false
    }
  }, [setPermissions])

  // load location scoped permissions when location changes
  useEffect(() => {
    let mounted = true
    async function loadScoped() {
      if (context.location_id) {
        const scoped = await getUserPermissions(context.location_id)
        if (!mounted) return
        setPermissions(normalizeSet([...globalPerms.current, ...scoped]))
      } else {
        setPermissions(normalizeSet(globalPerms.current))
      }
    }
    void loadScoped()
    return () => {
      mounted = false
    }
  }, [context.location_id, setPermissions])
}
