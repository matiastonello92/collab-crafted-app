import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function getUserLocations() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, locations: [] as { id: string; name: string }[] };

  // Adatta la query alla tua struttura
  const { data, error } = await supabase
    .from('user_locations')
    .select('location:locations(id,name)')
    .eq('user_id', user.id);

  if (error) throw error;
  const locations = ((data ?? []).map((r: any) => r.location).filter(Boolean)) as {
    id: string; name: string
  }[];
  return { user, locations };
}

export async function getActiveLocationServer() {
  const jar = await cookies();
  const cookieId = jar.get('pn_loc')?.value ?? null;
  const { user, locations } = await getUserLocations();
  if (!user || locations.length === 0) return { active: null, locations };

  const active = locations.find(l => l.id === cookieId) ?? locations[0];
  return { active, locations };
}
