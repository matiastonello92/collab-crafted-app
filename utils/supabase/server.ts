import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export async function createSupabaseServerClient() {
  const { url, anon } = requireSupabaseEnv();
  if (process.env.NODE_ENV !== 'production') {
    const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (match) console.log('[supabase][server]', match[1]);
  }

  return createServerClient(url, anon, {
    cookies: async () => {
      const cookieStore = await cookies();
      return {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      };
    },
  });
}

