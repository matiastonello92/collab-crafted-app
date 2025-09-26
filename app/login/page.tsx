'use client';
import { useState, useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const router = useRouter();

  // Check Supabase configuration on mount
  useEffect(() => {
    const checkConfig = () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      
      if (!url || !key || url.includes('demo') || key.includes('demo')) {
        setConfigError('Configurazione Supabase necessaria');
      }
      
      setMounted(true);
    };

    checkConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (configError) {
      setError('Configurare prima le credenziali Supabase');
      return;
    }

    if (!email || !password) {
      setError('Inserisci email e password');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      if (data.user) {
        // Optional: Bootstrap user after successful login
        try {
          const session = await supabase.auth.getSession();
          if (session.data.session?.access_token) {
            await fetch('/api/v1/admin/bootstrap', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${session.data.session.access_token}`,
                'Content-Type': 'application/json'
              }
            });
          }
        } catch (bootstrapError) {
          console.warn('Bootstrap warning:', bootstrapError);
          // Don't fail login if bootstrap fails
        }

        // Redirect to main app
        router.push('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Errore durante il login');
    } finally {
      setLoading(false);
    }
  };

  // Show loading during mount
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="max-w-md w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Klyra</h2>
              <p className="text-gray-600">Caricamento sistema...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show configuration error
  if (configError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <div className="max-w-lg w-full mx-4">
          <div className="bg-white rounded-lg shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-900 mb-2">Configurazione Richiesta</h2>
              <p className="text-red-700 mb-6">Per utilizzare l'autenticazione, configura le credenziali Supabase nel file .env.local</p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2">Credenziali richieste:</h3>
              <div className="text-sm text-gray-700 space-y-2">
                <div><strong>NEXT_PUBLIC_SUPABASE_URL</strong><br />
                <span className="text-xs text-gray-500">La URL del tuo progetto Supabase (es: https://abc123.supabase.co)</span></div>
                
                <div><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong><br />
                <span className="text-xs text-gray-500">La chiave pubblica/anon del progetto</span></div>
                
                <div><strong>SUPABASE_SERVICE_ROLE_KEY</strong><br />
                <span className="text-xs text-gray-500">La chiave service_role (solo server-side)</span></div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <h3 className="font-semibold mb-2 text-blue-900">Come ottenere le credenziali:</h3>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Vai su <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">supabase.com/dashboard</a></li>
                <li>2. Seleziona il progetto <strong>jwchmdivuwgfjrwvgtia</strong></li>
                <li>3. Vai su Settings → API</li>
                <li>4. Copia Project URL e API Keys</li>
                <li>5. Aggiorna il file <code className="bg-white px-1 rounded">.env.local</code></li>
              </ol>
            </div>

            <button 
              onClick={() => window.location.reload()}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Ricarica dopo aver configurato
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Klyra</h2>
            <p className="text-gray-600">Accedi con il tuo account Supabase</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="inserisci la tua email"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="inserisci la tua password"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-800 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {loading ? (
                <div className="flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Accesso in corso...
                </div>
              ) : (
                'Accedi'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              Staff Management System • Powered by Supabase
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
