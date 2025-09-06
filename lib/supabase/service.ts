import 'server-only';
export const runtime = 'nodejs';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/env';

export const admin = createClient(
  getSupabaseUrl(),
  getSupabaseServiceRoleKey(),
  { auth: { autoRefreshToken: false, persistSession: false } }
);
