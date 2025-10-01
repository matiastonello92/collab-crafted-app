/**
 * Hard Logout Utility
 * 
 * Forces a complete logout by clearing all auth state and redirecting.
 * Use this when you need to ensure the user is completely logged out.
 */

import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export async function hardLogout() {
  try {
    const supabase = createSupabaseBrowserClient()
    
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Clear all local storage
    if (typeof window !== 'undefined') {
      localStorage.clear()
      sessionStorage.clear()
    }
    
    // Redirect to login
    window.location.href = '/login'
  } catch (error) {
    console.error('Hard logout error:', error)
    // Force redirect even on error
    window.location.href = '/login'
  }
}