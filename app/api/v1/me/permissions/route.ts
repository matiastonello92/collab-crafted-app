import { NextResponse } from 'next/server';
import { createSupabaseServerActionClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeSet } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 300; // 5min cache

export async function GET(req: Request) {
  try {
    console.log('🔍 [API DEBUG] GET /api/v1/me/permissions called')
    
    const url = new URL(req.url);
    const rawLocationId = url.searchParams.get('locationId');
    const locationId = (rawLocationId === 'null' || !rawLocationId) ? undefined : rawLocationId;

    const supabase = await createSupabaseServerActionClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      console.log('❌ [API DEBUG] Auth failed')
      return NextResponse.json({ permissions: [] }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    console.log('✅ [API DEBUG] User authenticated:', user.id, 'locationId:', locationId);

    // Initialize permission set from JWT claims (app_metadata)
    const permSet = new Set<string>();
    const meta: any = (user as any).app_metadata || {};
    const claimPerms: string[] = Array.isArray(meta.permissions) ? meta.permissions : [];
    for (const p of claimPerms) { if (typeof p === 'string') permSet.add(p); }
    const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0);
    if (Number.isFinite(roleLevel) && roleLevel >= 90) permSet.add('*');

    let assignmentsQuery = supabase
      .from('user_roles_locations')
      .select('role_id, location_id')
      .eq('user_id', user.id)
      .or('is_active.is.null,is_active.eq.true');

    // Se locationId è fornito, filtra per quella location specifica
    // Altrimenti recupera TUTTI i roles dell'utente (non solo location_id NULL)
    if (locationId) {
      assignmentsQuery = assignmentsQuery.eq('location_id', locationId);
    }

    const { data: assignments, error: assignErr } = await assignmentsQuery;
    if (assignErr) {
      console.log('❌ [API DEBUG] Error fetching assignments:', assignErr)
      return NextResponse.json({ permissions: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    console.log('✅ [API DEBUG] Found assignments:', assignments?.length || 0)

    const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean);

    // Robust permission fetching from roles - two-step query to avoid nested select issues
    if (roleIds.length > 0) {
      const { data: rolePermissions } = await supabase
        .from('role_permissions')
        .select('permission_id')
        .in('role_id', roleIds);

      if (rolePermissions && rolePermissions.length > 0) {
        const permissionIds = rolePermissions.map(rp => rp.permission_id).filter(Boolean);
        if (permissionIds.length > 0) {
          const { data: permissions } = await supabase
            .from('permissions')
            .select('name')
            .in('id', permissionIds);

          (permissions || []).forEach(p => {
            if (p.name) permSet.add(p.name);
          });
        }
      }
    }

    let overridesQuery = supabase
      .from('user_permissions')
      .select('granted, location_id, permissions!inner(name)')
      .eq('user_id', user.id);

    // Se locationId è fornito, filtra per quella location specifica
    // Altrimenti recupera TUTTI gli overrides (non solo location_id NULL)
    if (locationId) {
      overridesQuery = overridesQuery.eq('location_id', locationId);
    }

    const { data: overrides } = await overridesQuery;
    (overrides || []).forEach(ov => {
      const name = (ov.permissions as any)?.name as string | undefined;
      if (!name) return;
      if (ov.granted) permSet.add(name);
      else permSet.delete(name);
    });

    // Get user's org_id from profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    const orgId = profile?.org_id;
    console.log('✅ [API DEBUG] User org_id:', orgId)

    // Check platform admin using supabaseAdmin for platform_admins table (no RLS)
    const supabaseAdmin = createSupabaseAdminClient();
    const { data: platformAdminRecord } = await supabaseAdmin
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    let isAdmin = !!platformAdminRecord;

    // If not platform admin, check org admin via membership
    if (!isAdmin && orgId) {
      const { data: membership } = await supabase
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

    console.log('✅ [API DEBUG] Final permissions:', permissions.length, 'isAdmin:', isAdmin)

    return NextResponse.json(body, { 
      status: 200, 
      headers: { 
        'Cache-Control': 'private, max-age=300, stale-while-revalidate=600',
        'CDN-Cache-Control': 'private, max-age=300',
      } 
    });
  } catch (e: any) {
    console.error('❌ [API DEBUG] Unexpected error:', e)
    return NextResponse.json({ error: e?.message ?? 'internal' }, { status: 500 });
  }
}
