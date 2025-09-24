import { createSupabaseBrowserClient } from '@/utils/supabase/client'

export async function hardLogout() {
  const supabase = createSupabaseBrowserClient()
  try {
    await supabase.auth.signOut()
  } catch {}
  try {
    localStorage.clear()
    sessionStorage.clear()
    if ('indexedDB' in window) {
      try {
        indexedDB.deleteDatabase('supabase-auth')
      } catch {}
    }
  } catch {}
}
