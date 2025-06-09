import { useQuery } from '@tanstack/react-query'
import { supabase } from '../client'

export function useEmailChannels() {
  return useQuery({
    queryKey: ['email-channels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('id, name, email_address, type, is_active')
        .eq('type', 'email')
        .eq('is_active', true)
        .order('name')

      if (error) throw error

      // Filter out channels without email addresses
      return data?.filter(channel => channel.email_address) || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
} 