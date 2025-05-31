import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import type { Database } from '../types/database.types'

type Label = Database['public']['Tables']['labels']['Row']

export function useLabels() {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('labels')
        .select('*')
        .order('name')

      if (error) {
        console.error('Error fetching labels:', error)
        throw error
      }

      return data as Label[]
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  })
}

export function useTicketLabels(ticketId: string) {
  return useQuery({
    queryKey: ['ticket-labels', ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ticket_labels')
        .select(`
          label_id,
          label:labels(*)
        `)
        .eq('ticket_id', ticketId)

      if (error) {
        console.error('Error fetching ticket labels:', error)
        throw error
      }

      return data?.map(item => item.label).filter(Boolean) || []
    },
    enabled: !!ticketId,
  })
}

export function useAssignLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, labelId }: { ticketId: string; labelId: string }) => {
      const { error } = await supabase
        .from('ticket_labels')
        .insert({
          ticket_id: ticketId,
          label_id: labelId,
        })

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-labels', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['labels-with-counts'] })
    },
  })
}

export function useRemoveLabel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ ticketId, labelId }: { ticketId: string; labelId: string }) => {
      const { error } = await supabase
        .from('ticket_labels')
        .delete()
        .eq('ticket_id', ticketId)
        .eq('label_id', labelId)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['ticket-labels', variables.ticketId] })
      queryClient.invalidateQueries({ queryKey: ['labels-with-counts'] })
    },
  })
} 