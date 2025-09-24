import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/src/integrations/supabase/types'

import { createSupabaseAdminClient } from './clients'

export { createSupabaseAdminClient, createSupabaseUserClient } from './clients'

let cachedAdmin: SupabaseClient<Database> | null = null

export const supabaseAdmin = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    if (!cachedAdmin) {
      cachedAdmin = createSupabaseAdminClient()
    }

    // @ts-ignore accessing dynamic property on client proxy
    return cachedAdmin[prop]
  }
})

