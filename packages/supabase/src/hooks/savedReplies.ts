import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import type { Database } from '../types/database.types';

type SavedReply = Database['public']['Tables']['message_saved_replies']['Row'];
type SavedReplyInsert = Database['public']['Tables']['message_saved_replies']['Insert'];
type SavedReplyUpdate = Database['public']['Tables']['message_saved_replies']['Update'];

// Get saved replies for a user
export function useSavedReplies(userId: string, language?: string) {
  return useQuery({
    queryKey: ['saved-replies', userId, language],
    queryFn: async () => {
      let query = supabase
        .from('message_saved_replies')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('usage_count', { ascending: false });

      if (language) {
        query = query.eq('language', language);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
    enabled: !!userId,
  });
}

// Create saved reply
export function useCreateSavedReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (reply: SavedReplyInsert) => {
      const { data, error } = await supabase
        .from('message_saved_replies')
        .insert(reply)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-replies'] });
    },
  });
}

// Update saved reply
export function useUpdateSavedReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: SavedReplyUpdate }) => {
      const { data, error } = await supabase
        .from('message_saved_replies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['saved-replies'] });
    },
  });
}

// Delete saved reply
export function useDeleteSavedReply() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('message_saved_replies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-replies'] });
    },
  });
}

// Increment usage count
export function useIncrementSavedReplyUsage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data: reply, error: fetchError } = await supabase
        .from('message_saved_replies')
        .select('usage_count')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from('message_saved_replies')
        .update({ usage_count: (reply.usage_count || 0) + 1 })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-replies'] });
    },
  });
} 