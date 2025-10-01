/**
 * ⚠️ DEPRECATED: Use specific imports instead
 * 
 * This file is kept for backward compatibility but should not be used.
 * 
 * Instead, use:
 * - '@/lib/supabase/client' for Client Components
 * - '@/lib/supabase/server' for Server Components/API Routes
 * 
 * This prevents webpack from trying to bundle server-side code in client bundles.
 * 
 * @deprecated Use '@/lib/supabase/client' or '@/lib/supabase/server' instead
 */

// Note: Do not re-export server functions here as it causes build errors
// when client components import from this file

export type { SupabaseClient } from '@supabase/supabase-js'