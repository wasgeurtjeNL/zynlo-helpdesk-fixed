import { createClient } from '@supabase/supabase-js';
import { Database } from './types/database';

// Voor development kunnen we deze hardcoded values gebruiken
// In productie moeten deze uit environment variables komen
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nkrytssezaefinbjgwnq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg';

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Singleton pattern to prevent multiple instances
let supabaseInstance: ReturnType<typeof createClient<Database>> | null = null;

export const supabase = (() => {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'zynlo-helpdesk-auth', // Unique storage key
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
  }
  return supabaseInstance;
})();

// Create a Supabase client for server-side operations
let serverClientInstance: ReturnType<typeof createClient<Database>> | null = null;

export const createServerClient = (supabaseServiceKey?: string) => {
  const key = supabaseServiceKey || process.env.SUPABASE_SERVICE_KEY;
  
  if (!key) {
    throw new Error('Missing Supabase service key for server operations');
  }

  if (!serverClientInstance) {
    serverClientInstance = createClient<Database>(supabaseUrl, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return serverClientInstance;
}; 