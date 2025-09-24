import { createSupabaseBrowserClient } from '@/utils/supabase/client';

export async function hardLogout() {
  const supabase = createSupabaseBrowserClient();
  try { await supabase.auth.signOut(); } catch {}
  try {
    localStorage.clear(); sessionStorage.clear();
    if ('indexedDB' in window) { try { indexedDB.deleteDatabase('supabase-auth'); } catch {} }
  } catch {}
  // Using window.location for hard logout is intentional - we want a full page refresh
  // to clear any remaining state after clearing storage
  window.location.href = '/login';
}
