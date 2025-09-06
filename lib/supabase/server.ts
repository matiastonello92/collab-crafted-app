import { admin } from './service';

export function createSupabaseAdminClient() {
  return admin;
}

export const supabaseAdmin = admin;
