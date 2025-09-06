import { cookies } from 'next/headers';
import {
  createServerClient,
  type CookieOptions,
  type CookieMethodsServer,
} from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export async function createSupabaseServerClient() {
  const { url, anon } = requireSupabaseEnv();
  const jar = await cookies();

  const methods: CookieMethodsServer = {
    get(name: string) {
      return jar.get(name)?.value;
    },
    set(name: string, value: string, options?: CookieOptions) {
      try {
        jar.set(name, value, options);
      } catch {
        jar.set({ name, value, ...(options ?? {}) });
      }
    },
    remove(name: string, options?: CookieOptions) {
      jar.set(name, '', { ...(options ?? {}), maxAge: 0 });
    },
  };

  return createServerClient(url, anon, { cookies: methods });
}

