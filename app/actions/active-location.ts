'use server';
export const runtime = 'nodejs';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';

// Adatta nomi tabella/colonne se servono
async function userHasLocation(userId: string, locationId: string) {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('user_locations')
    .select('location_id')
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .limit(1);
  if (error) throw error;
  return !!(data && data.length);
}

export async function setActiveLocationAction(locationId?: string | null) {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const jar = await cookies();

  if (!locationId) {
    jar.delete('pn_loc'); // <-- fix: usare (await cookies()).delete
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    return;
  }

  const ok = await userHasLocation(user.id, locationId);
  if (!ok) throw new Error('Forbidden');

  jar.set('pn_loc', locationId, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 90
  });

  revalidatePath('/', 'layout');
  revalidatePath('/dashboard');
}
