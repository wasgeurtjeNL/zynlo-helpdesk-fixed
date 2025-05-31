import { useEffect, useState, useCallback, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import { useUser } from './useUser'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

export interface UserPresence {
  user_id: string
  status: PresenceStatus
  last_seen: string
  current_page?: string
  current_ticket_id?: string
  metadata?: Record<string, any>
}

export interface TypingIndicator {
  user_id: string
  ticket_id: string
  is_typing: boolean
  started_at: string
  expires_at: string
}

export interface CollaborationActivity {
  id: string
  user_id: string
  ticket_id?: string
  activity_type: 'viewing' | 'editing' | 'commenting' | 'status_change' | 'assignment'
  activity_data: Record<string, any>
  created_at: string
}

// Hook for managing user's own presence
export function usePresence() {
  const { user } = useUser()
  const queryClient = useQueryClient()
  const [status, setStatus] = useState<PresenceStatus>('online')
  const presenceChannelRef = useRef<RealtimeChannel | null>(null)
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update presence in database
  const updatePresence = useCallback(async (
    newStatus: PresenceStatus,
    currentPage?: string,
    currentTicketId?: string,
    metadata?: Record<string, any>
  ) => {
    if (!user) return

    const { error } = await supabase.rpc('update_user_presence', {
      p_user_id: user.id,
      p_status: newStatus,
      p_current_page: currentPage,
      p_current_ticket_id: currentTicketId,
      p_metadata: metadata || {}
    })

    if (!error) {
      setStatus(newStatus)
      queryClient.invalidateQueries({ queryKey: ['presence'] })
    }
  }, [user, queryClient])

  // Set up presence tracking
  useEffect(() => {
    if (!user) return

    // Initial presence update
    updatePresence('online', window.location.pathname)

    // Set up heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      updatePresence(status, window.location.pathname)
    }, 30000) // Every 30 seconds

    // Set up visibility change detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        updatePresence('away')
      } else {
        updatePresence('online')
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Set up beforeunload
    const handleBeforeUnload = () => {
      updatePresence('offline')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    // Cleanup
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      updatePresence('offline')
    }
  }, [user, status, updatePresence])

  return {
    status,
    updatePresence,
    setStatus: (newStatus: PresenceStatus) => updatePresence(newStatus)
  }
}

// Hook for tracking presence of other users
export function useUsersPresence(userIds?: string[]) {
  const [presenceMap, setPresenceMap] = useState<Map<string, UserPresence>>(new Map())
  const channelRef = useRef<RealtimeChannel | null>(null)

  useEffect(() => {
    // Subscribe to presence changes
    channelRef.current = supabase.channel('presence-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            const presence = payload.new as UserPresence
            if (!userIds || userIds.includes(presence.user_id)) {
              setPresenceMap(prev => new Map(prev).set(presence.user_id, presence))
            }
          } else if (payload.eventType === 'DELETE') {
            const presence = payload.old as UserPresence
            setPresenceMap(prev => {
              const newMap = new Map(prev)
              newMap.delete(presence.user_id)
              return newMap
            })
          }
        }
      )
      .subscribe()

    // Fetch initial presence data
    const fetchPresence = async () => {
      let query = supabase
        .from('user_presence')
        .select('*')
        .neq('status', 'offline')

      if (userIds && userIds.length > 0) {
        query = query.in('user_id', userIds)
      }

      const { data, error } = await query

      if (!error && data) {
        const newMap = new Map<string, UserPresence>()
        data.forEach(presence => {
          newMap.set(presence.user_id, presence)
        })
        setPresenceMap(newMap)
      }
    }

    fetchPresence()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [userIds?.join(',')])

  return presenceMap
}

// Hook for managing typing indicators
export function useTypingIndicator(ticketId?: string) {
  const { user } = useUser()
  const [typingUsers, setTypingUsers] = useState<Map<string, TypingIndicator>>(new Map())
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)

  // Send typing indicator
  const sendTypingIndicator = useCallback(async (isTyping: boolean) => {
    if (!user || !ticketId) return

    if (isTyping) {
      const { error } = await supabase
        .from('typing_indicators')
        .upsert({
          user_id: user.id,
          ticket_id: ticketId,
          is_typing: true,
          started_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 30000).toISOString() // 30 seconds
        })

      if (!error) {
        // Clear existing timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }

        // Set timeout to stop typing
        typingTimeoutRef.current = setTimeout(() => {
          sendTypingIndicator(false)
        }, 10000) // Stop after 10 seconds of no activity
      }
    } else {
      await supabase
        .from('typing_indicators')
        .delete()
        .eq('user_id', user.id)
        .eq('ticket_id', ticketId)

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [user, ticketId])

  // Subscribe to typing indicators
  useEffect(() => {
    if (!ticketId) return

    channelRef.current = supabase.channel(`typing-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'typing_indicators',
          filter: `ticket_id=eq.${ticketId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const indicator = payload.new as TypingIndicator
            if (indicator.user_id !== user?.id) {
              setTypingUsers(prev => new Map(prev).set(indicator.user_id, indicator))
            }
          } else if (payload.eventType === 'DELETE') {
            const indicator = payload.old as TypingIndicator
            setTypingUsers(prev => {
              const newMap = new Map(prev)
              newMap.delete(indicator.user_id)
              return newMap
            })
          }
        }
      )
      .subscribe()

    // Clean up expired indicators periodically
    const cleanupInterval = setInterval(() => {
      setTypingUsers(prev => {
        const newMap = new Map(prev)
        const now = new Date()
        for (const [userId, indicator] of newMap) {
          if (new Date(indicator.expires_at) < now) {
            newMap.delete(userId)
          }
        }
        return newMap
      })
    }, 5000) // Every 5 seconds

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
      clearInterval(cleanupInterval)
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [ticketId, user?.id])

  return {
    typingUsers,
    sendTypingIndicator
  }
}

// Hook for ticket active users
export function useTicketActiveUsers(ticketId?: string) {
  return useQuery({
    queryKey: ['ticket-active-users', ticketId],
    queryFn: async () => {
      if (!ticketId) return []

      const { data, error } = await supabase.rpc('get_ticket_active_users', {
        p_ticket_id: ticketId
      })

      if (error) throw error
      return data || []
    },
    enabled: !!ticketId,
    refetchInterval: 30000 // Refresh every 30 seconds
  })
}

// Hook for collaboration activity
export function useCollaborationActivity(ticketId?: string, limit = 50) {
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [activities, setActivities] = useState<CollaborationActivity[]>([])

  // Fetch activities
  const { data, isLoading } = useQuery({
    queryKey: ['collaboration-activity', ticketId, limit],
    queryFn: async () => {
      let query = supabase
        .from('collaboration_activity')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (ticketId) {
        query = query.eq('ticket_id', ticketId)
      }

      const { data, error } = await query

      if (error) throw error
      return data || []
    },
    onSuccess: (data) => {
      setActivities(data)
    }
  })

  // Subscribe to new activities
  useEffect(() => {
    const filters: any = {
      event: 'INSERT',
      schema: 'public',
      table: 'collaboration_activity'
    }

    if (ticketId) {
      filters.filter = `ticket_id=eq.${ticketId}`
    }

    channelRef.current = supabase.channel('collaboration-activity')
      .on('postgres_changes', filters, (payload) => {
        const newActivity = payload.new as CollaborationActivity
        setActivities(prev => [newActivity, ...prev].slice(0, limit))
      })
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [ticketId, limit])

  return {
    activities,
    isLoading
  }
}

// Hook for logging collaboration activity
export function useLogActivity() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      ticketId,
      activityType,
      activityData
    }: {
      ticketId?: string
      activityType: CollaborationActivity['activity_type']
      activityData: Record<string, any>
    }) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase
        .from('collaboration_activity')
        .insert({
          user_id: user.id,
          ticket_id: ticketId,
          activity_type: activityType,
          activity_data: activityData
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaboration-activity'] })
    }
  })
} 