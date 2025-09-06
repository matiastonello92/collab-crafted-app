import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { requireSupabaseEnv } from './config';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const { url, anon } = requireSupabaseEnv();
  const supabase = createServerClient(
    url,
    anon,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options: CookieOptions) => {
          res.cookies.set(name, value, options);
        },
        remove: (name: string, options: CookieOptions) => {
          res.cookies.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  await supabase.auth.getUser();

  return res;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

