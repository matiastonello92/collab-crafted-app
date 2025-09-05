import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';

type Loc = { id: string; name: string };
export type AuthSnapshot = {
  locations: Loc[];
  activeLocationId: string | null;
  permissions: string[];
};

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const supabase = await createSupabaseServerClient();

  // Leggiamo i cookie scelti dall’utente (org opzionale, loc obbligatoria solo se selezionata)
  const jar = await cookies();
  const orgId = jar.get('pn_org')?.value ?? null;
  const locId = jar.get('pn_loc')?.value ?? null;

  const { data, error } = await supabase.rpc('app_get_auth_snapshot', {
    p_org_id: orgId,
    p_loc_id: locId,
  });

  if (error) {
    console.error('[getAuthSnapshot] rpc error', error);
    return { locations: [], activeLocationId: null, permissions: [] };
  }

  return {
    locations: data?.locations ?? [],
    activeLocationId: data?.activeLocationId ?? null,
    permissions: data?.permissions ?? [],
  };
}

