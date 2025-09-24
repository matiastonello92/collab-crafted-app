'use client'

import type { ReactNode } from 'react'

import type { PermReq } from '@/lib/permissions'
import { usePermissions } from '@/hooks/usePermissions'

type PermissionGateProps = {
  required?: PermReq
  any?: ReadonlyArray<PermReq>
  all?: ReadonlyArray<PermReq>
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({
  required,
  any,
  all,
  fallback = null,
  children
}: PermissionGateProps) {
  const { hydrated, can, canAny, canAll } = usePermissions()

  const checks: boolean[] = []

  if (required) {
    checks.push(can(required))
  }
  if (any && any.length > 0) {
    checks.push(canAny(any))
  }
  if (all && all.length > 0) {
    checks.push(canAll(all))
  }

  const allowed = checks.length === 0 ? true : checks.every(Boolean)

  if (!hydrated) {
    return null
  }

  if (!allowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

