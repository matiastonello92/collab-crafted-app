'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';

async function userHasLocation(userId: string, locationId: string) {
  const admin = createSupabaseAdminClient();
  // Tabella corretta: public.user_roles_locations
  // Check di esistenza senza scaricare righe
  const { count, error } = await admin
    .from('user_roles_locations')
    .select('location_id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('location_id', locationId)
    .eq('is_active', true);

  if (error) throw error;
  return !!(count && count > 0);
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
