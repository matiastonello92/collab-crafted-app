'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export function createSupabaseBrowserClient() {
  const { url, anon } = requireSupabaseEnv();
  
  // Environment guardrail
  if (!url || !anon) {
    console.warn('⚠️ Missing Supabase environment variables:', {
      url: !!url,
      anon: !!anon
    })
  }
  
  return createBrowserClient(url, anon);
}

