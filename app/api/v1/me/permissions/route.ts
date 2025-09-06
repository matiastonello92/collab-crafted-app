import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { normalizeSet } from '@/lib/permissions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get('locationId') || undefined;

    const supabase = await createSupabaseServerClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ permissions: [] }, { status: 401 });
    }

    const supabaseAdmin = createSupabaseAdminClient();

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
      return NextResponse.json({ permissions: [] }, { status: 200 });
    }

    const roleIds = (assignments || []).map(a => a.role_id).filter(Boolean);
    const permSet = new Set<string>();

    if (roleIds.length > 0) {
      const { data: rolePerms } = await supabaseAdmin
        .from('role_permissions')
        .select('permissions(name)')
        .in('role_id', roleIds);

      (rolePerms || []).forEach(rp => {
        const name = (rp as any).permissions?.name as string | undefined;
        if (name) permSet.add(name);
      });
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

    // check if user is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('user_is_admin', { uid: user.id });
    if (isAdmin) permSet.add('*');

    const permissions = normalizeSet(Array.from(permSet));
    const body: any = { permissions };
    if (isAdmin) body.is_admin = true;

    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'internal' }, { status: 500 });
  }
}
