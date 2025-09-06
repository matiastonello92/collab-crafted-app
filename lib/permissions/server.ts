import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeSet, normalizePermission } from '@/lib/permissions';

export const runtime = 'nodejs';

interface EffectivePermsOpts {
  userId?: string;
  locationId?: string | null;
}

export async function getEffectivePermissionsSSR({ userId, locationId = null }: EffectivePermsOpts) {
  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const supabase = await createSupabaseServerClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return { userId: null, permissions: [] as string[] };
    resolvedUserId = user.id;
  }

  const supabaseAdmin = createSupabaseAdminClient();

  let assignmentsQuery = supabaseAdmin
    .from('user_roles_locations')
    .select('role_id, location_id')
    .eq('user_id', resolvedUserId)
    .eq('is_active', true);

  if (locationId) {
    assignmentsQuery = assignmentsQuery.in('location_id', [locationId, null]);
  } else {
    assignmentsQuery = assignmentsQuery.is('location_id', null);
  }

  const { data: assignments, error: assignErr } = await assignmentsQuery;
  if (assignErr) return { userId: resolvedUserId, permissions: [] as string[] };

  const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean);
  const permSet = new Set<string>();

  if (roleIds.length > 0) {
    const { data: rolePermissions } = await supabaseAdmin
      .from('role_permissions')
      .select('permission_id')
      .in('role_id', roleIds);

    if (rolePermissions && rolePermissions.length > 0) {
      const permissionIds = rolePermissions.map(rp => rp.permission_id).filter(Boolean);
      if (permissionIds.length > 0) {
        const { data: permissions } = await supabaseAdmin
          .from('permissions')
          .select('name')
          .in('id', permissionIds);

        (permissions || []).forEach(p => {
          if (p.name) permSet.add(p.name);
        });
      }
    }
  }

  let overridesQuery = supabaseAdmin
    .from('user_permissions')
    .select('granted, location_id, permissions!inner(name)')
    .eq('user_id', resolvedUserId);

  if (locationId) {
    overridesQuery = overridesQuery.in('location_id', [locationId, null]);
  } else {
    overridesQuery = overridesQuery.is('location_id', null);
  }

  const { data: overrides } = await overridesQuery;
  (overrides || []).forEach(ov => {
    const name = (ov.permissions as any)?.name as string | undefined;
    if (!name) return;
    if (ov.granted) permSet.add(name);
    else permSet.delete(name);
  });

  const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { p_user: resolvedUserId });
  if (isAdmin) permSet.add('*');

  const permissions = normalizeSet(Array.from(permSet));
  return { userId: resolvedUserId, permissions };
}

export async function canAnyServer(userId: string, keys: string[], locationId?: string | null) {
  const { permissions } = await getEffectivePermissionsSSR({ userId, locationId });
  const set = new Set(normalizeSet(permissions));
  if (set.has('*' as any)) return true;
  for (const k of keys) {
    if (set.has(normalizePermission(k) as any)) return true;
  }
  return false;
}
