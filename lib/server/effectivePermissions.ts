import { createSupabaseServerClient } from '@/utils/supabase/server';

/** Ritorna l’id location “effettiva”: se active è null, prende la prima assegnata. */
export async function getEffectiveLocationId(activeLocationId: string | null) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // leggi le membership
  const { data, error } = await supabase
    .from('user_roles_locations')
    .select('location_id')
    .eq('user_id', user.id);

  if (error || !data?.length) return null;

  const ids = data.map(d => d.location_id).filter(Boolean);
  if (!ids.length) return null;

  return activeLocationId && ids.includes(activeLocationId)
    ? activeLocationId
    : ids[0];
}

/** Union permessi su una o tutte le location assegnate (fallback) */
export async function getEffectivePermissions(activeLocationId: string | null): Promise<Set<string>> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Set();

  // membership con ruolo
  const { data: mems, error } = await supabase
    .from('user_roles_locations')
    .select('location_id, role_id')
    .eq('user_id', user.id);

  if (error || !mems?.length) return new Set();

  // scegli location/e: priorità all’attiva; se assente, usa tutte per union
  const hasActive = activeLocationId && mems.some(m => m.location_id === activeLocationId);
  const targetLocIds = hasActive
    ? [activeLocationId!]
    : Array.from(new Set(mems.map(m => m.location_id).filter(Boolean)));

  // prendi i role_id coinvolti
  const roleIds = Array.from(new Set(
    mems.filter(m => targetLocIds.includes(m.location_id) && m.role_id)
        .map(m => m.role_id)
  ));
  if (!roleIds.length) return new Set();

  // mappa ruoli → permessi (assumi tabella role_permissions join permissions {name})
  const { data: perms, error: e2 } = await supabase
    .from('role_permissions')
    .select('permissions:name, role_id')
    .in('role_id', roleIds);

  if (e2 || !perms) return new Set();

  return new Set(perms.map((p: any) => p.permissions).filter(Boolean));
}

