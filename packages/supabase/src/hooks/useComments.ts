import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import { useUser } from './useUser'

export interface Comment {
  id: string
  content: string
  sender_type: 'agent' | 'customer' | 'system'
  sender_id: string
  sender_name: string
  created_at: string
  conversation_id: string
  conversations?: {
    ticket_id: string
  }
}

// Hook to fetch internal comments for a ticket
export function useTicketComments(ticketId?: string) {
  return useQuery({
    queryKey: ['ticket-comments', ticketId],
    queryFn: async () => {
      if (!ticketId) return []

      const response = await fetch(`/api/tickets/${ticketId}/comments`)
      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      const { comments } = await response.json()
      return comments as Comment[]
    },
    enabled: !!ticketId,
    refetchOnWindowFocus: false,
    staleTime: 30000, // 30 seconds
  })
}

// Hook to add a new internal comment
export function useAddComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, content }: { ticketId: string; content: string }) => {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add comment')
      }

      const { comment } = await response.json()
      return comment as Comment
    },
    onSuccess: (_, { ticketId }) => {
      // Invalidate and refetch comments for this ticket
      queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] })
    },
  })
}

// Hook to watch for real-time comment updates
export function useRealtimeComments(ticketId?: string) {
  const queryClient = useQueryClient()

  // Set up real-time subscription for new comments
  // This relies on the collaboration_activity table for notifications
  useQuery({
    queryKey: ['realtime-comments', ticketId],
    queryFn: async () => {
      if (!ticketId) return null

      // Subscribe to collaboration activity for this ticket
      const channel = supabase
        .channel(`comments-${ticketId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `is_internal=eq.true`
          },
          (payload) => {
            // Check if this message belongs to our ticket
            // We need to verify the ticket relationship through conversation
            if (payload.new) {
              queryClient.invalidateQueries({ queryKey: ['ticket-comments', ticketId] })
            }
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    },
    enabled: !!ticketId,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

// Hook to get comment statistics for a ticket
export function useCommentStats(ticketId?: string) {
  return useQuery({
    queryKey: ['comment-stats', ticketId],
    queryFn: async () => {
      if (!ticketId) return { total: 0, recent: 0 }

      const { data: comments } = await supabase
        .from('messages')
        .select(`
          id,
          created_at,
          conversations!inner(ticket_id)
        `)
        .eq('conversations.ticket_id', ticketId)
        .eq('is_internal', true)

      if (!comments) return { total: 0, recent: 0 }

      const total = comments.length
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
      const recent = comments.filter(
        comment => new Date(comment.created_at) > oneDayAgo
      ).length

      return { total, recent }
    },
    enabled: !!ticketId,
    staleTime: 60000, // 1 minute
  })
} 