import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeSet } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5min cache

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get('locationId') || undefined;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ permissions: [] }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const supabaseAdmin = createSupabaseAdminClient();

    // Initialize permission set from JWT claims (app_metadata)
    const permSet = new Set<string>();
    const meta: any = (user as any).app_metadata || {};
    const claimPerms: string[] = Array.isArray(meta.permissions) ? meta.permissions : [];
    for (const p of claimPerms) { if (typeof p === 'string') permSet.add(p); }
    const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0);
    if (Number.isFinite(roleLevel) && roleLevel >= 90) permSet.add('*');

    let assignmentsQuery = supabaseAdmin
      .from('user_roles_locations')
      .select('role_id, location_id')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (locationId) {
      assignmentsQuery = assignmentsQuery.in('location_id', [locationId, null]);
    } else {
      assignmentsQuery = assignmentsQuery.is('location_id', null);
    }

    const { data: assignments, error: assignErr } = await assignmentsQuery;
    if (assignErr) {
      return NextResponse.json({ permissions: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean);

    // Robust permission fetching from roles - two-step query to avoid nested select issues
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
      .eq('user_id', user.id);

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

    // Get user's org_id from profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    const orgId = profile?.org_id;

    // Check platform admin - direct query instead of RPC to avoid auth.uid() issue
    const { data: platformAdminRecord } = await supabaseAdmin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    let isAdmin = !!platformAdminRecord;

    // If not platform admin, check org admin via membership
    if (!isAdmin && orgId) {
      const { data: membership } = await supabaseAdmin
        .from('memberships')
        .select('role')
        .eq('user_id', user.id)
        .eq('org_id', orgId)
        .maybeSingle();
      
      isAdmin = membership?.role === 'admin';
    }

    if (isAdmin) permSet.add('*');

    const permissions = normalizeSet(Array.from(permSet));
    const body: any = { permissions };
    if (isAdmin) body.is_admin = true;

    return NextResponse.json(body, { 
      status: 200, 
      headers: { 
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'private, max-age=300',
      } 
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'internal' }, { status: 500 });
  }
}
