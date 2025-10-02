import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * READ-ONLY Supabase client for Server Components
 * Use this in page.tsx, layout.tsx, and other Server Components
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set() {
          // NO-OP: Cookies cannot be modified in Server Components
        },
        remove() {
          // NO-OP: Cookies cannot be modified in Server Components
        },
      },
    }
  );
}

/**
 * FULL ACCESS Supabase client for Server Actions and Route Handlers
 * Use this in app/api/route.ts and app/actions/*.ts files
 */
export async function createSupabaseServerActionClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, value, options);
          } catch (error) {
            // Fail silently if called from Server Component context
          }
        },
        remove(name: string, options?: CookieOptions) {
          try {
            cookieStore.set(name, '', { ...(options || {}), maxAge: 0 });
          } catch (error) {
            // Fail silently if called from Server Component context
          }
        },
      },
    }
  );
}

