import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { getAuthSnapshot } from '@/lib/server/auth-snapshot'

/**
 * Server-side admin guard - checks if user has admin permissions
 * Redirects to home page if not authorized
 */
export async function requireAdmin(): Promise<string> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    const { permissions } = await getAuthSnapshot()
    const adminPerms = ['locations.manage_users', 'locations.assign_roles', 'locations.manage_settings']
    const hasAdminAccess = adminPerms.some(p => permissions.includes(p))

    if (!hasAdminAccess) {
      redirect('/?error=unauthorized')
    }

    return user.id
  } catch (error) {
    console.error('Error in admin guard:', error)
    redirect('/?error=server_error')
  }
}

/**
 * Check admin access without redirect (for API routes)
 */
export async function checkAdminAccess(): Promise<{ userId: string | null; hasAccess: boolean }> {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { userId: null, hasAccess: false }
    }

    const { permissions } = await getAuthSnapshot()
    const adminPerms = ['locations.manage_users', 'locations.assign_roles', 'locations.manage_settings']
    const hasAdminAccess = adminPerms.some(p => permissions.includes(p))

    return { userId: user.id, hasAccess: hasAdminAccess }
  } catch (error) {
    console.error('Error checking admin access:', error)
    return { userId: null, hasAccess: false }
  }
}