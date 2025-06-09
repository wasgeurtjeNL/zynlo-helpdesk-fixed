import { useQuery } from '@tanstack/react-query'
import { supabase } from '../client'

interface TicketCounts {
  new: number
  open: number
  pending: number
  resolved: number
  closed: number
  spam: number
  total: number
  assigned_to_me: number
  unassigned: number
  favorites: number
  mentions: number
}

export function useTicketCounts() {
  return useQuery({
    queryKey: ['ticket-counts'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Get all counts using the updated stored procedure
      const { data: counts, error } = await supabase
        .rpc('get_inbox_counts', { p_user_id: user.id })

      if (error) {
        console.error('Error fetching ticket counts:', error)
        throw error
      }

      return {
        new: counts?.new || 0,
        open: counts?.open || 0,
        pending: counts?.pending || 0,
        resolved: counts?.resolved || 0,
        closed: counts?.closed || 0,
        spam: counts?.spam || 0,
        total: counts?.total || 0,
        assigned_to_me: counts?.assigned_to_me || 0,
        unassigned: counts?.unassigned || 0,
        favorites: counts?.favorites || 0,
        mentions: counts?.mentions || 0,
      } as TicketCounts
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
    retry: 1,
  })
} 