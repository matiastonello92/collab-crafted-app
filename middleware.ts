import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export const config = {
  matcher: ['/((?!_next/|static/|favicon.ico|robots.txt|sitemap.xml|api/health|api/internal/setup/apply-migrations).*)'],
};

const RATE_LIMITS = {
  'POST:/api/settings/email-test': { limit: 5, window: 600 },
  'POST:/api/v1/admin/invitations': { limit: 20, window: 600 },
  'POST:/api/public/invite/accept': { limit: 20, window: 600 },
} as const;

const FALLBACK_LIMIT = { limit: 120, window: 60 };

type RateLimitConfig = { limit: number; window: number };

async function checkRateLimit(req: NextRequest, key: string, limit: number, window: number): Promise<boolean> {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // Let protected routes handle auth

    const { data, error } = await supabase.rpc('rate_limit_hit', {
      p_key: key,
      p_limit: limit,
      p_window_seconds: window
    });

    if (error) {
      console.error('[RATE_LIMIT] RPC error:', error);
      return true; // Fail open
    }

    const allowed = !!data;
    if (!allowed) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      console.warn('[429]', key, user.id, ip);
      
      // Log to audit_events if possible
      try {
        await supabase.from('audit_events').insert({
          event_key: 'rate_limit.blocked',
          payload: {
            key,
            user_id: user.id,
            ip
          }
        });
      } catch (auditError) {
        console.warn('[AUDIT] Failed to log rate limit:', auditError);
      }
    }

    return allowed;
  } catch (error) {
    console.error('[RATE_LIMIT] Unexpected error:', error);
    return true; // Fail open
  }
}

export async function middleware(req: NextRequest) {
  try {
    const { pathname } = req.nextUrl;
    const method = req.method;
    const key = `${method}:${pathname}`;

    // Rate limiting for POST API routes
    if (method === 'POST' && pathname.startsWith('/api/')) {
      let rateLimitConfig: RateLimitConfig = RATE_LIMITS[key as keyof typeof RATE_LIMITS] || FALLBACK_LIMIT;

      const allowed = await checkRateLimit(req, key, rateLimitConfig.limit, rateLimitConfig.window);
      if (!allowed) {
        return NextResponse.json(
          { 
            error: 'RATE_LIMITED', 
            retryAfter: rateLimitConfig.window 
          },
          { status: 429 }
        );
      }
    }

    const res = NextResponse.next();

    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "connect-src 'self' https://*.supabase.co https://api.resend.com",
      "frame-ancestors 'self'",
    ].join('; ');
    res.headers.set('Content-Security-Policy', csp);

    return res;
  } catch (error) {
    console.error('[MIDDLEWARE] Error:', error);
    return NextResponse.next();
  }
}