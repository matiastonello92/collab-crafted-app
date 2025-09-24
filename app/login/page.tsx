'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { createSupabaseUserClient } from '@/lib/supabase/clients';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null); setLoading(true);
    const supabase = await createSupabaseUserClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { setErr(error.message); return; }
    try { await fetch('/api/v1/admin/bootstrap', { method: 'POST' }); } catch {}
    router.replace('/');
  };

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl mb-4">Accedi</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" className="border p-2 rounded"/>
        <input type="password" required value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" className="border p-2 rounded"/>
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button type="submit" disabled={loading} className="bg-black text-white rounded px-3 py-2">
          {loading ? 'Attendere…' : 'Entra'}
        </button>
      </form>
    </main>
  );
}
