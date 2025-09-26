'use client';
import { useState, useEffect } from 'react';
import { createSupabaseBrowserClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string|null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setErr(null); 
    setLoading(true);
    
    try {
      // Create Supabase client
      const supabase = createSupabaseBrowserClient();
      
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { 
        setErr(error.message); 
        return; 
      }
      
      // Try bootstrap
      try { 
        await fetch('/api/v1/admin/bootstrap', { 
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          }
        }); 
      } catch (bootstrapError) {
        console.warn('Bootstrap failed:', bootstrapError);
      }
      
      router.push('/');
    } catch (authError) {
      setErr('Errore durante l\'autenticazione');
      console.error('Auth error:', authError);
    } finally {
      setLoading(false);
    }
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-sm w-full space-y-4 p-6 bg-white rounded-lg shadow">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Klyra</h1>
            <p className="text-gray-600">Caricamento...</p>
          </div>
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
            <div className="h-10 bg-gray-200 rounded"></div>
          </div>
        </div>
      </main>
    );
  }

  // Show login form
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-sm w-full space-y-6 p-6 bg-white rounded-lg shadow">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Klyra</h1>
          <p className="text-gray-600">Accedi al tuo account</p>
        </div>
        
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <input 
              type="email" 
              required 
              value={email} 
              onChange={e=>setEmail(e.target.value)} 
              placeholder="Email" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <input 
              type="password" 
              required 
              value={password} 
              onChange={e=>setPassword(e.target.value)} 
              placeholder="Password" 
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {err && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md border border-red-200">
              {err}
            </div>
          )}
          
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Attendere…' : 'Entra'}
          </button>
        </form>
        
        <div className="text-center text-sm text-gray-500">
          <p>Demo credentials:</p>
          <p><strong>Email:</strong> test@example.com</p>
          <p><strong>Password:</strong> demo123</p>
        </div>
      </div>
    </main>
  );
}
