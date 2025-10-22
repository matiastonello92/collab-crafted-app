import { SupabaseClient } from '@supabase/supabase-js';

/**
 * @deprecated Use `supabase.rpc('user_has_permission', { p_user_id, p_permission })` directly instead
 * This file calls a non-existent RPC function and will be removed in future versions.
 * 
 * For server-side: Use `supabase.rpc('user_has_permission', ...)`
 * For client-side: Use `usePermissions()` hook with SWR caching
 * 
 * Check if user has a specific permission
 * Uses RPC to fetch permissions from database
 */
export async function checkUserPermission(
  supabase: SupabaseClient,
  userId: string,
  permission: string
): Promise<boolean> {
  try {
    const { data, error } = await supabase.rpc('get_user_permissions', {
      p_user_id: userId
    });

    if (error) {
      console.error('Permission check error:', error);
      return false;
    }

    if (!data || !Array.isArray(data)) {
      return false;
    }

    // Check for admin wildcard
    if (data.includes('*')) {
      return true;
    }

    // Direct permission match
    if (data.includes(permission)) {
      return true;
    }

    // Module wildcard check (e.g., 'posts:*' covers 'posts:view')
    const [module] = permission.split(':');
    if (module && data.includes(`${module}:*`)) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('Permission check exception:', err);
    return false;
  }
}

/**
 * Check if user has ANY of the required permissions
 */
export async function checkAnyPermission(
  supabase: SupabaseClient,
  userId: string,
  permissions: string[]
): Promise<boolean> {
  for (const perm of permissions) {
    const hasPermission = await checkUserPermission(supabase, userId, perm);
    if (hasPermission) return true;
  }
  return false;
}

/**
 * Check if user has ALL of the required permissions
 */
export async function checkAllPermissions(
  supabase: SupabaseClient,
  userId: string,
  permissions: string[]
): Promise<boolean> {
  for (const perm of permissions) {
    const hasPermission = await checkUserPermission(supabase, userId, perm);
    if (!hasPermission) return false;
  }
  return true;
}
