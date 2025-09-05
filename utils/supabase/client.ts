'use client';

import { createBrowserClient } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export function createSupabaseBrowserClient() {
  const { url, anon } = requireSupabaseEnv();
  if (process.env.NODE_ENV !== 'production') {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) console.log('[supabase][client]', match[1]);
  }
  return createBrowserClient(url, anon);
}

