import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from './client';

export interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  error: AuthError | null;
}

/**
 * Expert-level Supabase Auth Manager
 *
 * Handles session management with proper timing and error handling.
 * Prevents AuthSessionMissingError by following correct call order:
 * 1. Check session first with getSession()
 * 2. Only call getUser() if valid session exists
 * 3. Handle race conditions and timing issues
 */
class SupabaseAuthManager {
  private authState: AuthState = {
    user: null,
    session: null,
    loading: true,
    initialized: false,
    error: null,
  };

  private listeners: ((state: AuthState) => void)[] = [];
  private authSubscription: any = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize auth manager - call this once at app startup
   */
  async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._performInitialization();
    return this.initPromise;
  }

  private async _performInitialization(): Promise<void> {
    try {
      // Step 1: Get current session (never throws AuthSessionMissingError)
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.error('Session retrieval error:', sessionError);
        this.updateState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
          error: sessionError,
        });
        return;
      }

      // Step 2: If session exists, get fresh user data
      let user: User | null = null;
      let userError: AuthError | null = null;

      if (session?.access_token) {
        try {
          const {
            data: { user: freshUser },
            error,
          } = await supabase.auth.getUser();

          if (error) {
            // Only log if it's not the expected session missing error
            if (error.name !== 'AuthSessionMissingError') {
              console.error('User retrieval error:', error);
              userError = error;
            }
            // For AuthSessionMissingError, just use session.user
            user = session.user || null;
          } else {
            user = freshUser;
          }
        } catch (error: any) {
          // Fallback to session user on any error
          console.warn('getUser() failed, using session user:', error);
          user = session.user || null;
        }
      }

      // Step 3: Update state with session and user
      this.updateState({
        user,
        session,
        loading: false,
        initialized: true,
        error: userError,
      });

      // Step 4: Set up auth state listener
      this.setupAuthListener();
    } catch (error: any) {
      console.error('Auth initialization failed:', error);
      this.updateState({
        user: null,
        session: null,
        loading: false,
        initialized: true,
        error: error as AuthError,
      });
    }
  }

  private setupAuthListener(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }

    this.authSubscription = supabase.auth.onAuthStateChange(async (event, session) => {
      // Handle auth state changes
      if (event === 'SIGNED_OUT') {
        this.updateState({
          user: null,
          session: null,
          loading: false,
          initialized: true,
          error: null,
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        // For sign in or token refresh, get fresh user data safely
        let user: User | null = session?.user || null;

        if (session?.access_token) {
          try {
            const {
              data: { user: freshUser },
              error,
            } = await supabase.auth.getUser();
            if (!error && freshUser) {
              user = freshUser;
            }
          } catch (error) {
            // Safely ignore errors here, use session user as fallback
          }
        }

        this.updateState({
          user,
          session,
          loading: false,
          initialized: true,
          error: null,
        });
      } else if (event === 'INITIAL_SESSION') {
        // Initial session is handled in initialize(), ignore here
        return;
      }
    });
  }

  private updateState(newState: Partial<AuthState>): void {
    this.authState = { ...this.authState, ...newState };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener(this.authState);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);

    // Immediately call with current state if initialized
    if (this.authState.initialized) {
      listener(this.authState);
    }

    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Get current auth state
   */
  getState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get current user safely (never throws AuthSessionMissingError)
   */
  async getCurrentUser(): Promise<User | null> {
    // Wait for initialization if not done
    if (!this.authState.initialized) {
      await this.initialize();
    }

    // Return cached user if available
    if (this.authState.user) {
      return this.authState.user;
    }

    // Try to get fresh user data only if we have a session
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (!error && user) {
          return user;
        }
      } catch (error) {
        // Ignore errors, return session user as fallback
      }

      return session.user || null;
    }

    return null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(this.authState.session?.access_token && this.authState.user);
  }

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
      this.authSubscription = null;
    }
    this.listeners = [];
    this.initPromise = null;
  }
}

// Export singleton instance
export const authManager = new SupabaseAuthManager();
