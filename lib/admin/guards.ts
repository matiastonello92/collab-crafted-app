import "server-only";
import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'

/**
 * Platform admin guard - checks if user has platform admin permissions
 */
export async function requirePlatformAdmin() {
  const sb = await createSupabaseServerClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { ok: false, reason: "NO_USER" };
  const { data, error } = await sb.rpc("is_platform_admin");
  if (error || !data) return { ok: false, reason: "NOT_PLATFORM_ADMIN" };
  return { ok: true, user };
}

/**
 * Server-side admin guard - checks if user has admin permissions
 * Redirects to home page if not authorized
 */
export async function requireAdmin(): Promise<string> {
  const supabase = await createSupabaseServerClient()
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
 * Check admin access without redirect (for API routes)
 */
export async function checkAdminAccess(): Promise<{ userId: string | null; hasAccess: boolean }> {
  const supabase = await createSupabaseServerClient()
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