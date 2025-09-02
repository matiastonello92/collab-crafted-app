import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function getActiveLocation() {
  const store = cookies();
  const id = store.get('x-active-location')?.value;
  if (!id) return null;

  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users_locations')
    .select('locations ( id, name, org_id )')
    .eq('user_id', user.id)
    .eq('location_id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data.locations;
}

export async function setActiveLocationAction(id: string) {
  'use server';
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const { data } = await supabase
    .from('users_locations')
    .select('location_id')
    .eq('user_id', user.id)
    .eq('location_id', id)
    .maybeSingle();

  if (!data) throw new Error('Forbidden');

  const store = cookies();
  store.set('x-active-location', id, {
    httpOnly: true,
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });

  revalidatePath('/');
}
