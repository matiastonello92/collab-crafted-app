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
    const current = jar.get('pn_loc')?.value ?? null;
    let orgId: string | null = null;
    if (current) {
      const { data: loc } = await supabase
        .from('locations')
        .select('org_id')
        .eq('id', current)
        .single();
      orgId = loc?.org_id ?? null;
    }
    await supabase.rpc('app.set_context_checked', { p_org: orgId, p_location: null });
    jar.delete('pn_loc');
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard');
    return;
  }

  const { data: loc, error: locError } = await supabase
    .from('locations')
    .select('org_id')
    .eq('id', locationId)
    .single();
  if (locError || !loc) throw locError ?? new Error('Forbidden');

  const { error: rpcError } = await supabase.rpc('app.set_context_checked', {
    p_org: loc.org_id,
    p_location: locationId,
  });
  if (rpcError) throw rpcError;

  jar.set('pn_loc', locationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  });

  revalidatePath('/', 'layout');
  revalidatePath('/dashboard');
}
