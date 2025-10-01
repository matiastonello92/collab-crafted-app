'use client';
import { useEffect, useState } from 'react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { hardLogout } from '@/lib/hardLogout';

export function UserBadge() {
  const [email, setEmail] = useState<string|null>(null);
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null));
  }, []);
  if (!email) return <a href="/login" className="text-sm underline">Accedi</a>;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span>{email}</span>
      <button onClick={hardLogout} className="px-2 py-1 rounded border">Logout</button>
    </div>
  );
}
