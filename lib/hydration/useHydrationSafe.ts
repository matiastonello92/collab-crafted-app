/**
 * Enterprise-grade Hydration-Safe Hooks
 * Prevents hydration mismatches through safe state management
 */

'use client'

import { useState, useEffect } from 'react'

/**
 * Hook for safely accessing environment variables without hydration mismatch
 */
export function useEnvironment() {
  const [env, setEnv] = useState<Record<string, string>>({})
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    setEnv({
      NODE_ENV: process.env.NODE_ENV || 'production',
      // Add other env vars as needed
    })
  }, [])

  return { env, isClient }
}

/**
 * Hook for safe performance monitoring without SSR conflicts
 */
export function usePerformanceMonitor() {
  const [performanceData, setPerformanceData] = useState<{
    now: number
    timing: PerformanceTiming | null
  }>({
    now: 0,
    timing: null
  })

  useEffect(() => {
    if (typeof window !== 'undefined' && 'performance' in window) {
      setPerformanceData({
        now: performance.now(),
        timing: window.performance.timing
      })
    }
  }, [])

  return performanceData
}

/**
 * Hook for safe timestamp management
 */
export function useTimestamp(updateInterval?: number) {
  const [timestamp, setTimestamp] = useState<string>('')
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
    const updateTimestamp = () => {
      setTimestamp(new Date().toISOString())
    }
    
    updateTimestamp()
    
    if (updateInterval && updateInterval > 0) {
      const interval = setInterval(updateTimestamp, updateInterval)
      return () => clearInterval(interval)
    }
  }, [updateInterval])

  return { timestamp, isClient }
}

/**
 * Hook for conditionally rendering content based on client state
 */
export function useClientCondition<T>(
  clientValue: T,
  serverValue: T
): T {
  const [value, setValue] = useState<T>(serverValue)

  useEffect(() => {
    setValue(clientValue)
  }, [clientValue])

  return value
}