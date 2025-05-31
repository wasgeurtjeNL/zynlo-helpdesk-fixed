import { useQuery } from '@tanstack/react-query'
import { supabase } from '../client'
import type { Database } from '../types/database.types'

type User = Database['public']['Tables']['users']['Row']

export function useUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching users:', error)
        throw error
      }

      return data as User[]
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
} 