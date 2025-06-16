'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@zynlo/supabase';
import { useAuthContext } from '@/components/auth-provider';
import {
  Monitor,
  MapPin,
  Calendar,
  Clock,
  Smartphone,
  Laptop,
  Tablet,
  CheckCircle,
  XCircle,
  RefreshCw,
} from 'lucide-react';

interface LoginSession {
  id: string;
  ip_address: string;
  user_agent: string;
  login_method: string;
  success: boolean;
  device_type: string;
  browser: string;
  os: string;
  country: string;
  city: string;
  created_at: string;
  session_id: string;
  expires_at: string;
}

export default function LoginSessionsPage() {
  const { user } = useAuthContext();
  const [sessions, setSessions] = useState<LoginSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [hasLoggedSession, setHasLoggedSession] = useState(false);

  useEffect(() => {
    if (user) {
      fetchLoginSessions();
      // Only log current session once per component lifecycle
      if (!hasLoggedSession) {
        ensureCurrentSessionLogged();
        setHasLoggedSession(true);
      }
    }
  }, [user, hasLoggedSession]);

  const ensureCurrentSessionLogged = async () => {
    try {
      // Get the current session from Supabase
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.access_token) {
        setCurrentSessionId(session.access_token);

        // Log the current session if it doesn't exist
        const response = await fetch('/api/auth/log-current-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user?.id,
            sessionId: session.access_token,
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Current session logged:', result);
        }
      }
    } catch (error) {
      console.warn('Failed to log current session:', error);
    }
  };

  const fetchLoginSessions = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('login_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) {
        throw error;
      }

      setSessions(data || []);
    } catch (err: any) {
      console.error('Error fetching login sessions:', err);
      setError(err.message || 'Er is een fout opgetreden bij het ophalen van login sessies');
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      default:
        return Laptop;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatIpAddress = (ipAddress: string) => {
    // Convert IPv6 localhost to readable format
    if (ipAddress === '::1') {
      return 'Localhost (::1)';
    }
    // Convert IPv4 localhost to readable format
    if (ipAddress === '127.0.0.1') {
      return 'Localhost (127.0.0.1)';
    }
    // Return the IP as-is for external IPs
    return ipAddress;
  };

  const isCurrentSession = (sessionId: string) => {
    // Check if this is the current session by comparing with current auth session
    return currentSessionId === sessionId;
  };

  const handleRefresh = async () => {
    // Only fetch sessions, don't log new session
    await fetchLoginSessions();
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Monitor className="w-6 h-6" />
            Login Sessies
          </h1>
          <p className="text-gray-600 mt-2">
            Bekijk je recente login activiteit en beheer de beveiliging van je account.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Vernieuwen
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <XCircle className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Fout</h3>
              <div className="mt-1 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="text-center py-12">
          <Monitor className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Geen login sessies</h3>
          <p className="mt-1 text-sm text-gray-500">
            Er zijn nog geen login sessies geregistreerd voor je account.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {sessions.map((session) => {
              const DeviceIcon = getDeviceIcon(session.device_type);
              const isSuccess = session.success;
              const isCurrent = isCurrentSession(session.session_id);

              return (
                <li key={session.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div
                          className={`p-2 rounded-full ${isSuccess ? 'bg-green-100' : 'bg-red-100'}`}
                        >
                          <DeviceIcon
                            className={`w-5 h-5 ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
                          />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <p className="text-sm font-medium text-gray-900">
                            {session.browser} op {session.os}
                          </p>
                          {isSuccess ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          {isCurrent && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              Huidige sessie
                            </span>
                          )}
                        </div>

                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            <MapPin className="w-4 h-4" />
                            <span>{formatIpAddress(session.ip_address)}</span>
                            {session.city && session.country && (
                              <span>
                                • {session.city}, {session.country}
                              </span>
                            )}
                          </div>

                          <div className="flex items-center space-x-1">
                            <Calendar className="w-4 h-4" />
                            <span>{formatDate(session.created_at)}</span>
                          </div>

                          <div className="flex items-center space-x-1">
                            <Clock className="w-4 h-4" />
                            <span className="capitalize">{session.device_type}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex-shrink-0">
                      <div className="text-right">
                        <p
                          className={`text-sm font-medium ${isSuccess ? 'text-green-600' : 'text-red-600'}`}
                        >
                          {isSuccess ? 'Succesvol' : 'Mislukt'}
                        </p>
                        <p className="text-xs text-gray-500 capitalize">
                          {session.login_method.replace('_', ' ')}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {sessions.length > 0 && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <Monitor className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Beveiligingstip</h3>
              <div className="mt-1 text-sm text-yellow-700">
                <p>
                  Controleer regelmatig je login activiteit. Als je onbekende activiteit ziet,
                  wijzig dan onmiddellijk je wachtwoord en neem contact op met support.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
