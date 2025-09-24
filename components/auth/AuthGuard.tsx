'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useRouter } from '@/hooks/useRouter';
import type { Session } from '@supabase/supabase-js';

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Centralized authentication guard - replaces scattered useRequireSession usage
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { replaceTo } = useRouter();

  useEffect(() => {
    let mounted = true;

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        // Redirect to login if no session
        if (!session) {
          replaceTo('/login');
        }
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        if (!session) {
          replaceTo('/login');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase.auth, replaceTo]);

  if (loading) {
    return fallback || <div className="flex items-center justify-center min-h-screen">Caricamento...</div>;
  }

  if (!session) {
    return fallback || null;
  }

  return <>{children}</>;
}