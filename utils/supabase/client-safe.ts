/**
 * Enterprise-grade SSR-Safe Supabase Client
 * Handles environment variables gracefully during build/SSR
 */

'use client'

import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { useState, useEffect } from 'react'

let supabaseClient: SupabaseClient | null = null

/**
 * Get Supabase environment variables with fallbacks
 */
function getSupabaseConfig() {
  // During build/SSR, environment variables might not be available
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  return { url, anonKey }
}

/**
 * Create SSR-safe Supabase browser client
 */
export function createSupabaseBrowserClientSafe(): SupabaseClient | null {
  // Only create client on the browser side
  if (typeof window === 'undefined') {
    return null
  }

  if (supabaseClient) {
    return supabaseClient
  }

  const { url, anonKey } = getSupabaseConfig()

  // Check if we have valid configuration
  if (!url || !anonKey) {
    console.warn('Supabase configuration missing. Client will be null.')
    return null
  }

  try {
    supabaseClient = createBrowserClient(url, anonKey)
    return supabaseClient
  } catch (error) {
    console.error('Failed to create Supabase client:', error)
    return null
  }
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig()
  return !!(url && anonKey)
}

/**
 * Hook for safely using Supabase client
 */
export function useSupabaseSafe() {
  const [client, setClient] = useState<SupabaseClient | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)

  useEffect(() => {
    const supabase = createSupabaseBrowserClientSafe()
    setClient(supabase)
    setIsConfigured(isSupabaseConfigured())
  }, [])

  return { client, isConfigured }
}

// Re-export for compatibility
export { createSupabaseBrowserClientSafe as createSupabaseBrowserClient }