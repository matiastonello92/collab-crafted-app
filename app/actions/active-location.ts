'use server';

import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getAppBootstrap } from '@/lib/server/app-bootstrap';
import type { AppBootstrap } from '@/types/app-bootstrap';

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 90,
};

export async function setActiveLocation(locationId?: string | null): Promise<AppBootstrap> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (!user) throw new Error('Unauthorized');

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const orgId = membership?.org_id;
  if (!orgId) {
    throw new Error('Organization context not available');
  }

  const jar = await cookies();

  if (!locationId) {
    jar.delete('pn_loc');
    return await getAppBootstrap();
  }

  const { data: assignments = [] } = await supabaseAdmin
    .from('user_roles_locations')
    .select('location_id, is_active')
    .eq('user_id', user.id)
    .eq('org_id', orgId);

  const allowed = assignments.some(
    assignment => assignment?.is_active !== false && assignment?.location_id === locationId,
  );

  if (!allowed) {
    throw new Error('Forbidden');
  }

  const { data: locationRow, error: locationError } = await supabaseAdmin
    .from('locations')
    .select('id')
    .eq('id', locationId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (locationError) throw locationError;
  if (!locationRow) throw new Error('Location not found');

  jar.set('pn_loc', locationId, COOKIE_OPTIONS);

  return await getAppBootstrap();
}
