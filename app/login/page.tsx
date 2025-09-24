'use client';
import { useState } from 'react';
import { useSupabaseSafe } from '@/utils/supabase/client-safe';
import { useRouter } from '@/hooks/useRouter';
import { ClientOnly } from '@/lib/hydration/ClientOnly';

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const { client: supabase, isConfigured } = useSupabaseSafe();
  const { navigateTo } = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!supabase || !isConfigured) {
      setErr('Sistema di autenticazione non disponibile');
      return;
    }

    setErr(null); 
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { 
        setErr(error.message); 
        return; 
      }
      
      try { 
        await fetch('/api/v1/admin/bootstrap', { method: 'POST' }); 
      } catch (bootstrapError) {
        console.warn('Bootstrap failed:', bootstrapError);
      }
      
      navigateTo('/');
    } catch (authError) {
      setErr('Errore durante l\'autenticazione');
      console.error('Auth error:', authError);
    } finally {
      setLoading(false);
    }
  };

  if (!isConfigured) {
    return (
      <main className="mx-auto max-w-sm p-6">
        <h1 className="text-xl mb-4">Sistema Non Disponibile</h1>
        <p className="text-muted-foreground">
          Il sistema di autenticazione non è configurato correttamente.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-xl mb-4">Accedi</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <input 
          type="email" 
          required 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
          placeholder="Email" 
          className="border p-2 rounded"
        />
        <input 
          type="password" 
          required 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
          placeholder="Password" 
          className="border p-2 rounded"
        />
        {err && <p className="text-red-600 text-sm">{err}</p>}
        <button 
          type="submit" 
          disabled={loading || !supabase} 
          className="bg-black text-white rounded px-3 py-2 disabled:opacity-50"
        >
          {loading ? 'Attendere…' : 'Entra'}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <ClientOnly fallback={
      <main className="mx-auto max-w-sm p-6">
        <h1 className="text-xl mb-4">Caricamento...</h1>
        <div className="animate-pulse">
          <div className="h-10 bg-gray-200 rounded mb-3"></div>
          <div className="h-10 bg-gray-200 rounded mb-3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </main>
    }>
      <LoginForm />
    </ClientOnly>
  );
}
