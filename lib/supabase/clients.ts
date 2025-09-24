import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/src/integrations/supabase/types'
import { requireSupabaseEnv } from '@/utils/supabase/config'

type UserClient = SupabaseClient<Database>

let cachedBrowserClient: UserClient | null = null

export async function createSupabaseUserClient(): Promise<UserClient> {
  const { url, anon } = requireSupabaseEnv()

  if (typeof window === 'undefined') {
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()

    return createServerClient<Database>(url, anon, {
      cookies: {
        get(name) {
          return cookieStore.get(name)?.value
        },
        set(name, value, options) {
          cookieStore.set(name, value, options)
        },
        remove(name, options) {
          cookieStore.set(name, '', { ...(options || {}), maxAge: 0 })
        }
      }
    })
  }

  if (!cachedBrowserClient) {
    cachedBrowserClient = createBrowserClient<Database>(url, anon)
  }

  return cachedBrowserClient
}

function initAdminClient(): SupabaseClient<Database> {
  const { url } = requireSupabaseEnv()
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!serviceRole) {
    throw new Error('Supabase env missing: set SUPABASE_SERVICE_ROLE_KEY')
  }

  return createClient<Database>(url, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

let cachedAdminClient: SupabaseClient<Database> | null = null

export function createSupabaseAdminClient(): SupabaseClient<Database> {
  if (!cachedAdminClient) {
    cachedAdminClient = initAdminClient()
  }

  return cachedAdminClient
}

