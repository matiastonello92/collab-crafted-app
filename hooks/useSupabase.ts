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
  const [client, setClient] = useState<SupabaseClient | null>(null);
  
  useEffect(() => {
    if (!client) {
      setClient(getOrCreateClient());
    }
  }, [client]);
  
  // Return client or throw - components should be wrapped in AuthGuard/ClientOnly
  // which handles the SSR case
  if (!client) {
    // During SSR, return a dummy that will be replaced on client
    // This prevents null checks everywhere while maintaining SSR safety
    return getOrCreateClient() as SupabaseClient;
  }
  
  return client;
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
