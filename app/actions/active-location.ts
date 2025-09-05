'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function setActiveLocationAction(locationId?: string | null) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');

  const jar = await cookies();
  if (!locationId) {
    await supabase.rpc('app.set_context_checked', { p_org: null, p_location: null });
    jar.delete('pn_loc');
    jar.delete('pn_org');
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    return;
  }

  const { error: rpcError } = await supabase.rpc('app.set_context_checked', {
    p_org: null,
    p_location: locationId,
  });
  if (rpcError) throw rpcError;

  const { data: locData, error: locError } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();
  if (locError) throw locError;
  const orgId = locData?.org_id;

  jar.set('pn_loc', locationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });
  if (orgId) {
    jar.set('pn_org', orgId, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 90,
    });
  }

  revalidatePath('/', 'layout');
  revalidatePath('/dashboard');
}
