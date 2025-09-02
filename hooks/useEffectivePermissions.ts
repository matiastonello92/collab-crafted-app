'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getUserPermissions } from '@/lib/permissions'

export function useEffectivePermissions() {
  const { context, setPermissions } = useAppStore()

  useEffect(() => {
    async function load() {
      const perms = await getUserPermissions(context.org_id || undefined, context.location_id || undefined)
      setPermissions(perms)
    }
    void load()
  }, [context.org_id, context.location_id, setPermissions])
}
