import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';

type Loc = { id: string; name: string };

export async function getUserLocations(): Promise<{ user: { id: string } | null; locations: Loc[] }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, locations: [] };

    // 1) membership -> solo IDs (robusto vs RLS/relazioni)
    const { data: mems, error: e1 } = await supabase
      .from('user_roles_locations')
      .select('location_id')
      .eq('user_id', user.id);

    if (e1) {
      console.error('[activeLocation] memberships error', e1);
      return { user, locations: [] };
    }

    const ids = (mems ?? []).map((m: any) => m.location_id).filter(Boolean);
    if (ids.length === 0) return { user, locations: [] };

    // 2) fetch locations per ID
    const { data: locs, error: e2 } = await supabase
      .from('locations')
      .select('id,name')
      .in('id', ids);

    if (e2) {
      console.error('[activeLocation] locations error', e2);
      return { user, locations: [] };
    }

    return { user, locations: (locs ?? []) as Loc[] };
  } catch (err) {
    console.error('[activeLocation] getUserLocations fatal', err);
    return { user: null, locations: [] };
  }
}

/** Ritorna la location attiva (cookie valido -> by cookie, altrimenti first) + flag se il cookie è già persistito */
export async function getActiveLocationServer(): Promise<{ active: Loc | null; locations: Loc[]; persisted: boolean }> {
  try {
    const jar = await cookies();
    const cookieId = jar.get('pn_loc')?.value ?? null;

    const { user, locations } = await getUserLocations();
    if (!user || locations.length === 0) return { active: null, locations, persisted: false };

    const byCookie = locations.find(l => l.id === cookieId) ?? null;
    const active = byCookie ?? locations[0];
    const persisted = !!byCookie;

    return { active, locations, persisted };
  } catch (err) {
    console.error('[activeLocation] getActiveLocationServer fatal', err);
    return { active: null, locations: [], persisted: false };
  }
}
