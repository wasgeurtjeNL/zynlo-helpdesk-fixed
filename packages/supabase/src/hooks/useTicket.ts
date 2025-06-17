import { useQuery, useQueryClient } from '@tanstack/react-query';
import { createClient } from '../client';
import { useEffect } from 'react';
import type { Database } from '../types/database.types';

const supabase = createClient();

export function useTicket(ticketNumber: number) {
  const queryClient = useQueryClient();

  const ticketQuery = useQuery({
    queryKey: ['ticket', ticketNumber],
    queryFn: async () => {
      try {
        console.log('Fetching ticket data for ticket number:', ticketNumber);

        // First get the ticket
        const { data: ticket, error: ticketError } = await supabase
          .from('tickets')
          .select(
            `
            *,
            customer:customer_id(id, name, email, phone),
            assignee:assignee_id(id, email, full_name),
            team:team_id(id, name)
          `
          )
          .eq('number', ticketNumber)
          .single();

        if (ticketError) {
          console.error('Error fetching ticket:', ticketError);
          throw ticketError;
        }

        // Get the conversation ID
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('*')
          .eq('ticket_id', ticket.id)
          .single();

        if (convError && convError.code !== 'PGRST116') {
          // PGRST116 = no rows returned
          console.error('Error fetching conversation:', convError);
          // Don't throw, just continue without conversation
        }

        let processedMessages: any[] = [];

        // If we have a conversation, get its messages
        if (conversation) {
          const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select(
              `
              id,
              content,
              content_type,
              sender_type,
              sender_id,
              attachments,
              is_internal,
              created_at,
              metadata
            `
            )
            .eq('conversation_id', conversation.id)
            .order('created_at', { ascending: true });

          if (msgError) {
            console.error('Error fetching messages:', msgError);
          } else if (messages) {
            // Process messages to use originalHtml if available
            processedMessages = messages.map((message: any) => {
              // If we have originalHtml in metadata, use that
              if (message.metadata?.originalHtml) {
                return {
                  ...message,
                  content: message.metadata.originalHtml,
                  content_type: 'text/html',
                };
              }
              return message;
            });
          }
        }

        const ticketWithDetails = {
          ...ticket,
          conversation: conversation || null,
          messages: processedMessages,
        };

        return ticketWithDetails;
      } catch (error) {
        console.error('Error in ticketQuery:', error);
        throw error;
      }
    },
    // More aggressive refetch strategy to prevent stale data
    staleTime: 1000 * 30, // 30 seconds instead of 5 minutes
    gcTime: 1000 * 60 * 5, // 5 minutes instead of 10
    refetchOnMount: true, // Always refetch on mount
    refetchOnWindowFocus: true, // Enable refetch on window focus
    refetchInterval: false, // No automatic polling
    retry: 2, // Retry failed requests twice
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Add realtime subscription for ticket updates
  useEffect(() => {
    if (!ticketQuery.data?.id) return;

    const ticketId = ticketQuery.data.id;
    const conversationId = ticketQuery.data.conversation?.id;

    console.log('Setting up realtime subscription for ticket:', ticketId);

    // Subscribe to ticket updates
    const ticketChannel = supabase.channel(`ticket-${ticketNumber}-updates`).on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
        filter: `id=eq.${ticketId}`,
      },
      (payload) => {
        console.log('Ticket update received:', payload);
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
      }
    );

    // Subscribe to message updates if we have a conversation
    if (conversationId) {
      ticketChannel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log('Message update received:', payload);
          queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
        }
      );
    }

    // Subscribe to conversation updates
    ticketChannel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
        filter: `ticket_id=eq.${ticketId}`,
      },
      (payload) => {
        console.log('Conversation update received:', payload);
        queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] });
      }
    );

    // Subscribe
    ticketChannel.subscribe((status) => {
      console.log('Realtime subscription status:', status);
    });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(ticketChannel);
    };
  }, [ticketQuery.data?.id, ticketQuery.data?.conversation?.id, ticketNumber, queryClient]);

  return ticketQuery;
}
