'use client';
import { useEffect, useState } from 'react';
import { useSupabase, useSupabaseReady } from '@/hooks/useSupabase';
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
  const isReady = useSupabaseReady();
  const supabase = useSupabase();
  const { replaceTo } = useRouter();

  useEffect(() => {
    // Guard: wait for client to be ready (client-side only)
    if (!isReady) {
      return;
    }

    let mounted = true;
    console.log('🔍 AuthGuard: Initializing auth state listener');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔍 AuthGuard: Auth state change:', { event, hasSession: !!session, userEmail: session?.user?.email });
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        // Redirect to login if no session
        if (!session) {
          console.log('❌ AuthGuard: No session, redirecting to login');
          replaceTo('/login');
        } else {
          console.log('✅ AuthGuard: Session found, user authenticated');
        }
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('🔍 AuthGuard: Initial session check:', { hasSession: !!session, userEmail: session?.user?.email, error });
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        if (!session) {
          console.log('❌ AuthGuard: No initial session, redirecting to login');
          replaceTo('/login');
        } else {
          console.log('✅ AuthGuard: Initial session found');
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [isReady, supabase, replaceTo]);

  // Show loading while Supabase client initializes or auth check is in progress
  // Use static spinner to avoid hydration mismatch (no translations during loading)
  if (!isReady || loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session) {
    return fallback || null;
  }

  return <>{children}</>;
}
