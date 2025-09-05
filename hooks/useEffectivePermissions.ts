'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/lib/store'
import { getUserPermissions } from '@/lib/permissions'

export function useEffectivePermissions() {
  const { setPermissions } = useAppStore()

  useEffect(() => {
    async function load() {
      const perms = await getUserPermissions()
      setPermissions(perms)
    }
    void load()
  }, [setPermissions])
}
