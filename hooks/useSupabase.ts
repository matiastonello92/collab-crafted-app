'use client';
import { useMemo } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';

/**
 * Singleton Supabase client hook - prevents multiple client creation
 */
export function useSupabase() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  return supabase;
}