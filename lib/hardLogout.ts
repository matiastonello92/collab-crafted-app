import { createSupabaseUserClient } from '@/lib/supabase/clients';
export async function hardLogout() {
  const supabase = await createSupabaseUserClient();
  try { await supabase.auth.signOut(); } catch {}
  try {
    localStorage.clear(); sessionStorage.clear();
    if ('indexedDB' in window) { try { indexedDB.deleteDatabase('supabase-auth'); } catch {} }
  } catch {}
  window.location.href = '/login';
}
