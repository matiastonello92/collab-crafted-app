'use client'

import { ReactNode } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'

interface PermissionGuardProps {
  children: ReactNode
  required: string | string[]
  locationId?: string
  fallback?: ReactNode
  requireAll?: boolean // true = ALL permissions required, false = ANY permission required
}

/**
 * Component-level permission guard using new unified system
 * Replaces manual permission checks in components
 */
export function PermissionGuard({ 
  children, 
  required, 
  locationId, 
  fallback = null,
  requireAll = false 
}: PermissionGuardProps) {
  const { permissions, isLoading } = usePermissions(locationId)

  if (isLoading) {
    return <div className="animate-pulse bg-muted/50 h-8 w-full rounded" />
  }

  const requiredList = Array.isArray(required) ? required : [required]
  
  const hasAccess = requireAll
    ? requiredList.every(perm => checkPermission(permissions, perm))
    : requiredList.some(perm => checkPermission(permissions, perm))

  return hasAccess ? <>{children}</> : <>{fallback}</>
}