/**
 * Client-Side Supabase Exports
 * 
 * Use this in Client Components only.
 * For Server Components and API routes, use '@/lib/supabase/server'
 * 
 * @example
 * 'use client'
 * import { createSupabaseBrowserClient } from '@/lib/supabase/client'
 */

'use client'

export { createSupabaseBrowserClient } from '@/utils/supabase/client'
export type { SupabaseClient } from '@supabase/supabase-js'