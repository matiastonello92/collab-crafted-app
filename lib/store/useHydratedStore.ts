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
  const storeHasHydrated = useAppStore(state => state.hasHydrated) // Use selector
  
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        setIsHydrated(hasHydrated)
      }
    )
    
    // Use selector value instead of getState()
    if (storeHasHydrated) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [storeHasHydrated])

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
  const storeHasHydrated = useAppStore(state => state.hasHydrated) // Use selector
  
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        setIsHydrated(hasHydrated)
      }
    )
    
    // Use selector value instead of getState()
    if (storeHasHydrated) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [storeHasHydrated])

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

/**
 * Hook for safe location context access during hydration
 */
export function useHydratedLocationContext() {
  const [isHydrated, setIsHydrated] = useState(false)
  const locationId = useAppStore((state) => state.context.location_id)
  const locationName = useAppStore((state) => state.context.location_name)
  const storeHasHydrated = useAppStore(state => state.hasHydrated)
  
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        setIsHydrated(hasHydrated)
      }
    )
    
    if (storeHasHydrated) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [storeHasHydrated])

  if (!isHydrated) {
    return {
      location_id: null,
      location_name: null,
    }
  }

  return {
    location_id: locationId,
    location_name: locationName,
  }
}

/**
 * Hook for safe org_id access during hydration
 */
export function useHydratedOrgId() {
  const [isHydrated, setIsHydrated] = useState(false)
  const orgId = useAppStore((state) => state.context.org_id)
  const storeHasHydrated = useAppStore(state => state.hasHydrated)
  
  useEffect(() => {
    const unsubscribe = useAppStore.subscribe(
      (state) => state.hasHydrated,
      (hasHydrated) => {
        setIsHydrated(hasHydrated)
      }
    )
    
    if (storeHasHydrated) {
      setIsHydrated(true)
    }
    
    return unsubscribe
  }, [storeHasHydrated])

  if (!isHydrated) {
    return null
  }

  return orgId
}