import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '@/utils/supabase/server';
import { getAuthSnapshot } from '@/lib/server/authContext';

const ADMIN_PERMS = ['manage_users', 'manage_settings', 'assign_roles'];

function hasAdminPerms(perms: string[]) {
  return ADMIN_PERMS.some(p => perms.includes(p));
}

export async function requireAdmin(): Promise<string | void> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { permissions } = await getAuthSnapshot();

  if (!user || !hasAdminPerms(permissions)) {
    redirect('/?error=unauthorized');
  }

  return user.id;
}

export async function checkAdminAccess(): Promise<{ userId: string | null; hasAccess: boolean }> {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { userId: null, hasAccess: false };

  const { permissions } = await getAuthSnapshot();
  return { userId: user.id, hasAccess: hasAdminPerms(permissions) };
}

export async function isAdmin(): Promise<boolean> {
  const { permissions } = await getAuthSnapshot();
  return hasAdminPerms(permissions);
}

