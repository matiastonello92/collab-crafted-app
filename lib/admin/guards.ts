import "server-only";
import { redirect } from 'next/navigation'
import { createSupabaseUserClient } from '@/lib/supabase/clients'
import { cookies } from 'next/headers'

/**
 * Platform admin guard - Global scope, no org required
 */
export async function requirePlatformAdmin() {
  const sb = await createSupabaseUserClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  
  const { data, error } = await sb.rpc("is_platform_admin");
  if (error || !data) redirect('/platform/access-denied');
  
  return { userId: user.id, user };
}

/**
 * Org admin guard - Requires org context and admin role in that org
 */
export async function requireOrgAdmin(orgId?: string | null): Promise<{ userId: string; orgId: string }> {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Resolve org_id if not provided
  let resolvedOrgId = orgId;
  if (!resolvedOrgId) {
    resolvedOrgId = await getOrgIdFromContext();
  }
  
  if (!resolvedOrgId) {
    redirect('/admin/no-org');
  }

  // Check if user is admin of this org
  const { data: isOrgAdmin, error } = await supabase.rpc('user_is_org_admin', { p_org: resolvedOrgId });
  
  if (error || !isOrgAdmin) {
    redirect('/admin/access-denied');
  }

  return { userId: user.id, orgId: resolvedOrgId };
}

/**
 * Legacy admin guard - DEPRECATED, use requireOrgAdmin instead
 * Redirects to home page if not authorized
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const meta: any = (user as any).app_metadata || {}
  const perms: string[] = Array.isArray(meta.permissions) ? meta.permissions : []
  const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0)
  const hasAdminAccess = perms.includes('*') || (Number.isFinite(roleLevel) && roleLevel >= 90)

  if (!hasAdminAccess) {
    redirect('/?error=unauthorized')
  }

  return user.id
}

/**
 * Platform admin check (API routes)
 */
export async function checkPlatformAdmin(): Promise<{ userId: string | null; hasAccess: boolean }> {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { userId: null, hasAccess: false }

  const { data, error } = await supabase.rpc("is_platform_admin");
  return { userId: user.id, hasAccess: !error && !!data };
}

/**
 * Org admin check (API routes)
 */
export async function checkOrgAdmin(orgId?: string): Promise<{ userId: string | null; orgId: string | null; hasAccess: boolean }> {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { userId: null, orgId: null, hasAccess: false }

  let resolvedOrgId = orgId || await getOrgIdFromContext();
  if (!resolvedOrgId) return { userId: user.id, orgId: null, hasAccess: false };

  const { data: isOrgAdmin, error } = await supabase.rpc('user_is_org_admin', { p_org: resolvedOrgId });
  
  return { 
    userId: user.id, 
    orgId: resolvedOrgId, 
    hasAccess: !error && !!isOrgAdmin 
  };
}

/**
 * Legacy admin check - DEPRECATED, use checkOrgAdmin instead
 */
export async function checkAdminAccess(): Promise<{ userId: string | null; hasAccess: boolean }> {
  const supabase = await createSupabaseUserClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { userId: null, hasAccess: false }
  }

  const meta: any = (user as any).app_metadata || {}
  const perms: string[] = Array.isArray(meta.permissions) ? meta.permissions : []
  const roleLevel = Number(meta.role_level ?? meta.roleLevel ?? 0)
  const hasAccess = perms.includes('*') || (Number.isFinite(roleLevel) && roleLevel >= 90)

  return { userId: user.id, hasAccess }
}

/**
 * Org context resolver (cookies, subdomain, etc.)
 */
async function getOrgIdFromContext(): Promise<string | null> {
  try {
    // Try cookie first
    const cookieStore = await cookies();
    const orgIdCookie = cookieStore.get('org_id')?.value;
    if (orgIdCookie) return orgIdCookie;

    // Try to resolve from user's first membership as fallback
    const supabase = await createSupabaseUserClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null;

    const { data: membership } = await supabase
      .from('memberships')
      .select('org_id')
      .eq('user_id', user.id)
      .limit(1)
      .single()

    return membership?.org_id || null;
  } catch (error) {
    console.error('Error resolving org context:', error);
    return null;
  }
}