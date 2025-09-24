'use client'

import type { ReactNode } from 'react'
import { usePermissions } from '@/hooks/use-permissions'

interface PermissionGateProps {
  required?: string | string[]
  mode?: 'all' | 'any'
  fallback?: ReactNode
  children: ReactNode
}

export function PermissionGate({ required, mode = 'all', fallback = null, children }: PermissionGateProps) {
  const { ready, can, canAll, canAny } = usePermissions()

  if (!ready) {
    return fallback ? <>{fallback}</> : null
  }

  if (!required) {
    return <>{children}</>
  }

  const allowed = Array.isArray(required)
    ? mode === 'any'
      ? canAny(required)
      : canAll(required)
    : can(required)

  return allowed ? <>{children}</> : <>{fallback}</>
}
