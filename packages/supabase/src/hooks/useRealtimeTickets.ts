import { useEffect, useCallback } from 'react'
import { supabase } from '../client'
import type { Database } from '../types/database.types'

type Ticket = Database['public']['Tables']['tickets']['Row']

export function useRealtimeTickets(onNewTicket?: (ticket: Ticket) => void) {
  useEffect(() => {
    const channel = supabase
      .channel('tickets-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'tickets'
        },
        (payload) => {
          if (onNewTicket && payload.new) {
            onNewTicket(payload.new as Ticket)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onNewTicket])
}

export function useRealtimeTicketUpdates(ticketId?: string, onUpdate?: (ticket: Ticket) => void) {
  useEffect(() => {
    if (!ticketId) return

    const channel = supabase
      .channel(`ticket-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'tickets',
          filter: `id=eq.${ticketId}`
        },
        (payload) => {
          if (onUpdate && payload.new) {
            onUpdate(payload.new as Ticket)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [ticketId, onUpdate])
} 