/**
 * Centralized Supabase Client Exports
 * 
 * This is the single source of truth for Supabase client creation.
 * 
 * Usage Guidelines:
 * 
 * 1. **Browser/Client Components:**
 *    import { createSupabaseBrowserClient } from '@/lib/supabase'
 *    const supabase = createSupabaseBrowserClient()
 * 
 * 2. **Server Components/API Routes:**
 *    import { createSupabaseServerClient } from '@/lib/supabase'
 *    const supabase = await createSupabaseServerClient()
 * 
 * 3. **Admin Operations (bypass RLS):**
 *    import { createSupabaseAdminClient } from '@/lib/supabase'
 *    const supabase = createSupabaseAdminClient()
 * 
 * @module lib/supabase
 */

// Re-export browser client
export { createSupabaseBrowserClient } from '@/lib/supabase'

// Re-export server client
export { createSupabaseServerClient } from '@/utils/supabase/server'

// Re-export admin client (optimized version)
export { createSupabaseAdminClient } from './server'

// Type exports
export type { SupabaseClient } from '@supabase/supabase-js'