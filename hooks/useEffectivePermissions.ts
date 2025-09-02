'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getUserPermissions } from '@/lib/permissions'

export function useEffectivePermissions() {
  const { context, setPermissions } = useAppStore()

  useEffect(() => {
    async function load() {
      const perms = await getUserPermissions(undefined, context.location_id || undefined)
      setPermissions(perms)
    }
    if (context.location_id) {
      void load()
    } else {
      setPermissions([])
    }
  }, [context.location_id, setPermissions])
}
