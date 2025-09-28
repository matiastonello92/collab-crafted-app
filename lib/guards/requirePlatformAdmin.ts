import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/utils/supabase/server'

/**
 * Server-side guard for Platform Admin access
 * Verifies Platform Admin status via JWT claims or database check
 * Throws 403 for non-Platform Admins
 */
export async function requirePlatformAdmin() {
  const supabase = await createSupabaseServerClient()
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    redirect('/login')
  }

  try {
    // Check if user has platform admin access
    // Method 1: Check via JWT claims (if implemented)
    if (user.app_metadata?.platform_admin === true) {
      return { user, isPlatformAdmin: true }
    }

    // Method 2: Check via database (platform_admins table)
    const { data: adminCheck, error: adminError } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .limit(1)

    if (adminError) {
      console.error('Platform admin check failed:', adminError)
      throw new Error('Authorization check failed')
    }

    const isPlatformAdmin = adminCheck && adminCheck.length > 0

    if (!isPlatformAdmin) {
      // Return 403 for non-platform admins
      throw new Error('Platform Admin access required')
    }

    return { user, isPlatformAdmin: true }

  } catch (error) {
    console.error('Platform admin authorization failed:', error)
    redirect('/platform/access-denied')
  }
}

/**
 * Check if current user is Platform Admin (for UI conditionals)
 * Returns boolean without throwing
 */
export async function isPlatformAdmin(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) return false

    // Check JWT claims first
    if (user.app_metadata?.platform_admin === true) {
      return true
    }

    // Check database (platform_admins table)
    const { data: adminCheck } = await supabase
      .from('platform_admins')
      .select('user_id')
      .eq('user_id', user.id)
      .limit(1)

    return !!(adminCheck && adminCheck.length > 0)

  } catch (error) {
    console.error('Platform admin check failed:', error)
    return false
  }
}