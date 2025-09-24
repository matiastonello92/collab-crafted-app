'use client';
import { useEffect, useState } from 'react';
import { createSupabaseUserClient } from '@/lib/supabase/clients';
import { hardLogout } from '@/lib/hardLogout';

export function UserBadge() {
  const [email, setEmail] = useState<string|null>(null);
  useEffect(() => {
    let mounted = true;

    void (async () => {
      const supabase = await createSupabaseUserClient();
      const { data } = await supabase.auth.getUser();
      if (mounted) {
        setEmail(data.user?.email ?? null);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);
  if (!email) return <a href="/login" className="text-sm underline">Accedi</a>;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span>{email}</span>
      <button onClick={hardLogout} className="px-2 py-1 rounded border">Logout</button>
    </div>
  );
}
