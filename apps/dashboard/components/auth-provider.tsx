'use client'

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import { supabase } from '@zynlo/supabase'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const pathname = usePathname()
  const initialized = useRef(false)

  useEffect(() => {
    // Prevent multiple initializations
    if (initialized.current) return
    initialized.current = true

    // Get initial user
    const getInitialUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        if (error) {
          console.error('Error getting user:', error)
        }
        setUser(user)
      } catch (error) {
        console.error('Error in getInitialUser:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Only log significant events, not repeated INITIAL_SESSION
        if (event !== 'INITIAL_SESSION') {
          console.log('Auth state changed:', event, session?.user?.email)
        }
        
        setUser(session?.user ?? null)
        setLoading(false)

        // Redirect logic - only for actual sign in/out events
        if (event === 'SIGNED_IN' && session?.user) {
          // If user just signed in, redirect to inbox
          if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
            router.push('/inbox/nieuw')
          }
        } else if (event === 'SIGNED_OUT') {
          // If user signed out, redirect to login
          router.push('/login')
        }
      }
    )

    return () => {
      subscription.unsubscribe()
      initialized.current = false
    }
  }, [router, pathname])

  // Redirect to login if not authenticated and not on auth pages
  useEffect(() => {
    if (!loading && !user) {
      const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/'
      if (!isAuthPage) {
        router.push(`/login?redirectedFrom=${encodeURIComponent(pathname)}`)
      }
    }
  }, [user, loading, pathname, router])

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }
    } catch (error) {
      console.error('Error in signOut:', error)
    }
  }

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  // Show login page if not authenticated and on auth pages
  const isAuthPage = pathname === '/login' || pathname === '/signup' || pathname === '/'
  if (!user && !isAuthPage) {
    return null // Will redirect via useEffect
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  )
} 