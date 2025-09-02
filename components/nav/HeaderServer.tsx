import HeaderClient from './HeaderClient';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getActiveLocation } from '@/lib/activeLocation';
import { cookies } from 'next/headers';

export default async function HeaderServer() {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return null;
  }

  const { data } = await supabase
    .from('users_locations')
    .select('locations ( id, name, org_id )')
    .eq('user_id', user.id);

  const locations = data?.map((l) => l.locations) || [];

  let active = await getActiveLocation();
  if (!active && locations.length > 0) {
    active = locations[0];
    cookies().set('x-active-location', active.id, {
      httpOnly: true,
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  return (
    <HeaderClient locations={locations} activeLocationId={active ? active.id : null} />
  );
}
