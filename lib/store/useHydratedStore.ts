'use client'

/**
 * Hydration-safe store hook
 * Prevents hydration mismatches by waiting for client-side hydration
 */

import { useEffect, useState } from 'react'
import { useAppStore } from './unified'

/**
 * Hook that returns store state only after hydration is complete
 * Returns fallback values during SSR/initial render to prevent mismatches
 */
export function useHydratedStore() {
  const [isHydrated, setIsHydrated] = useState(false)
  const store = useAppStore()
  
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        setIsHydrated(hasHydrated)
      }
    )
    
    // Check initial state
    if (useAppStore.getState().hasHydrated) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [])

  // Return fallback values during SSR/hydration
  if (!isHydrated) {
    return {
      context: {
        org_id: null,
        location_id: null,
        location_name: null,
        user_id: null,
      },
      permissions: [],
      permissionsLoading: true,
      metrics: {
        lastUpdated: 0,
        loadTime: 0,
        cacheHits: 0,
        cacheMisses: 0,
      },
      hasHydrated: false,
      // Actions from store
      setHasHydrated: store.setHasHydrated,
      setContext: store.setContext,
      updateLocation: store.updateLocation,
      clearContext: store.clearContext,
      setPermissions: store.setPermissions,
      setPermissionsLoading: store.setPermissionsLoading,
      hasPermission: store.hasPermission,
      recordCacheHit: store.recordCacheHit,
      recordCacheMiss: store.recordCacheMiss,
      updateLoadTime: store.updateLoadTime,
    }
  }

  return store
}

/**
 * Hook for safe context access during hydration
 */
export function useHydratedContext() {
  const [isHydrated, setIsHydrated] = useState(false)
  const context = useAppStore((state) => state.context)
  
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        setIsHydrated(hasHydrated)
      }
    )
    
    if (useAppStore.getState().hasHydrated) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [])

  if (!isHydrated) {
    return {
      org_id: null,
      location_id: null,
      location_name: null,
      user_id: null,
    }
  }

  return context
}