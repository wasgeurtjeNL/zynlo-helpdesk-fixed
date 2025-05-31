import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../client';
import { Json } from '../types/database.types';

interface AIUsageStatus {
  allowed: boolean;
  is_premium: boolean;
  requests_used: number;
  requests_limit: number;
  tokens_used: number;
  tokens_limit: number;
}

interface RecordAIUsageParams {
  userId: string;
  ticketId: string;
  prompt: string;
  response: string;
  modelUsed: string;
  tokensUsed: number;
  costCents: number;
}

// Check if user can use AI suggestions
export function useCheckAIUsage(userId: string | undefined) {
  return useQuery<AIUsageStatus>({
    queryKey: ['ai-usage-allowed', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase.rpc('check_ai_usage_allowed', {
        p_user_id: userId
      });
      
      if (error) throw error;
      return data as unknown as AIUsageStatus;
    },
    enabled: !!userId,
    staleTime: 60 * 1000, // Cache for 1 minute
    refetchInterval: 60 * 1000, // Refetch every minute
  });
}

// Record AI usage
export function useRecordAIUsage() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (params: RecordAIUsageParams) => {
      const { data, error } = await supabase.rpc('record_ai_usage', {
        p_user_id: params.userId,
        p_ticket_id: params.ticketId,
        p_prompt: params.prompt,
        p_response: params.response,
        p_model_used: params.modelUsed,
        p_tokens_used: params.tokensUsed,
        p_cost_cents: params.costCents
      });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      // Invalidate usage status to get fresh data
      queryClient.invalidateQueries({ 
        queryKey: ['ai-usage-allowed', variables.userId] 
      });
    },
  });
}

// Get AI usage history
export function useAIUsageHistory(userId: string | undefined) {
  return useQuery({
    queryKey: ['ai-usage-history', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('ai_usage')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Get monthly usage summary
export function useAIUsageSummary(userId: string | undefined) {
  return useQuery({
    queryKey: ['ai-usage-summary', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('ai_usage_summary')
        .select('*')
        .eq('user_id', userId)
        .order('month', { ascending: false })
        .limit(12); // Last 12 months
      
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

// Get user AI limits
export function useUserAILimits(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-ai-limits', userId],
    queryFn: async () => {
      if (!userId) throw new Error('User ID is required');
      
      const { data, error } = await supabase
        .from('user_ai_limits')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // No limits found, return defaults
          return {
            monthly_token_limit: 10000,
            monthly_request_limit: 100,
            is_premium: false,
            premium_expires_at: null
          };
        }
        throw error;
      }
      return data;
    },
    enabled: !!userId,
  });
} 