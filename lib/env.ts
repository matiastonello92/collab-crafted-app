import 'server-only';

function req(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env: ${name}`);
  return v;
}

export function getSupabaseUrl() {
  return req('NEXT_PUBLIC_SUPABASE_URL');
}
export function getSupabaseAnonKey() {
  return req('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
export function getSupabaseServiceRoleKey() {
  return req('SUPABASE_SERVICE_ROLE_KEY');
}
