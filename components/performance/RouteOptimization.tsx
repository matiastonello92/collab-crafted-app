'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { usePrefetch } from '@/hooks/useAdvancedData'
import { usePerformanceMonitor } from '@/lib/store/modernized'

/**
 * Route prefetching and optimization component
 */
interface RouteOptimizerProps {
  prefetchRoutes?: string[]
  prefetchData?: Array<{
    key: string
    fetcher: () => Promise<any>
  }>
}

export function RouteOptimizer({ prefetchRoutes = [], prefetchData = [] }: RouteOptimizerProps) {
  const router = useRouter()
  const { prefetchUserData, prefetchLocationData } = usePrefetch()
  const { measureOperation } = usePerformanceMonitor()

  // Prefetch critical routes
  useEffect(() => {
    const prefetchRoutes_ = async () => {
      for (const route of prefetchRoutes) {
        try {
          router.prefetch(route)
          console.log(`[Performance] Route prefetched: ${route}`)
        } catch (error) {
          console.warn(`[Performance] Failed to prefetch route ${route}:`, error)
        }
      }
    }
    
    // Prefetch after initial render
    const timer = setTimeout(prefetchRoutes_, 100)
    return () => clearTimeout(timer)
  }, [prefetchRoutes, router, measureOperation])

  // Prefetch data
  useEffect(() => {
    const prefetchData_ = async () => {
      for (const { key, fetcher } of prefetchData) {
        try {
          await measureOperation(fetcher, `Data prefetch: ${key}`)
        } catch (error) {
          console.warn(`Failed to prefetch ${key}:`, error)
        }
      }
    }
    
    const timer = setTimeout(prefetchData_, 200)
    return () => clearTimeout(timer)
  }, [prefetchData, measureOperation])

  return null
}

/**
 * Smart link component with intelligent prefetching
 */
interface SmartLinkProps {
  href: string
  children: React.ReactNode
  prefetchData?: boolean
  className?: string
  [key: string]: any
}

export function SmartLink({ 
  href, 
  children, 
  prefetchData = false,
  className = '',
  ...props 
}: SmartLinkProps) {
  const router = useRouter()
  const { measureOperation } = usePerformanceMonitor()

  const handleMouseEnter = useCallback(() => {
    // Prefetch route on hover
    try {
      router.prefetch(href)
      console.log(`[Performance] Smart prefetch: ${href}`)
    } catch (error) {
      console.warn(`[Performance] Failed to prefetch ${href}:`, error)
    }
  }, [href, router])

  const handleClick = useCallback((e: React.MouseEvent) => {
    const start = performance.now()
    
    // Measure navigation time
    const originalPush = router.push
    router.push = (...args) => {
      const navTime = performance.now() - start
      console.log(`[Performance] Navigation to ${href}: ${navTime.toFixed(2)}ms`)
      return originalPush.apply(router, args)
    }
    
    if (props.onClick) {
      props.onClick(e)
    }
  }, [href, router, props.onClick])

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={handleMouseEnter}
      onClick={handleClick}
      {...props}
    >
      {children}
    </a>
  )
}

/**
 * Parallel data loading hook for route components
 */
export function useParallelDataLoading<T extends Record<string, any>>(
  dataQueries: Record<keyof T, () => Promise<any>>
) {
  const { measureOperation } = usePerformanceMonitor()
  
  const loadData = useCallback(async (): Promise<T> => {
    const start = performance.now()
    
    try {
      // Execute all queries in parallel
      const results = await Promise.allSettled(
        Object.entries(dataQueries).map(async ([key, fetcher]) => {
          const data = await measureOperation(
            fetcher as () => Promise<any>,
            `Parallel load: ${key}`
          )
          return [key, data]
        })
      )
      
      const data = {} as T
      const errors: string[] = []
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const [key, value] = result.value
          data[key as keyof T] = value
        } else {
          const key = Object.keys(dataQueries)[index]
          errors.push(`Failed to load ${key}: ${result.reason}`)
        }
      })
      
      const totalTime = performance.now() - start
      console.log(`[Performance] Parallel data loading completed: ${totalTime.toFixed(2)}ms`)
      
      if (errors.length > 0) {
        console.warn('[Performance] Some data queries failed:', errors)
      }
      
      return data
    } catch (error) {
      const totalTime = performance.now() - start
      console.error(`[Performance] Parallel data loading failed: ${totalTime.toFixed(2)}ms`, error)
      throw error
    }
  }, [dataQueries, measureOperation])
  
  return { loadData }
}

/**
 * Performance monitoring component for routes
 */
export function RoutePerformanceMonitor() {
  const { metrics, getCacheEfficiency } = usePerformanceMonitor()
  
  useEffect(() => {
    // Log performance metrics periodically in development
    if (process.env.NODE_ENV === 'development') {
      const interval = setInterval(() => {
        console.log('[Performance Metrics]', {
          cacheEfficiency: `${getCacheEfficiency().toFixed(1)}%`,
          avgLoadTime: `${metrics.loadTime.toFixed(2)}ms`,
          cacheHits: metrics.cacheHits,
          cacheMisses: metrics.cacheMisses,
        })
      }, 30000) // Every 30 seconds
      
      return () => clearInterval(interval)
    }
  }, [metrics, getCacheEfficiency])
  
  return null
}