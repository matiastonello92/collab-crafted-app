import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { requireSupabaseEnv } from '@/utils/supabase/config'

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