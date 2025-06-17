'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@zynlo/supabase';
import { useAuthContext } from '@/components/auth-provider';
import { LogIn, Lock, AlertCircle } from 'lucide-react';

// Hook to dynamically load external scripts
const useScript = (src: string) => {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;

    const handleLoad = () => setLoaded(true);
    const handleError = () => setError(true);

    script.addEventListener('load', handleLoad);
    script.addEventListener('error', handleError);

    document.body.appendChild(script);

    return () => {
      script.removeEventListener('load', handleLoad);
      script.removeEventListener('error', handleError);
      document.body.removeChild(script);
    };
  }, [src]);

  return { loaded, error };
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuthContext();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const vantaRef = useRef<HTMLDivElement>(null);
  const vantaEffect = useRef<any>(null);

  // Load external scripts
  const threeScript = useScript('https://unpkg.com/three@0.134.0/build/three.min.js');
  const vantaScript = useScript('https://unpkg.com/vanta@0.5.24/dist/vanta.net.min.js');

  // Initialize Vanta effect
  useEffect(() => {
    if (threeScript.loaded && vantaScript.loaded && vantaRef.current && !vantaEffect.current) {
      vantaEffect.current = (window as any).VANTA.NET({
        el: vantaRef.current,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 150,
        minWidth: 200,
        scale: 1.0,
        scaleMobile: 1.0,
        color: 0xd1d5db,
        backgroundColor: 0x171717,
        points: 8,
        maxDistance: 20.0,
        spacing: 18.0,
        showDots: true,
      });
    }

    return () => {
      if (vantaEffect.current) {
        vantaEffect.current.destroy();
        vantaEffect.current = null;
      }
    };
  }, [threeScript.loaded, vantaScript.loaded]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      const redirectTo = searchParams.get('redirectedFrom') || '/inbox/nieuw';
      router.push(redirectTo);
    }
  }, [user, router, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login with:', email);

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      console.log('Login result:', { data, error });

      if (error) {
        console.error('Supabase auth error:', error);
        throw error;
      }

      // Log successful login attempt
      if (data?.user?.id && data?.session?.access_token) {
        try {
          const logResponse = await fetch('/api/auth/log-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: data.user.id,
              success: true,
              loginMethod: 'email_password',
              sessionId: data.session.access_token,
            }),
          });

          if (logResponse.ok) {
            const logData = await logResponse.json();
            console.log('Login session logged:', logData);
          }
        } catch (logError) {
          console.warn('Failed to log successful login attempt:', logError);
        }
      }

      // The AuthProvider will handle the redirect
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Er is een fout opgetreden bij het inloggen');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'microsoft') => {
    try {
      setError(null);
      setLoading(true);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider === 'microsoft' ? 'azure' : provider,
        options: {
          redirectTo: `${window.location.origin}/inbox/nieuw`,
        },
      });

      if (error) {
        console.error(`${provider} OAuth error:`, error);
        throw error;
      }
    } catch (err: any) {
      console.error(`${provider} login error:`, err);
      setError(err.message || `Er is een fout opgetreden bij het inloggen met ${provider}`);
      setLoading(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .card-container {
          position: relative;
          z-index: 0;
        }
        .card-container::before {
          content: '';
          position: absolute;
          inset: -1px;
          background: linear-gradient(to bottom right, #525252, transparent, #262626);
          border-radius: 0.75rem;
          z-index: -1;
        }
        .card-content {
          border-radius: 0.75rem;
          overflow: hidden;
          background: #171717;
        }
        .divider-gradient {
          height: 1px;
          background: linear-gradient(to right, transparent, #525252, transparent);
        }
        #vanta-canvas {
          overflow: hidden;
        }
      `}</style>

      <div className="bg-neutral-950 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full card-container">
          <div className="card-content shadow-lg backdrop-blur-sm">
            <div className="h-[150px] relative" ref={vantaRef}>
              <div className="absolute top-4 left-4 z-10">
                <span className="px-2 py-1 bg-neutral-800/80 rounded-full text-xs text-neutral-400 mb-2 inline-block">
                  BEVEILIGDE TOEGANG
                </span>
                <h2 className="text-2xl font-bold text-white">Zynlo Portal</h2>
                <div className="h-1 w-12 bg-blue-400 mt-2 rounded-full"></div>
              </div>
            </div>

            <div className="p-6 flex flex-col bg-neutral-900">
              <div>
                <span className="px-2 py-1 bg-neutral-800 rounded-full text-xs text-neutral-400 mb-2 inline-block">
                  AUTHENTICATIE
                </span>
                <h3 className="text-xl font-semibold text-neutral-200 mb-2">Account Inloggen</h3>
                <p className="text-neutral-400 text-xs mb-4">
                  Toegang tot het intelligente helpdesk platform van{' '}
                  <span className="text-blue-400 font-medium">zynlo.io</span> - waar AI en
                  menselijke expertise samenkomen voor uitzonderlijke klantenservice.
                </p>

                {error && (
                  <div className="rounded-md bg-red-900/20 border border-red-800 p-4 mb-4">
                    <div className="flex">
                      <div className="flex-shrink-0">
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      </div>
                      <div className="ml-3">
                        <h3 className="text-sm font-medium text-red-200">{error}</h3>
                      </div>
                    </div>
                  </div>
                )}

                <form className="space-y-4 mb-6" onSubmit={handleSubmit}>
                  <div>
                    <label
                      htmlFor="email"
                      className="text-neutral-300 text-xs font-medium block mb-1"
                    >
                      E-MAILADRES
                    </label>
                    <input
                      type="email"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                      placeholder="jouw@email.com"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="password" className="text-neutral-300 text-xs font-medium">
                        WACHTWOORD
                      </label>
                      <Link
                        href="/forgot-password"
                        className="text-neutral-400 text-xs hover:text-blue-400"
                      >
                        Vergeten?
                      </Link>
                    </div>
                    <input
                      type="password"
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2 text-neutral-200 focus:outline-none focus:ring-2 focus:ring-blue-600 text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="remember"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 bg-neutral-800 border-neutral-700 rounded mr-2"
                    />
                    <label htmlFor="remember" className="text-neutral-400 text-xs">
                      Dit apparaat onthouden
                    </label>
                  </div>

                  <div className="flex justify-between text-sm space-x-3">
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <LogIn className="h-4 w-4 mr-2" />
                      {loading ? 'Bezig met inloggen...' : 'Inloggen'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOAuthLogin('google')}
                      disabled={loading}
                      className="flex-1 px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 rounded-lg transition flex items-center justify-center font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Lock className="h-4 w-4 mr-2" />
                      SSO
                    </button>
                  </div>
                </form>
              </div>

              <div className="mt-6 pt-4 text-center">
                <div className="divider-gradient mb-4"></div>
                <p className="text-neutral-400 text-xs">
                  Nog geen account?{' '}
                  <Link
                    href="/signup"
                    className="text-blue-400 hover:text-blue-300 hover:underline"
                  >
                    Toegang Aanvragen
                  </Link>
                </p>
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-neutral-400 text-xs">Systeemstatus: Operationeel</span>
                </div>
                <div className="mt-3">
                  <span className="text-neutral-500 text-xs">
                    Powered by <span className="text-blue-400 font-medium">zynlo.io</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
