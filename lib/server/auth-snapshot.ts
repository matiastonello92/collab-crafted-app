import { cookies } from 'next/headers';
import { createSupabaseServerClient } from '@/utils/supabase/server';

export type AuthSnapshot = {
  locations: { id: string; name: string }[];
  activeLocationId: string | null;
  permissions: string[];
};

export async function getAuthSnapshot(): Promise<AuthSnapshot> {
  const supabase = await createSupabaseServerClient();
  const jar = await cookies();
  const orgId = jar.get('pn_org')?.value ?? null;
  const locId = jar.get('pn_loc')?.value ?? null;
  try {
    const { data, error } = await supabase.rpc('app_get_auth_snapshot', {
      p_org_id: orgId,
      p_loc_id: locId,
    });
    if (error) {
      console.error('[authSnapshot] rpc error', error);
      return { locations: [], activeLocationId: null, permissions: [] };
    }
    return {
      locations: Array.isArray((data as any)?.locations) ? (data as any).locations : [],
      activeLocationId: (data as any)?.activeLocationId ?? null,
      permissions: Array.isArray((data as any)?.permissions) ? (data as any).permissions : [],
    };
  } catch (err) {
    console.error('[authSnapshot] fatal', err);
    return { locations: [], activeLocationId: null, permissions: [] };
  }
}
