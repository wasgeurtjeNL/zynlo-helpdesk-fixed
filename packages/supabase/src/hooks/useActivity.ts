import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { supabase } from '../client'
import { useUser } from './useUser'

export interface ActivityLog {
  id: string
  user_id: string | null
  user_name: string | null
  action_type: string
  description: string
  action_data: Record<string, any>
  metadata: Record<string, any>
  created_at: string
}

export interface Notification {
  id: string
  type: string
  title: string
  message: string
  action_url: string | null
  data: Record<string, any>
  is_read: boolean
  is_seen: boolean
  created_at: string
  ticket_id: string | null
  tickets?: {
    number: number
    subject: string
  }
  related_user_id: string | null
  users?: {
    full_name: string | null
    email: string
  }
}

export interface NotificationStats {
  total_count: number
  unread_count: number
  unseen_count: number
}

interface ActivityResponse {
  activities: ActivityLog[]
  pagination: any
}

interface NotificationResponse {
  notifications: Notification[]
  stats: NotificationStats
  pagination: any
}

// Hook to get activity feed for a ticket
export function useTicketActivity(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-activity', ticketId],
    queryFn: async (): Promise<ActivityResponse> => {
      const response = await fetch(`/api/tickets/${ticketId}/activity`)
      if (!response.ok) throw new Error('Failed to fetch activity')
      return response.json() as Promise<ActivityResponse>
    },
    enabled: !!ticketId,
  })
}

// Hook to create activity log entry
export function useCreateActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      ticketId: string
      actionType: string
      description: string
      actionData?: Record<string, any>
      metadata?: Record<string, any>
    }) => {
      const response = await fetch(`/api/tickets/${params.ticketId}/activity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          actionType: params.actionType,
          description: params.description,
          actionData: params.actionData || {},
          metadata: params.metadata || {}
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create activity log')
      }

      return response.json()
    },
    onSuccess: (data, variables) => {
      // Invalidate activity feed for the ticket
      queryClient.invalidateQueries({ 
        queryKey: ['ticket-activity', variables.ticketId] 
      })
    },
  })
}

// Hook to get user notifications
export function useNotifications() {
  const { user } = useUser()

  return useQuery({
    queryKey: ['notifications', user?.id],
    queryFn: async (): Promise<NotificationResponse> => {
      // Double-check user is authenticated before making API call
      if (!user?.id) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/notifications')
      
      if (response.status === 401) {
        // Don't retry on auth failures, just return empty data
        console.warn('[useNotifications] Authentication failed - user may need to refresh')
        return {
          notifications: [],
          stats: { total_count: 0, unread_count: 0, unseen_count: 0 },
          pagination: { limit: 20, offset: 0, hasMore: false }
        } as NotificationResponse
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.status}`)
      }

      return response.json() as Promise<NotificationResponse>
    },
    enabled: !!user?.id, // Only run when user is authenticated
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        return false
      }
      // Only retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
    refetchInterval: 30000, // Refetch every 30 seconds
    refetchIntervalInBackground: false, // Don't refetch when tab is not active
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

// Hook to get notification stats only
export function useNotificationStats() {
  const { user } = useUser()

  return useQuery({
    queryKey: ['notification-stats', user?.id],
    queryFn: async () => {
      // Double-check user is authenticated before making API call
      if (!user) {
        throw new Error('User not authenticated')
      }

      const response = await fetch('/api/notifications?limit=0')
      
      if (response.status === 401) {
        // Specifically handle 401 errors to avoid spam
        throw new Error('Authentication expired - please refresh the page')
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch notification stats: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      return (data as { stats: NotificationStats }).stats
    },
    enabled: !!user,
    refetchInterval: 15000, // Refetch every 15 seconds
    staleTime: 10000, // 10 seconds
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error?.message?.includes('Authentication expired') || error?.message?.includes('401')) {
        return false
      }
      // Retry up to 2 times for other errors
      return failureCount < 2
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  })
}

// Hook to mark notifications as read
export function useMarkNotificationsAsRead() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: { notificationIds?: string[]; markAll?: boolean }) => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'read',
          notificationIds: params.notificationIds,
          markAll: params.markAll || false
        }),
      })
      if (!response.ok) throw new Error('Failed to mark as read')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

// Hook to mark notifications as seen
export function useMarkNotificationsAsSeen() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'seen',
          notificationIds
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to mark notifications as seen')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })
}

// Hook to create notifications (system use)
export function useCreateNotification() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      userId: string
      type: string
      title: string
      message: string
      actionUrl?: string
      data?: Record<string, any>
      ticketId?: string
      relatedUserId?: string
    }) => {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
      })

      if (!response.ok) {
        throw new Error('Failed to create notification')
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['notification-stats'] })
    },
  })
}

// Hook for real-time activity updates
export function useRealtimeActivity(ticketId: string) {
  const { user } = useUser()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user || !ticketId) return

    const channel = supabase
      .channel(`activity:${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
          filter: `ticket_id=eq.${ticketId}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['ticket-activity', ticketId] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, ticketId, queryClient])
}

// Hook for real-time notification updates
export function useRealtimeNotifications() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!user) return

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, queryClient])
}

// Utility function to format activity descriptions
export function formatActivityDescription(activity: ActivityLog): string {
  const { action_type, description, action_data } = activity

  switch (action_type) {
    case 'status_changed':
      return `Status gewijzigd van ${action_data.old_status} naar ${action_data.new_status}`
    case 'assigned':
      return action_data.new_assignee_id 
        ? `Toegewezen aan ${activity.user_name}`
        : 'Niet meer toegewezen'
    case 'priority_changed':
      return `Prioriteit gewijzigd van ${action_data.old_priority} naar ${action_data.new_priority}`
    case 'commented':
      return 'Reactie toegevoegd'
    case 'mentioned':
      return `@${activity.user_name} getagd in reactie`
    default:
      return description
  }
}

// Utility function to get activity icon
export function getActivityIcon(actionType: string): string {
  switch (actionType) {
    case 'created': return '🎫'
    case 'status_changed': return '🔄'
    case 'assigned': return '👤'
    case 'priority_changed': return '⚡'
    case 'commented': return '💬'
    case 'mentioned': return '@'
    case 'updated': return '✏️'
    default: return '📝'
  }
} 