import { useEffect, useState, useRef } from 'react';
import { authManager, AuthState } from '../auth-manager';

/**
 * Expert React hook for Supabase authentication
 *
 * Uses the AuthManager for robust session handling.
 * Prevents AuthSessionMissingError and handles race conditions.
 */
export function useAuthManager() {
  const [authState, setAuthState] = useState<AuthState>(() => authManager.getState());
  const isInitializedRef = useRef(false);

  useEffect(() => {
    // Initialize auth manager on first mount
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;

      // Start initialization
      authManager.initialize().catch((error) => {
        console.error('Auth manager initialization failed:', error);
      });
    }

    // Subscribe to auth state changes
    const unsubscribe = authManager.subscribe((newState) => {
      setAuthState(newState);
    });

    // Get current state immediately if available
    const currentState = authManager.getState();
    if (currentState.initialized) {
      setAuthState(currentState);
    }

    return unsubscribe;
  }, []);

  return {
    user: authState.user,
    session: authState.session,
    loading: authState.loading,
    initialized: authState.initialized,
    error: authState.error,
    isAuthenticated: authManager.isAuthenticated(),
    getCurrentUser: () => authManager.getCurrentUser(),
    signOut: () => authManager.signOut(),
  };
}
