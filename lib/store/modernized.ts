'use client'

import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { TimestampProvider } from '@/lib/hydration/TimestampProvider'

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
  
  // Performance tracking
  metrics: PerformanceMetrics
  
  // Actions
  setContext: (context: Partial<AppContext>) => void
  updateLocation: (locationId: string, locationName: string) => void
  clearContext: () => void
  
  // Performance methods
  recordCacheHit: () => void
  recordCacheMiss: () => void
  updateLoadTime: (time: number) => void
}

/**
 * Modernized store with performance tracking and selective updates
 * Uses immer for immutable updates and subscribeWithSelector for granular subscriptions
 */
export const useModernStore = create<AppState>()(
  subscribeWithSelector(
    persist(
      immer((set, get) => ({
        context: {
          org_id: null,
          location_id: null,
          location_name: null,
          user_id: null,
        },
        
        metrics: {
          lastUpdated: 0, // Will be set consistently on client
          loadTime: 0,
          cacheHits: 0,
          cacheMisses: 0,
        },

        setContext: (newContext) =>
          set((state) => {
            Object.assign(state.context, newContext)
            state.metrics.lastUpdated = typeof window !== 'undefined' ? Date.now() : 0
          }),

        updateLocation: (locationId, locationName) =>
          set((state) => {
            state.context.location_id = locationId
            state.context.location_name = locationName
            state.metrics.lastUpdated = typeof window !== 'undefined' ? Date.now() : 0
          }),

        clearContext: () =>
          set((state) => {
            state.context = {
              org_id: null,
              location_id: null,
              location_name: null,
              user_id: null,
            }
            state.metrics.lastUpdated = typeof window !== 'undefined' ? Date.now() : 0
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
        name: 'modern-app-store',
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

// Selective hooks for performance
export const useAppContext = () => useModernStore((state) => state.context)
export const useLocationContext = () => useModernStore((state) => ({
  location_id: state.context.location_id,
  location_name: state.context.location_name,
}))
export const usePerformanceMetrics = () => useModernStore((state) => state.metrics)

// Action hooks
export const useContextActions = () => useModernStore((state) => ({
  setContext: state.setContext,
  updateLocation: state.updateLocation,
  clearContext: state.clearContext,
}))

/**
 * Performance monitoring hook
 */
export function usePerformanceMonitor() {
  const metrics = usePerformanceMetrics()
  const { recordCacheHit, recordCacheMiss, updateLoadTime } = useModernStore()
  
  const measureOperation = async <T>(operation: () => Promise<T>, name: string): Promise<T> => {
    // Only measure performance on client-side
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