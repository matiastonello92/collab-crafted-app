'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

type SupabaseClient = ReturnType<typeof createSupabaseBrowserClient>;

// Singleton module-level (lazy initialized only on client)
let browserClient: SupabaseClient | null = null;

function getOrCreateClient(): SupabaseClient | null {
  if (typeof window === 'undefined') {
    return null;
  }
  if (!browserClient) {
    browserClient = createSupabaseBrowserClient();
  }
  return browserClient;
}

/**
 * Singleton Supabase client hook - prevents multiple client creation
 * Safe for SSR: initializes lazily on client-side only
 * 
 * @returns The Supabase client (non-null after initial client-side render)
 */
export function useSupabase(): SupabaseClient {
  const [client, setClient] = useState<SupabaseClient | null>(() => {
    // Initialize only on client side
    if (typeof window !== 'undefined') {
      return getOrCreateClient();
    }
    return null;
  });
  
  useEffect(() => {
    if (!client) {
      setClient(getOrCreateClient());
    }
  }, [client]);
  
  // During SSR or before mount, return a placeholder that will be replaced
  // Components wrapped in AuthGuard won't render until client is ready
  // For type safety, we assert non-null since AuthGuard handles the null case
  return client ?? getOrCreateClient()!;
}

/**
 * Check if Supabase client is ready (useful for guards)
 */
export function useSupabaseReady(): boolean {
  const [ready, setReady] = useState(false);
  
  useEffect(() => {
    setReady(true);
  }, []);
  
  return ready;
}
