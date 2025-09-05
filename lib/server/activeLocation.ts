import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

type Loc = { id: string; name: string };
type Meta = { error?: string };

export async function getUserLocations(): Promise<{ user: { id: string } | null; locations: Loc[]; meta: Meta }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, locations: [], meta: {} };

    const admin = createSupabaseAdminClient();
    const { data: mems, error: e1 } = await admin
      .from('user_roles_locations')
      .select('location_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (e1) {
      console.error('[activeLocation] memberships error', e1);
      return { user, locations: [], meta: { error: 'memberships' } };
    }

    const ids = (mems ?? []).map((m: any) => m.location_id).filter(Boolean);
    if (ids.length === 0) return { user, locations: [], meta: {} };

    const { data: locs, error: e2 } = await admin
      .from('locations')
      .select('id,name')
      .in('id', ids);

    if (e2) {
      console.error('[activeLocation] locations error', e2);
      return { user, locations: [], meta: { error: 'locations' } };
    }

    return { user, locations: (locs ?? []) as Loc[], meta: {} };
  } catch (err) {
    console.error('[activeLocation] getUserLocations fatal', err);
    return { user: null, locations: [], meta: { error: 'fatal' } };
  }
}

export async function getActiveLocationServer(): Promise<{ active: Loc | null; locations: Loc[]; persisted: boolean; meta: Meta }> {
  try {
    const jar = await cookies();
    const cookieId = jar.get('pn_loc')?.value ?? null;

    const { user, locations, meta } = await getUserLocations();
    if (!user || locations.length === 0) return { active: null, locations, persisted: false, meta };

    const byCookie = locations.find(l => l.id === cookieId) ?? null;
    const active = byCookie ?? locations[0];
    const persisted = !!byCookie;

    return { active, locations, persisted, meta };
  } catch (err) {
    console.error('[activeLocation] getActiveLocationServer fatal', err);
    return { active: null, locations: [], persisted: false, meta: { error: 'fatal' } };
  }
}
