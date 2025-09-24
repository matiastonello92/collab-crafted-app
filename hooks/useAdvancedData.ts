'use client'

import useSWR from 'swr'
import { useCallback, useMemo } from 'react'
import { useSupabase } from '@/hooks/useSupabase'

interface CacheConfig {
  dedupingInterval?: number
  revalidateOnFocus?: boolean
  revalidateOnReconnect?: boolean
  refreshInterval?: number
  errorRetryCount?: number
}

const defaultConfig: CacheConfig = {
  dedupingInterval: 300000, // 5 minutes
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  errorRetryCount: 2,
}

/**
 * Advanced data fetching hook with intelligent caching
 * Replaces manual fetch patterns with optimized SWR
 */
export function useAdvancedData<T>(
  key: string | null,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const mergedConfig = { ...defaultConfig, ...config }
  
  const { data, error, isLoading, mutate, isValidating } = useSWR<T>(
    key,
    fetcher,
    mergedConfig
  )

  const refresh = useCallback(() => mutate(), [mutate])
  
  const updateData = useCallback((updater: (data: T) => T) => {
    mutate(current => current ? updater(current) : current, false)
  }, [mutate])

  return {
    data,
    error,
    isLoading,
    isValidating,
    refresh,
    updateData,
    mutate,
  }
}

/**
 * Batch multiple API calls with parallel execution and unified loading state
 */
export function useBatchData<T extends Record<string, any>>(
  queries: Record<keyof T, () => Promise<any>>,
  config: CacheConfig = {}
) {
  const results = Object.entries(queries).reduce((acc, [key, fetcher]) => {
    acc[key as keyof T] = useAdvancedData(key, fetcher as () => Promise<any>, config)
    return acc
  }, {} as Record<keyof T, ReturnType<typeof useAdvancedData>>)

  const isLoading = Object.values(results).some(result => result.isLoading)
  const hasError = Object.values(results).some(result => result.error)
  const data = Object.entries(results).reduce((acc, [key, result]) => {
    acc[key as keyof T] = result.data as any
    return acc
  }, {} as T)

  const refreshAll = useCallback(() => {
    Object.values(results).forEach(result => result.refresh())
  }, [results])

  return {
    data,
    isLoading,
    hasError,
    refreshAll,
    results,
  }
}

/**
 * Optimistic updates for better UX
 */
export function useOptimisticData<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {}
) {
  const { data, mutate, ...rest } = useAdvancedData(key, fetcher, config)

  const optimisticUpdate = useCallback(async (
    optimisticData: T,
    asyncUpdate: () => Promise<T>
  ) => {
    // Immediately show optimistic data
    mutate(optimisticData, false)
    
    try {
      // Perform async operation
      const result = await asyncUpdate()
      // Update with real data
      mutate(result, false)
      return result
    } catch (error) {
      // Revert on error
      mutate(data, false)
      throw error
    }
  }, [mutate, data])

  return {
    data,
    mutate,
    optimisticUpdate,
    ...rest,
  }
}

/**
 * Smart prefetching for improved navigation performance
 */
export function usePrefetch() {
  const supabase = useSupabase()

  const prefetchUserData = useCallback(async (userId: string) => {
    const key = `user-${userId}`
    const fetcher = () => fetch(`/api/v1/admin/users/${userId}`).then(r => r.json())
    // Pre-populate SWR cache
    const { mutate } = useSWR(key, null, { revalidateOnMount: false })
    const data = await fetcher()
    mutate(data, false)
  }, [])

  const prefetchLocationData = useCallback(async (locationId: string) => {
    const key = `location-${locationId}`
    const fetcher = () => fetch(`/api/v1/admin/locations/${locationId}`).then(r => r.json())
    const { mutate } = useSWR(key, null, { revalidateOnMount: false })
    const data = await fetcher()
    mutate(data, false)
  }, [])

  return {
    prefetchUserData,
    prefetchLocationData,
  }
}