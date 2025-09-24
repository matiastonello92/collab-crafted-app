import { NextResponse } from 'next/server';
import { createSupabaseUserClient } from '@/lib/supabase/clients';
import { getEffectivePermissions } from '@/lib/server/permission-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const locationId = url.searchParams.get('locationId') || null;

    const supabase = await createSupabaseUserClient();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return NextResponse.json({ permissions: [] }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();

    const orgId = profile?.org_id ?? null;
    if (!orgId) {
      return NextResponse.json({ permissions: [] }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
    }

    const bundle = await getEffectivePermissions(user.id, orgId, locationId);
    const permissions = bundle.permissions;
    const isAdmin = permissions.includes('*');

    return NextResponse.json(
      { permissions, role_level: bundle.role_level, is_admin: isAdmin },
      { status: 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'internal' }, { status: 500 });
  }
}
