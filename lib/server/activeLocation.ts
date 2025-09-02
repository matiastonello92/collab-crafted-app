import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';

type Loc = { id: string; name: string };

export async function getUserLocations(): Promise<{ user: { id: string } | null; locations: Loc[] }> {
  try {
    const supabase = createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, locations: [] };

    // Tabella corretta + join alla tabella locations
    const { data, error } = await supabase
      .from('user_roles_locations')
      .select('location:locations(id,name)')
      .eq('user_id', user.id);

    if (error) {
      console.error('[activeLocation] user_roles_locations query error', error);
      return { user, locations: [] };
    }

    const locations = (data ?? [])
      .map((r: any) => r.location)
      .filter(Boolean) as Loc[];

    return { user, locations };
  } catch (err) {
    console.error('[activeLocation] getUserLocations fatal', err);
    return { user: null, locations: [] };
  }
}

export async function getActiveLocationServer() {
  const jar = await cookies();
  const cookieId = jar.get('pn_loc')?.value ?? null;
  const { user, locations } = await getUserLocations();
  if (!user || locations.length === 0) return { active: null, locations };

  const active = locations.find(l => l.id === cookieId) ?? locations[0];
  return { active, locations };
}
