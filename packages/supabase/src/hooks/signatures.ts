import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import type { Database } from '../types/database.types';

type UserSignature = Database['public']['Tables']['user_signatures']['Row'];
type UserSignatureInsert = Database['public']['Tables']['user_signatures']['Insert'];
type UserSignatureUpdate = Database['public']['Tables']['user_signatures']['Update'];

// Get user signature
export function useUserSignature(userId: string) {
  return useQuery({
    queryKey: ['user-signature', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_signatures')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = not found
      return data;
    },
    enabled: !!userId,
  });
}

// Create or update user signature
export function useSaveUserSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      greeting,
      name,
      imageUrl,
      footer,
      htmlContent,
      isActive = true,
    }: {
      userId: string;
      greeting?: string | null;
      name?: string | null;
      imageUrl?: string | null;
      footer?: string | null;
      htmlContent?: string | null;
      isActive?: boolean;
    }) => {
      // Check if signature exists
      const { data: existingSignature } = await supabase
        .from('user_signatures')
        .select('id')
        .eq('user_id', userId)
        .single();

      if (existingSignature) {
        // Update existing signature
        const { data, error } = await supabase
          .from('user_signatures')
          .update({
            greeting,
            name,
            image_url: imageUrl,
            footer,
            html_content: htmlContent,
            is_active: isActive,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSignature.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new signature
        const { data, error } = await supabase
          .from('user_signatures')
          .insert({
            user_id: userId,
            greeting,
            name,
            image_url: imageUrl,
            footer,
            html_content: htmlContent,
            is_active: isActive,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-signature', variables.userId] 
      });
    },
  });
}

// Delete user signature
export function useDeleteUserSignature() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('user_signatures')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ 
        queryKey: ['user-signature', userId] 
      });
    },
  });
} 