'use client'

import { ReactNode, createContext, useContext, useEffect, useState } from 'react'
import { useAdvancedData, useBatchData } from '@/hooks/useAdvancedData'
import { usePerformanceMonitor } from '@/lib/store/unified'
import { useIsClient } from '@/lib/hydration/ClientOnly'

interface DataContextType<T = any> {
  data: T
  isLoading: boolean
  error: any
  refresh: () => void
}

const DataContext = createContext<DataContextType | null>(null)

/**
 * Data Provider - Separates data fetching from UI rendering
 * Implements container/presenter pattern for better performance
 */
interface DataProviderProps<T> {
  children: ReactNode
  fetcher: () => Promise<T>
  cacheKey: string
  fallback?: ReactNode
}

export function DataProvider<T>({ 
  children, 
  fetcher, 
  cacheKey, 
  fallback 
}: DataProviderProps<T>) {
  const { measureOperation } = usePerformanceMonitor()
  
  const { data, isLoading, error, refresh } = useAdvancedData(
    cacheKey,
    () => measureOperation(fetcher, `Data fetch: ${cacheKey}`),
    { dedupingInterval: 300000 }
  )

  if (isLoading) {
    return <>{fallback || <DataLoadingSkeleton />}</>
  }

  if (error) {
    return <DataErrorFallback error={error} onRetry={refresh} />
  }

  const contextValue: DataContextType<T> = {
    data: data as T,
    isLoading,
    error,
    refresh,
  }

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  )
}

/**
 * Hook to consume data from DataProvider
 */
export function useDataContext<T = any>(): DataContextType<T> {
  const context = useContext(DataContext)
  if (!context) {
    throw new Error('useDataContext must be used within a DataProvider')
  }
  return context as DataContextType<T>
}

/**
 * Batch Data Provider - For multiple related data sources
 */
interface BatchDataProviderProps {
  children: ReactNode
  queries: Record<string, () => Promise<any>>
  fallback?: ReactNode
}

export function BatchDataProvider({ 
  children, 
  queries, 
  fallback 
}: BatchDataProviderProps) {
  const { data, isLoading, hasError, refreshAll } = useBatchData(queries)

  if (isLoading) {
    return <>{fallback || <DataLoadingSkeleton />}</>
  }

  if (hasError) {
    return <DataErrorFallback error="Failed to load data" onRetry={refreshAll} />
  }

  const contextValue: DataContextType = {
    data,
    isLoading,
    error: null,
    refresh: refreshAll,
  }

  return (
    <DataContext.Provider value={contextValue}>
      {children}
    </DataContext.Provider>
  )
}

/**
 * Optimized loading skeleton
 */
function DataLoadingSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-4 bg-muted rounded w-3/4" />
      <div className="h-4 bg-muted rounded w-1/2" />
      <div className="h-8 bg-muted rounded w-1/4" />
    </div>
  )
}

/**
 * Error fallback component
 */
interface DataErrorFallbackProps {
  error: any
  onRetry: () => void
}

function DataErrorFallback({ error, onRetry }: DataErrorFallbackProps) {
  const errorMessage = error?.message || 'Something went wrong'
  
  return (
    <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
      <h3 className="font-medium text-destructive mb-2">Error Loading Data</h3>
      <p className="text-sm text-muted-foreground mb-3">{errorMessage}</p>
      <button 
        onClick={onRetry}
        className="text-sm bg-background border rounded px-3 py-1 hover:bg-muted transition-colors"
      >
        Try Again
      </button>
    </div>
  )
}

/**
 * Performance-optimized component wrapper
 */
interface OptimizedComponentProps {
  children: ReactNode
  name: string
}

export function OptimizedComponent({ children, name }: OptimizedComponentProps) {
  const isClient = useIsClient()
  const [performanceData, setPerformanceData] = useState<{ time: number } | null>(null)
  
  // Measure render performance only on client-side and in development
  useEffect(() => {
    if (isClient && process.env.NODE_ENV === 'development') {
      const start = performance.now()
      // Measure on next tick to avoid hydration issues
      const timer = setTimeout(() => {
        const time = performance.now() - start
        setPerformanceData({ time })
        if (time > 16) { // Flag slow renders (>16ms = 60fps threshold)
          console.warn(`[Performance] Slow render detected in ${name}: ${time.toFixed(2)}ms`)
        }
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [isClient, name])
  
  return <>{children}</>
}