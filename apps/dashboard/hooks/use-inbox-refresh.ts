import { useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

interface UseInboxRefreshOptions {
  enabled?: boolean
  interval?: number // milliseconds
  onNewTickets?: (count: number) => void
}

/**
 * Hook for client-side inbox refreshing
 * Polls for new tickets and updates the UI without full page refresh
 */
export function useInboxRefresh({
  enabled = true,
  interval = 30000, // 30 seconds default
  onNewTickets
}: UseInboxRefreshOptions = {}) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const intervalRef = useRef<NodeJS.Timeout>()
  const lastCountRef = useRef<number>(0)

  // Refresh inbox data
  const refreshInbox = useCallback(async () => {
    try {
      // Invalidate all inbox-related queries
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inbox-counts'] }),
        queryClient.invalidateQueries({ queryKey: ['tickets'] }),
        queryClient.invalidateQueries({ queryKey: ['conversations'] })
      ])

      // Get current counts
      const counts = queryClient.getQueryData<any>(['inbox-counts'])
      const newCount = counts?.nieuw || 0

      // Check if there are new tickets
      if (newCount > lastCountRef.current && lastCountRef.current > 0) {
        onNewTickets?.(newCount - lastCountRef.current)
      }

      lastCountRef.current = newCount
    } catch (error) {
      console.error('Failed to refresh inbox:', error)
    }
  }, [queryClient, onNewTickets])

  // Manual refresh function
  const manualRefresh = useCallback(async () => {
    await refreshInbox()
    
    // Reset the interval to prevent immediate refresh after manual
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = setInterval(refreshInbox, interval)
    }
  }, [refreshInbox, interval])

  // Set up polling
  useEffect(() => {
    if (!enabled) return

    // Initial fetch
    refreshInbox()

    // Set up interval
    intervalRef.current = setInterval(refreshInbox, interval)

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [enabled, interval, refreshInbox])

  // Listen for visibility changes
  useEffect(() => {
    if (!enabled) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Refresh when tab becomes visible
        refreshInbox()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [enabled, refreshInbox])

  // Listen for focus events
  useEffect(() => {
    if (!enabled) return

    const handleFocus = () => {
      refreshInbox()
    }

    window.addEventListener('focus', handleFocus)
    
    return () => {
      window.removeEventListener('focus', handleFocus)
    }
  }, [enabled, refreshInbox])

  return {
    refresh: manualRefresh,
    isRefreshing: queryClient.isFetching({ queryKey: ['inbox-counts'] }) > 0
  }
}

/**
 * Hook for real-time inbox updates using Supabase
 */
export function useRealtimeInbox() {
  const queryClient = useQueryClient()
  
  useEffect(() => {
    // Import dynamically to avoid SSR issues
    import('@zynlo/supabase').then(({ supabase }) => {
      // Subscribe to ticket changes
      const ticketSubscription = supabase
        .channel('inbox-tickets')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'tickets'
          },
          (payload) => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
            queryClient.invalidateQueries({ queryKey: ['tickets'] })
            
            // Handle specific events
            if (payload.eventType === 'INSERT') {
              console.log('New ticket created:', payload.new)
            }
          }
        )
        .subscribe()

      // Subscribe to message changes
      const messageSubscription = supabase
        .channel('inbox-messages')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages'
          },
          (payload) => {
            // Invalidate conversation queries
            queryClient.invalidateQueries({ queryKey: ['conversations'] })
            queryClient.invalidateQueries({ queryKey: ['messages'] })
          }
        )
        .subscribe()

      // Cleanup
      return () => {
        ticketSubscription.unsubscribe()
        messageSubscription.unsubscribe()
      }
    })
  }, [queryClient])
} 