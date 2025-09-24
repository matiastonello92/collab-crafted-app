'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { createSupabaseUserClient } from '@/lib/supabase/clients';

export function useRequireSession() {
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const supabase = await createSupabaseUserClient();
      const { data } = await supabase.auth.getSession();
      if (mounted && !data.session) {
        router.replace('/login');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router]);
}
