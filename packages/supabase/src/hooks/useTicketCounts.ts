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
}

export function useTicketCounts() {
  return useQuery({
    queryKey: ['ticket-counts'],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('No user found')

      // Get inbox counts using the stored procedure
      const { data: inboxCounts, error: inboxError } = await supabase
        .rpc('get_inbox_counts', { p_user_id: user.id })

      if (inboxError) throw inboxError

      // Get total tickets count
      const { count: totalCount, error: totalError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })

      if (totalError) throw totalError

      // Get assigned to me count
      const { count: assignedCount, error: assignedError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .eq('assignee_id', user.id)
        .in('status', ['new', 'open', 'pending'])

      if (assignedError) throw assignedError

      // Get unassigned count
      const { count: unassignedCount, error: unassignedError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .is('assignee_id', null)
        .in('status', ['new', 'open'])

      if (unassignedError) throw unassignedError

      // Get favorites count
      const { count: favoritesCount, error: favoritesError } = await supabase
        .from('user_favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (favoritesError) throw favoritesError

      return {
        new: inboxCounts?.new || 0,
        open: inboxCounts?.open || 0,
        pending: inboxCounts?.pending || 0,
        resolved: inboxCounts?.resolved || 0,
        closed: inboxCounts?.closed || 0,
        spam: inboxCounts?.spam || 0,
        total: totalCount || 0,
        assigned_to_me: assignedCount || 0,
        unassigned: unassignedCount || 0,
        favorites: favoritesCount || 0,
      } as TicketCounts
    },
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
} 