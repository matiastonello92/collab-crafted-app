import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Rende esplicito che va usato con await
export async function createSupabaseServerClient() {
  const cookieStore = await cookies(); // Next 15: cookies() è async

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          // NB: set/remove funzionano in Server Actions/Route Handlers.
          // In Server Components non verranno chiamati (ed è OK).
          cookieStore.set(name, value, options);
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 });
        },
      },
    }
  );

  // Imposta il contesto RLS se abbiamo un'organizzazione/location persistite
  const org = cookieStore.get('pn_org')?.value || null;
  const loc = cookieStore.get('pn_loc')?.value || null;
  if (org || loc) {
    try {
      await supabase.rpc('app.set_context_checked', {
        p_org: org,
        p_location: loc,
      });
    } catch (err) {
      console.error('[supabase] set_context_checked failed', err);
    }
  }

  return supabase;
}
