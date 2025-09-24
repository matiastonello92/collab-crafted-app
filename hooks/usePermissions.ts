'use client'

import { useCallback } from 'react'

import { useAppStore } from '@/lib/store'
import { can, type PermReq } from '@/lib/permissions'

export function usePermissions() {
  const hydrated = useAppStore((state) => state.hydrated)
  const permissions = useAppStore((state) => state.permissions)
  const roleLevel = useAppStore((state) => state.roleLevel)
  const planTags = useAppStore((state) => state.planTags)
  const roleTags = useAppStore((state) => state.roleTags)
  const features = useAppStore((state) => state.features)

  const check = useCallback(
    (required: PermReq) => can(permissions, required),
    [permissions]
  )

  const checkAny = useCallback(
    (requirements: ReadonlyArray<PermReq>) => requirements.some((req) => check(req)),
    [check]
  )

  const checkAll = useCallback(
    (requirements: ReadonlyArray<PermReq>) => requirements.every((req) => check(req)),
    [check]
  )

  return {
    hydrated,
    permissions,
    roleLevel,
    planTags,
    roleTags,
    features,
    can: check,
    canAny: checkAny,
    canAll: checkAll
  }
}

