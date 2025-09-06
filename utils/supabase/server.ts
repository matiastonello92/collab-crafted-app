import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServerClient() {
  const jar = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  return createServerClient(url, anon, {
    cookies: {
      get(name: string) {
        return jar.get(name)?.value;
      },
      set(name: string, value: string, options?: CookieOptions) {
        // Next 15 supporta (name, value, options)
        // se dà fastidio in dev, fallback: jar.set({ name, value, ...options })
        jar.set(name, value, options);
      },
      remove(name: string, options?: CookieOptions) {
        jar.set(name, '', { ...(options || {}), maxAge: 0 });
      },
    },
  });
}

