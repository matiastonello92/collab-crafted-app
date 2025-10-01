'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'

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
  // Hydration safety
  hasHydrated: boolean
  
  // Core context
  context: AppContext
  
  // Performance tracking
  metrics: PerformanceMetrics
  
  // Hydration actions
  setHasHydrated: (hydrated: boolean) => void
  
  // Context actions
  setContext: (context: Partial<AppContext>) => void
  updateLocation: (locationId: string, locationName: string) => void
  clearContext: () => void
  
  // Performance methods
  recordCacheHit: () => void
  recordCacheMiss: () => void
  updateLoadTime: (time: number) => void
}

/**
 * Unified App Store - UI State Only
 * 
 * This store manages UI-related state (context, location, performance metrics).
 * Server data (permissions, users, etc.) should use SWR hooks instead.
 * 
 * @example
 * // Get context
 * const { context } = useAppStore()
 * 
 * // Update location
 * const { updateLocation } = useAppStore()
 * updateLocation(locationId, locationName)
 * 
 * // For permissions, use usePermissions() hook instead
 */
export const useAppStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        hasHydrated: false,
        
        context: {
          org_id: null,
          location_id: null,
          location_name: null,
          user_id: null,
        },
        
        metrics: {
          lastUpdated: 0,
          loadTime: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },

        setHasHydrated: (hydrated) =>
          set((state) => {
            state.hasHydrated = hydrated
          }),

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
          }),

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
        onRehydrateStorage: () => (state) => {
          if (state) {
            state.setHasHydrated(true)
          }
        },
      }
    )
  )
)

/**
 * Selective hooks for optimized re-renders
 */
export const useAppContext = () => useAppStore((state) => state.context)

export const useLocationContext = () => useAppStore((state) => ({
  location_id: state.context.location_id,
  location_name: state.context.location_name,
}))

export const usePerformanceMetrics = () => useAppStore((state) => state.metrics)

/**
 * Action hooks - only re-render when actions change (never)
 */
export const useContextActions = () => useAppStore((state) => ({
  setContext: state.setContext,
  updateLocation: state.updateLocation,
  clearContext: state.clearContext,
}))

/**
 * Performance monitoring utilities
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
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`[Performance] ${name}: ${time.toFixed(2)}ms`)
      }
      
      return result
    } catch (error) {
      const time = performance.now() - start
      
      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Performance] ${name} failed: ${time.toFixed(2)}ms`)
      }
      
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