import { createSupabaseServerClient } from '@/utils/supabase/server';

export async function getUserMemberships(): Promise<Array<{ location_id: string; role_id: string | null }>> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data, error } = await supabase
    .from('user_roles_locations')
    .select('location_id, role_id')
    .eq('user_id', user.id)
    .neq('role_id', null); // filtra membership senza ruolo
  if (error) {
    console.error('[effectivePermissions] memberships error', error);
    return [];
  }
  return (data ?? []) as any[];
}

export async function getPermissionIdsByRoleIds(roleIds: string[]): Promise<string[]> {
  if (!roleIds.length) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('role_permissions')
    .select('permission_id')
    .in('role_id', roleIds);
  if (error) {
    console.error('[effectivePermissions] role_permissions error', error);
    return [];
  }
  return Array.from(new Set((data ?? []).map((r: any) => r.permission_id).filter(Boolean)));
}

export async function getPermissionNamesByIds(ids: string[]): Promise<string[]> {
  if (!ids.length) return [];
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('permissions')
    .select('id, name')
    .in('id', ids);
  if (error) {
    console.error('[effectivePermissions] permissions error', error);
    return [];
  }
  return (data ?? []).map((p: any) => p.name).filter(Boolean);
}

/**
 * Permessi effettivi:
 * - se activeLocationId è presente tra le membership ⇒ usa SOLO i ruoli di quella location
 * - altrimenti ⇒ UNION dei permessi su tutte le location assegnate
 */
export async function getEffectivePermissions(activeLocationId: string | null): Promise<Set<string>> {
  const memberships = await getUserMemberships();
  if (!memberships.length) return new Set();

  const hasActive = !!activeLocationId && memberships.some(m => m.location_id === activeLocationId);
  const roleIds = Array.from(new Set(
    memberships
      .filter(m => (hasActive ? m.location_id === activeLocationId : true))
      .map(m => m.role_id)
      .filter(Boolean) as string[]
  ));
  if (!roleIds.length) return new Set();

  const permIds = await getPermissionIdsByRoleIds(roleIds);
  const names = await getPermissionNamesByIds(permIds);
  return new Set(names);
}
