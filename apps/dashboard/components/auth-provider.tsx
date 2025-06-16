'use client';

import { createContext, useContext, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { useAuthManager } from '@zynlo/supabase/hooks/useAuthManager';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  isAuthenticated: boolean;
  signOut: () => Promise<void>;
  getCurrentUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  // Use the expert auth manager
  const {
    user,
    session,
    loading,
    initialized,
    isAuthenticated,
    signOut: authSignOut,
    getCurrentUser,
  } = useAuthManager();

  // Handle authentication redirects
  useEffect(() => {
    if (!initialized) return; // Wait for auth to initialize

    const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/';

    if (isAuthenticated) {
      // User is authenticated, redirect from auth pages to inbox
      if (isAuthPage) {
        router.push('/inbox/nieuw');
      }
    } else {
      // User is not authenticated, redirect to login (except for auth pages)
      if (!isAuthPage) {
        router.push(`/login?redirectedFrom=${encodeURIComponent(pathname)}`);
      }
    }
  }, [initialized, isAuthenticated, pathname, router]);

  // Enhanced signOut function with redirect
  const signOut = async () => {
    try {
      await authSignOut();
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Show loading spinner while initializing auth
  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Auth context value
  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    initialized,
    isAuthenticated,
    signOut,
    getCurrentUser,
  };

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}
