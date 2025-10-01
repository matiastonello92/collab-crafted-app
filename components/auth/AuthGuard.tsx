'use client';
import { useEffect, useState } from 'react';
import { useSupabase } from '@/hooks/useSupabase';
import { useRouter } from '@/hooks/useRouter';
import { createLogger } from '@/lib/logger';
import type { Session } from '@supabase/supabase-js';

const logger = createLogger('AuthGuard');

interface AuthGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Centralized authentication guard
 * 
 * Protects client components by ensuring user is authenticated.
 * Automatically redirects to /login if session is not found.
 * 
 * @example
 * <AuthGuard fallback={<LoadingSpinner />}>
 *   <ProtectedContent />
 * </AuthGuard>
 */
export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = useSupabase();
  const { replaceTo } = useRouter();

  useEffect(() => {
    let mounted = true;
    logger.debug('Initializing auth state listener');

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      logger.debug('Auth state changed', { event, hasSession: !!session });
      
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        // Redirect to login if no session
        if (!session) {
          logger.debug('No session found, redirecting to login');
          replaceTo('/login');
        }
      }
    });

    // Check initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        logger.error('Failed to get initial session', error);
      }
      
      if (mounted) {
        setSession(session);
        setLoading(false);
        
        if (!session) {
          logger.debug('No initial session, redirecting to login');
          replaceTo('/login');
        } else {
          logger.debug('Initial session found');
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