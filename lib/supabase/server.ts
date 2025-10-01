/**
 * Server-Side Supabase Exports
 * 
 * Use this in Server Components, API Routes, and Server Actions only.
 * For Client Components, use '@/lib/supabase/client'
 * 
 * @example
 * // Server Component or API Route
 * import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server'
 */

import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSupabaseEnv } from '@/utils/supabase/config'

// Re-export server client
export { createSupabaseServerClient } from '@/utils/supabase/server'

/**
 * Create Supabase Admin Client with service role key
 * Use this for operations that need to bypass RLS
 * 
 * WARNING: Only use in secure server-side contexts
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const { url } = requireSupabaseEnv()
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  if (!serviceRole) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required')
  }
  
  return createClient(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

/**
 * Legacy export for backward compatibility
 * @deprecated Use createSupabaseAdminClient() instead
 */
let _cachedAdminClient: SupabaseClient | null = null

export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    if (!_cachedAdminClient) {
      _cachedAdminClient = createSupabaseAdminClient()
    }
    // @ts-ignore
    return _cachedAdminClient[prop]
  },
})

export type { SupabaseClient }