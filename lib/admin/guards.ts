export const runtime = 'nodejs';

import { redirect } from 'next/navigation';
import { getEffectivePermissionsSSR } from '@/lib/permissions/server';
import { normalizeSet, normalizePermission } from '@/lib/permissions';

/**
 * Server-side admin guard - checks if user has admin permissions
 * Redirects to home page if not authorized
 */
export async function requireAdmin(ctx?: { userId?: string; locationId?: string | null }): Promise<string> {
  try {
    const { userId: uid, permissions } = await getEffectivePermissionsSSR(ctx ?? {});
    if (!uid) {
      redirect('/login');
    }
    const set = new Set(normalizeSet(permissions));

    if (set.has('*' as any)) return uid;
    if (set.has(normalizePermission('users:manage') as any)) return uid;
    if (set.has(normalizePermission('manage_users') as any)) return uid;

    redirect('/?error=unauthorized');
  } catch (error) {
    console.error('Error in admin guard:', error);
    redirect('/?error=server_error');
  }
}

/**
 * Check admin access without redirect (for API routes)
 */
export async function checkAdminAccess(): Promise<{ userId: string | null; hasAccess: boolean }> {
  try {
    const { userId, permissions } = await getEffectivePermissionsSSR({});
    const set = new Set(normalizeSet(permissions));
    const hasAccess =
      set.has('*' as any) ||
      set.has(normalizePermission('users:manage') as any) ||
      set.has(normalizePermission('manage_users') as any);
    return { userId, hasAccess };
  } catch (error) {
    console.error('Error checking admin access:', error);
    return { userId: null, hasAccess: false };
  }
}
