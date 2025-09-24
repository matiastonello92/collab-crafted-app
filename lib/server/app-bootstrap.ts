import 'server-only';

import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { getActiveLocationServer } from '@/lib/server/activeLocation';
import { getEffectivePermissions } from '@/lib/server/permission-service';
import type {
  AppBootstrap,
  LocationSummary,
  OrgSummary,
  PermissionEnvelope,
  UserSummary,
} from '@/types/app-bootstrap';

const EMPTY_ENVELOPE: PermissionEnvelope = {
  permissions: [],
  role_level: 0,
  org_roles: [],
  location_roles: [],
};

export async function getAppBootstrap(): Promise<AppBootstrap> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const user = data.user;
  if (!user) {
    redirect('/login');
  }

  const supabaseAdmin = createSupabaseAdminClient();

  const { data: membership } = await supabaseAdmin
    .from('memberships')
    .select('org_id')
    .eq('user_id', user.id)
    .limit(1)
    .maybeSingle();

  const orgId = membership?.org_id ?? null;

  let orgSummary: OrgSummary | null = null;
  if (orgId) {
    const { data: orgRow } = await supabaseAdmin
      .from('organizations')
      .select('org_id, name, slug, timezone')
      .eq('org_id', orgId)
      .maybeSingle();

    if (orgRow) {
      orgSummary = {
        id: orgRow.org_id,
        name: orgRow.name ?? null,
        slug: orgRow.slug ?? null,
        timezone: orgRow.timezone ?? null,
      };
    } else {
      orgSummary = { id: orgId, name: null, slug: null, timezone: null };
    }
  }

  const { active } = await getActiveLocationServer();

  let locationSummary: LocationSummary | null = null;
  let effectiveLocationId: string | undefined;
  if (active?.id) {
    effectiveLocationId = active.id;
    const { data: locationRow } = await supabaseAdmin
      .from('locations')
      .select('id, name, city')
      .eq('id', active.id)
      .maybeSingle();

    const name = locationRow?.name ?? active.name ?? '';
    locationSummary = {
      id: active.id,
      name: name || 'Sede',
      city: (locationRow?.city ?? '').toString(),
    };
  }

  let permissionEnvelope: PermissionEnvelope = EMPTY_ENVELOPE;
  if (orgId) {
    permissionEnvelope = await getEffectivePermissions(user.id, orgId, effectiveLocationId);
  }

  const metadata = (user.user_metadata ?? {}) as Record<string, unknown>;
  const userSummary: UserSummary = {
    id: user.id,
    email: user.email ?? undefined,
    metadata,
  };

  return {
    context: {
      user: userSummary,
      org: orgSummary,
      location: locationSummary,
    },
    permissions: permissionEnvelope.permissions,
    role_level: permissionEnvelope.role_level,
    org_roles: permissionEnvelope.org_roles,
    location_roles: permissionEnvelope.location_roles,
    features: [],
    plan_tags: [],
    role_tags: [],
  };
}
