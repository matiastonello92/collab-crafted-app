'use client'

// Migration utilities for backwards compatibility during Phase 2 transition
// Allows gradual migration from old patterns to new unified system

import { useAppStore } from '@/lib/store/unified'
import { usePermissions } from '@/hooks/usePermissions'
import { checkPermission } from '@/lib/permissions/unified'

/**
 * Backwards compatible store selector
 * Gradually replace useAppStore().hasPermission with usePermissionCheck
 */
export function useLegacyPermissions() {
  const store = useAppStore()
  
  return {
    hasPermission: store.hasPermission,
    permissions: store.permissions,
    permissionsLoading: store.permissionsLoading,
  }
}

/**
 * Migration hook - provides both old and new patterns
 * Use this during transition period
 */
export function usePermissionsMigration(locationId?: string) {
  // New unified system
  const newSystem = usePermissions(locationId)
  
  // Legacy store system  
  const legacySystem = useLegacyPermissions()
  
  return {
    // New system (preferred)
    permissions: newSystem.permissions,
    isLoading: newSystem.isLoading,
    hasPermission: (required: string | string[]) => checkPermission(newSystem.permissions, required),
    
    // Legacy system (for backwards compatibility)
    legacy: {
      permissions: legacySystem.permissions,
      permissionsLoading: legacySystem.permissionsLoading,
      hasPermission: legacySystem.hasPermission,
    },
    
    // Utility
    mutate: newSystem.mutate,
  }
}