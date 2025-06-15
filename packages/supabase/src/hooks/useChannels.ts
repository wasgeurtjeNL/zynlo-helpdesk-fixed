import { useQuery } from '@tanstack/react-query'
import { supabase } from '../client'

export function useEmailChannels() {
  return useQuery({
    queryKey: ['email-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, name, type, is_active, settings')
        .eq('type', 'email')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      // Transform data to include email_address from settings and filter out channels without email addresses
      return data?.map(channel => ({
        ...channel,
        email_address: (channel.settings as any)?.email_address
      })).filter(channel => channel.email_address) || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
} 