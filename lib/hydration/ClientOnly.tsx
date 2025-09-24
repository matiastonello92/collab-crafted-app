/**
 * Enterprise-grade Client-Only Component Wrapper
 * Prevents hydration mismatches by deferring rendering until client-side
 */

'use client'

import { useState, useEffect, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Wrapper component that only renders children on the client side
 * Prevents hydration mismatches for browser-specific components
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false)

  useEffect(() => {
    setHasMounted(true)
  }, [])

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

/**
 * Hook to safely check if we're on the client side
 */
export function useIsClient(): boolean {
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  return isClient
}