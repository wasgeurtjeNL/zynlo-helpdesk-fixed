import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// Voor development kunnen we deze hardcoded values gebruiken
// In productie moeten deze uit environment variables komen
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nkrytssezaefinbjgwnq.supabase.co';
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Global singleton to prevent multiple instances across module reloads
declare global {
  interface Window {
    __supabaseClient?: ReturnType<typeof createClient<Database>>;
    __supabaseServerClient?: ReturnType<typeof createClient<Database>>;
  }
}

// Singleton pattern using global window object to prevent multiple instances
export const supabase = (() => {
  // For SSR, always create a new instance
  if (typeof window === 'undefined') {
    return createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'zynlo-helpdesk-auth',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  // For client-side, use singleton
  if (!window.__supabaseClient) {
    window.__supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'zynlo-helpdesk-auth',
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }

  return window.__supabaseClient;
})();

// Create a Supabase client for server-side operations
export const createServerClient = (supabaseServiceKey?: string) => {
  const key = supabaseServiceKey || process.env.SUPABASE_SERVICE_KEY;

  if (!key) {
    throw new Error('Missing Supabase service key for server operations');
  }

  // For SSR, always create a new instance
  if (typeof window === 'undefined') {
    return createClient<Database>(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  // For client-side (shouldn't happen but just in case), use singleton
  if (!window.__supabaseServerClient) {
    window.__supabaseServerClient = createClient<Database>(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return window.__supabaseServerClient;
};
