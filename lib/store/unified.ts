'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { can } from '../permissions'

interface AppContext {
  org_id: string | null
  location_id: string | null
  location_name: string | null
  user_id: string | null
}

interface PerformanceMetrics {
  lastUpdated: number
  loadTime: number
  cacheHits: number
  cacheMisses: number
}

interface AppState {
  // Core context
  context: AppContext
  
  // Permissions (from old store)
  permissions: string[]
  permissionsLoading: boolean
  
  // Performance tracking (from modern store)
  metrics: PerformanceMetrics
  
  // Context actions
  setContext: (context: Partial<AppContext>) => void
  updateLocation: (locationId: string, locationName: string) => void
  clearContext: () => void
  
  // Permission actions (from old store)
  setPermissions: (permissions: string[]) => void
  setPermissionsLoading: (loading: boolean) => void
  hasPermission: (permission: string) => boolean
  
  // Performance methods (from modern store)
  recordCacheHit: () => void
  recordCacheMiss: () => void
  updateLoadTime: (time: number) => void
}

/**
 * Unified store combining permissions management and performance tracking
 * Maintains full compatibility with both old and modern store APIs
 */
export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        context: {
          org_id: null,
          location_id: null,
          location_name: null,
          user_id: null,
        },
        
        permissions: [],
        permissionsLoading: false,
        
        metrics: {
          lastUpdated: 0,
          loadTime: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },

        setContext: (newContext) =>
          set((state) => {
            Object.assign(state.context, newContext)
          }),

        updateLocation: (locationId, locationName) =>
          set((state) => {
            state.context.location_id = locationId
            state.context.location_name = locationName
          }),

        clearContext: () =>
          set((state) => {
            state.context = {
              org_id: null,
              location_id: null,
              location_name: null,
              user_id: null,
            }
            state.permissions = []
            state.permissionsLoading = false
          }),

        setPermissions: (permissions) =>
          set((state) => {
            state.permissions = permissions
          }),

        setPermissionsLoading: (loading) =>
          set((state) => {
            state.permissionsLoading = loading
          }),

        hasPermission: (permission) => {
          const { permissions } = get()
          return can(permissions, permission)
        },

        recordCacheHit: () =>
          set((state) => {
            state.metrics.cacheHits++
          }),

        recordCacheMiss: () =>
          set((state) => {
            state.metrics.cacheMisses++
          }),

        updateLoadTime: (time) =>
          set((state) => {
            state.metrics.loadTime = time
          }),
      })),
      {
        name: 'app-store',
        partialize: (state) => ({ 
          context: state.context,
          metrics: {
            ...state.metrics,
            cacheHits: 0, // Reset cache metrics on reload
            cacheMisses: 0,
          }
        }),
      }
    )
  )
)

// Selective hooks for performance (modern store compatibility)
export const useAppContext = () => useAppStore((state) => state.context)
export const useLocationContext = () => useAppStore((state) => ({
  location_id: state.context.location_id,
  location_name: state.context.location_name,
}))
export const usePerformanceMetrics = () => useAppStore((state) => state.metrics)

// Action hooks (modern store compatibility)
export const useContextActions = () => useAppStore((state) => ({
  setContext: state.setContext,
  updateLocation: state.updateLocation,
  clearContext: state.clearContext,
}))

/**
 * Performance monitoring hook (modern store compatibility)
 */
export function usePerformanceMonitor() {
  const metrics = usePerformanceMetrics()
  const { recordCacheHit, recordCacheMiss, updateLoadTime } = useAppStore()
  
  const measureOperation = async <T>(operation: () => Promise<T>, name: string): Promise<T> => {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return await operation()
    }
    
    const start = performance.now()
    try {
      const result = await operation()
      const time = performance.now() - start
      updateLoadTime(time)
      console.log(`[Performance] ${name}: ${time.toFixed(2)}ms`)
      return result
    } catch (error) {
      const time = performance.now() - start
      console.warn(`[Performance] ${name} failed: ${time.toFixed(2)}ms`)
      throw error
    }
  }

  const getCacheEfficiency = () => {
    const total = metrics.cacheHits + metrics.cacheMisses
    return total > 0 ? (metrics.cacheHits / total) * 100 : 0
  }

  return {
    metrics,
    measureOperation,
    getCacheEfficiency,
    recordCacheHit,
    recordCacheMiss,
  }
}

// Legacy compatibility - re-export the main store as useModernStore
export const useModernStore = useAppStore