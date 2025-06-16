import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { authManager } from '../auth-manager';
import type { Database } from '../types/database.types';

/**
 * Hook to check if tickets are unread for the current user
 */
export function useTicketUnreadStatus(ticketIds: string[]) {
  return useQuery({
    queryKey: ['ticket-unread-status', ticketIds],
    queryFn: async () => {
      if (!ticketIds.length) return [];

      // Get current user safely using auth manager
      const user = await authManager.getCurrentUser();
      if (!user) return [];

      // Check which tickets are unread by querying ticket_read_status
      const { data: readStatuses, error } = await supabase
        .from('ticket_read_status')
        .select('ticket_id')
        .eq('user_id', user.id)
        .in('ticket_id', ticketIds);

      if (error) {
        console.error('Error fetching read status:', error);
        return [];
      }

      // Create set of read ticket IDs for fast lookup
      const readTicketIds = new Set(readStatuses?.map((rs) => rs.ticket_id) || []);

      // Return array of unread status for each ticket
      return ticketIds.map((ticketId) => ({
        ticketId,
        isUnread: !readTicketIds.has(ticketId),
      }));
    },
    enabled: ticketIds.length > 0,
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to get unread ticket count for the current user
 */
export function useUnreadTicketCount() {
  return useQuery({
    queryKey: ['unread-ticket-count'],
    queryFn: async () => {
      // Get current user safely using auth manager
      const user = await authManager.getCurrentUser();
      if (!user) return 0;

      // Get total ticket count
      const { count: totalTickets, error: totalError } = await supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
        .neq('is_spam', true); // Exclude spam tickets

      if (totalError) {
        console.error('Error getting total ticket count:', totalError);
        return 0;
      }

      // Get read ticket count for this user
      const { count: readTickets, error: readError } = await supabase
        .from('ticket_read_status')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      if (readError) {
        console.error('Error getting read ticket count:', readError);
        return 0;
      }

      return (totalTickets || 0) - (readTickets || 0);
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // Cache for 30 seconds
  });
}

/**
 * Hook to mark a ticket as read for the current user
 */
export function useMarkTicketAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketId: string) => {
      const { error } = await supabase.rpc('mark_ticket_as_read', {
        ticket_id_param: ticketId,
      });

      if (error) {
        console.error('Error marking ticket as read:', error);
        throw error;
      }

      return ticketId;
    },
    onSuccess: (ticketId) => {
      // Invalidate related queries to update unread status
      queryClient.invalidateQueries({ queryKey: ['ticket-unread-status'] });
      queryClient.invalidateQueries({ queryKey: ['unread-ticket-count'] });

      // Update specific ticket unread status in cache
      queryClient.setQueryData(['ticket-unread-status'], (old: any) => {
        if (!old) return old;
        return old.map((item: any) =>
          item.ticketId === ticketId ? { ...item, isUnread: false } : item
        );
      });
    },
    onError: (error) => {
      console.error('Failed to mark ticket as read:', error);
    },
  });
}

/**
 * Hook to mark multiple tickets as read for the current user
 */
export function useMarkTicketsAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      // Mark each ticket as read
      const promises = ticketIds.map((ticketId) =>
        supabase.rpc('mark_ticket_as_read', {
          ticket_id_param: ticketId,
        })
      );

      const results = await Promise.allSettled(promises);

      // Check for any failures
      const failures = results.filter((r) => r.status === 'rejected');
      if (failures.length > 0) {
        console.error('Some tickets failed to be marked as read:', failures);
      }

      return ticketIds;
    },
    onSuccess: (ticketIds) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['ticket-unread-status'] });
      queryClient.invalidateQueries({ queryKey: ['unread-ticket-count'] });
    },
    onError: (error) => {
      console.error('Failed to mark tickets as read:', error);
    },
  });
}
