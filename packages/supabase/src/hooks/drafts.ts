import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import type { Database } from '../types/database.types';

type MessageDraft = Database['public']['Tables']['message_drafts']['Row'];
type MessageDraftInsert = Database['public']['Tables']['message_drafts']['Insert'];
type MessageDraftUpdate = Database['public']['Tables']['message_drafts']['Update'];

// Get draft for a ticket
export function useMessageDraft(ticketId: string, userId: string) {
  return useQuery({
    queryKey: ['message-draft', ticketId, userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('message_drafts')
        .select('*')
        .eq('ticket_id', ticketId)
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    },
    enabled: !!ticketId && !!userId,
  });
}

// Save or update draft
export function useSaveMessageDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      userId,
      content,
      isInternal = false,
      contentType = 'text/html',
    }: {
      ticketId: string;
      userId: string;
      content: string;
      isInternal?: boolean;
      contentType?: string;
    }) => {
      // First check if draft exists
      const { data: existingDraft } = await supabase
        .from('message_drafts')
        .select('id')
        .eq('ticket_id', ticketId)
        .eq('user_id', userId)
        .single();

      if (existingDraft) {
        // Update existing draft
        const { data, error } = await supabase
          .from('message_drafts')
          .update({
            content,
            is_internal: isInternal,
            content_type: contentType,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingDraft.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new draft
        const { data, error } = await supabase
          .from('message_drafts')
          .insert({
            ticket_id: ticketId,
            user_id: userId,
            content,
            is_internal: isInternal,
            content_type: contentType,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['message-draft', variables.ticketId, variables.userId] 
      });
    },
  });
}

// Delete draft
export function useDeleteMessageDraft() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      ticketId,
      userId,
    }: {
      ticketId: string;
      userId: string;
    }) => {
      const { error } = await supabase
        .from('message_drafts')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['message-draft', variables.ticketId, variables.userId] 
      });
    },
  });
} 