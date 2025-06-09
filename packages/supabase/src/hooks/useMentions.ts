import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import { useUser } from './useUser'

export interface MentionUser {
  id: string
  full_name: string | null
  email: string
  username: string
  avatar_url: string | null
}

export interface Mention {
  id: string
  message_id: string
  mentioned_user_id: string
  mentioned_by_user_id: string
  mention_text: string
  position_start: number
  position_end: number
  is_read: boolean
  created_at: string
}

// Hook to search users for @mention autocomplete
export function useMentionSearch(query: string, enabled = true) {
  return useQuery({
    queryKey: ['mention-search', query],
    queryFn: async () => {
      if (!query || query.length < 1) return []

      const response = await fetch(`/api/mentions/search?q=${encodeURIComponent(query)}&limit=10`)
      if (!response.ok) {
        throw new Error('Failed to search users')
      }

      const { users } = await response.json()
      return users as MentionUser[]
    },
    enabled: enabled && !!query && query.length >= 1,
    staleTime: 30000, // 30 seconds
    refetchOnWindowFocus: false,
  })
}

// Hook to get unread mentions for the current user
export function useUnreadMentions() {
  const { user } = useUser()

  return useQuery({
    queryKey: ['unread-mentions', user?.id],
    queryFn: async () => {
      if (!user) return []

      const { data: mentions, error } = await supabase
        .from('mentions')
        .select(`
          id,
          message_id,
          mentioned_user_id,
          mentioned_by_user_id,
          mention_text,
          is_read,
          created_at,
          messages!inner(
            content,
            sender_name,
            conversation_id,
            conversations!inner(
              ticket_id,
              tickets!inner(
                subject,
                number
              )
            )
          )
        `)
        .eq('mentioned_user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      return mentions || []
    },
    enabled: !!user,
    refetchInterval: 30000, // Refetch every 30 seconds
  })
}

// Hook to mark mentions as read
export function useMarkMentionsAsRead() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (messageIds?: string[]) => {
      if (!user) throw new Error('User not authenticated')

      const { data, error } = await supabase.rpc('mark_mentions_as_read', {
        p_user_id: user.id,
        p_message_ids: messageIds || null
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unread-mentions'] })
    },
  })
}

// Hook to get mention statistics
export function useMentionStats() {
  const { user } = useUser()

  return useQuery({
    queryKey: ['mention-stats', user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, unread: 0, today: 0 }

      const { data: mentions, error } = await supabase
        .from('mentions')
        .select('id, is_read, created_at')
        .eq('mentioned_user_id', user.id)

      if (error) throw error

      const total = mentions?.length || 0
      const unread = mentions?.filter(m => !m.is_read).length || 0
      const today = mentions?.filter(m => {
        const mentionDate = new Date(m.created_at)
        const todayDate = new Date()
        return (
          mentionDate.getDate() === todayDate.getDate() &&
          mentionDate.getMonth() === todayDate.getMonth() &&
          mentionDate.getFullYear() === todayDate.getFullYear()
        )
      }).length || 0

      return { total, unread, today }
    },
    enabled: !!user,
    staleTime: 60000, // 1 minute
  })
}

// Utility function to parse mentions from text
export function parseMentions(text: string): { start: number; end: number; username: string }[] {
  const mentionPattern = /@(\w+)/g
  const mentions: { start: number; end: number; username: string }[] = []
  let match

  while ((match = mentionPattern.exec(text)) !== null) {
    mentions.push({
      start: match.index,
      end: match.index + match[0].length,
      username: match[1]
    })
  }

  return mentions
}

// Utility function to replace mentions with highlighted elements
export function highlightMentions(
  text: string, 
  className = 'bg-blue-100 text-blue-800 px-1 rounded'
): string {
  return text.replace(
    /@(\w+)/g,
    `<span class="${className}">@$1</span>`
  )
}

// Hook for real-time mention notifications
export function useRealtimeMentions() {
  const { user } = useUser()
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['realtime-mentions', user?.id],
    queryFn: async () => {
      if (!user) return null

      const channel = supabase
        .channel('user-mentions')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mentions',
            filter: `mentioned_user_id=eq.${user.id}`
          },
          () => {
            // Invalidate queries when new mentions are received
            queryClient.invalidateQueries({ queryKey: ['unread-mentions'] })
            queryClient.invalidateQueries({ queryKey: ['mention-stats'] })
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(channel)
      }
    },
    enabled: !!user,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
} 