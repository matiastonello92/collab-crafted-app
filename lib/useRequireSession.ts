// DEPRECATED: This hook has been replaced by AuthGuard component
// Use <AuthGuard> in layout instead of this hook in individual components
// This file is kept temporarily for reference but should not be imported

'use client';
import { useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase';

/**
 * @deprecated Use AuthGuard component in layout instead
 */
export function useRequireSession() {
  useEffect(() => {
    console.warn('useRequireSession is deprecated. Use AuthGuard component in layout instead.');
    const supabase = createSupabaseBrowserClient();
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted && !data.session) window.location.href = '/login';
    });
    return () => { mounted = false; };
  }, []);
}