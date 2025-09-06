import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'
import { canAny } from '@/lib/permissions/can'

/**
 * Server-side admin guard - checks if user has admin permissions
 * Redirects to home page if not authorized
 */
export async function requireAdmin(): Promise<string> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      redirect('/login')
    }

    // Check if user has admin-level permissions
    const hasAdminAccess = await canAny(user.id, [
      '*',
      'manage_users',
      'assign_roles',
      'admin.manage'
    ])

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
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return { userId: null, hasAccess: false }
    }

    const hasAdminAccess = await canAny(user.id, [
      '*',
      'manage_users',
      'assign_roles', 
      'admin.manage'
    ])

    return { userId: user.id, hasAccess: hasAdminAccess }
  } catch (error) {
    console.error('Error checking admin access:', error)
    return { userId: null, hasAccess: false }
  }
}