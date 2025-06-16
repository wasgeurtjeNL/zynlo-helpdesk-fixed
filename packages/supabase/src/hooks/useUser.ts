import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../client';
import { authManager } from '../auth-manager';

export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    async function getInitialSession() {
      try {
        // Use expert auth manager to get current user
        const user = await authManager.getCurrentUser();

        if (mounted) {
          setUser(user);
          setLoading(false);
        }
      } catch (error: any) {
        if (mounted) {
          // Only set error for unexpected errors
          if (error?.name !== 'AuthSessionMissingError') {
            setError(error as Error);
          }
          setUser(null);
          setLoading(false);
        }
      }
    }

    getInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      setError(error as Error);
      return { data: null, error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (email: string, password: string, metadata?: Record<string, any>) => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
        },
      });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      setError(error as Error);
      return { data: null, error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      return { error: null };
    } catch (error) {
      setError(error as Error);
      return { error: error as Error };
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    signIn,
    signUp,
    signOut,
  };
}
