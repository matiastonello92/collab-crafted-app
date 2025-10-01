import "server-only";
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

/**
 * Platform admin guard for Server Components
 * 
 * Validates platform admin access and redirects if unauthorized.
 * Use in server components/pages that require platform-level admin access.
 * 
 * @returns User ID and user object
 * @throws Redirects to /login if not authenticated
 * @throws Redirects to /platform/access-denied if not platform admin
 * 
 * @example
 * // In Server Component
 * const { userId, user } = await requirePlatformAdmin()
 */
export async function requirePlatformAdmin() {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect('/login');
  
  const { data, error } = await sb.rpc("is_platform_admin");
  if (error || !data) redirect('/platform/access-denied');
  
  return { userId: user.id, user };
}

/**
 * Org admin guard for Server Components
 * 
 * Validates org-level admin access and redirects if unauthorized.
 * Resolves org context automatically from cookies or user memberships.
 * 
 * @param orgId - Optional org ID to check (auto-resolved if not provided)
 * @returns User ID and resolved org ID
 * @throws Redirects to /login if not authenticated
 * @throws Redirects to /admin/no-org if org context cannot be resolved
 * @throws Redirects to /admin/access-denied if not org admin
 * 
 * @example
 * // In Server Component
 * const { userId, orgId } = await requireOrgAdmin()
 */
export async function requireOrgAdmin(orgId?: string | null): Promise<{ userId: string; orgId: string }> {
  const supabase = await createSupabaseServerClient()
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
 * Platform admin check for API Routes
 * 
 * Non-redirecting version for API routes.
 * Returns access status instead of redirecting.
 * 
 * @returns Object with userId and hasAccess boolean
 * 
 * @example
 * // In API Route
 * const { hasAccess, userId } = await checkPlatformAdmin()
 * if (!hasAccess) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
 */
export async function checkPlatformAdmin(): Promise<{ userId: string | null; hasAccess: boolean }> {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return { userId: null, hasAccess: false }

  const { data, error } = await supabase.rpc("is_platform_admin");
  return { userId: user.id, hasAccess: !error && !!data };
}

/**
 * Org admin check for API Routes
 * 
 * Non-redirecting version for API routes.
 * Resolves org context automatically and returns access status.
 * 
 * @param orgId - Optional org ID to check (auto-resolved if not provided)
 * @returns Object with userId, orgId, and hasAccess boolean
 * 
 * @example
 * // In API Route
 * const { hasAccess, orgId } = await checkOrgAdmin()
 * if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
 */
export async function checkOrgAdmin(orgId?: string): Promise<{ userId: string | null; orgId: string | null; hasAccess: boolean }> {
  const supabase = await createSupabaseServerClient()
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
 * Org context resolver (cookies, subdomain, etc.)
 */
async function getOrgIdFromContext(): Promise<string | null> {
  try {
    // Try cookie first
    const cookieStore = await cookies();
    const orgIdCookie = cookieStore.get('org_id')?.value;
    if (orgIdCookie) return orgIdCookie;

    // Try to resolve from user's first membership as fallback
    const supabase = await createSupabaseServerClient()
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