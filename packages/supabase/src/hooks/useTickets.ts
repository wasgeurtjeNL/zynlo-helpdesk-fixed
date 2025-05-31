import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import type { Database } from '../types/database.types'

type Ticket = Database['public']['Tables']['tickets']['Row']
type TicketWithRelations = Ticket & {
  customer: Database['public']['Tables']['customers']['Row'] | null
  assignee: Database['public']['Tables']['users']['Row'] | null
  messages: Array<{
    id: string
    content: string
    content_type?: string | null
    created_at: string
    sender_type?: string
    sender_id?: string
    attachments?: any
    is_internal?: boolean
    metadata?: any
  }>
  last_message?: {
    id: string
    content: string
    content_type?: string | null
    created_at: string
    sender_type?: string
    sender_id?: string
    sender_name?: string | null
    is_internal?: boolean
  } | null
}

interface UseTicketsParams {
  status?: Database['public']['Enums']['ticket_status']
  page?: number
  pageSize?: number
  isSpam?: boolean
}

interface PaginatedTicketsResponse {
  tickets: TicketWithRelations[]
  totalCount: number
  currentPage: number
  totalPages: number
}

export function useTickets({ status, page = 1, pageSize = 25, isSpam }: UseTicketsParams = {}) {
  return useQuery({
    queryKey: ['tickets', status, page, pageSize, isSpam],
    queryFn: async () => {
      // Calculate offset based on page
      const offset = (page - 1) * pageSize

      // First, get total count
      let countQuery = supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
      
      if (status) {
        countQuery = countQuery.eq('status', status)
      }

      // Add spam filtering
      if (isSpam !== undefined) {
        countQuery = countQuery.eq('is_spam', isSpam)
      }

      const { count: totalCount } = await countQuery

      // Then get tickets with relations
      let query = supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_id(id, name, email),
          assignee:assignee_id(id, email, full_name)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + pageSize - 1)

      if (status) {
        query = query.eq('status', status)
      }

      // Add spam filtering
      if (isSpam !== undefined) {
        query = query.eq('is_spam', isSpam)
      }

      const { data: tickets, error } = await query

      if (error) {
        console.error('Error fetching tickets:', error)
        throw error
      }

      // Get last message for each ticket
      const ticketsWithMessages = await Promise.all(
        (tickets || []).map(async (ticket) => {
          // First get the conversation for this ticket
          const { data: conversation } = await supabase
            .from('conversations')
            .select('id')
            .eq('ticket_id', ticket.id)
            .single()
          
          let messages: any[] = []
          if (conversation) {
            // Then get messages for this conversation
            const { data: messagesData } = await supabase
              .from('messages')
              .select('*')
              .eq('conversation_id', conversation.id)
              .order('created_at', { ascending: false })
              .limit(1)
            
            messages = messagesData || []
          }
          
          return {
            ...ticket,
            messages: messages,
            last_message: messages?.[0] || null
          }
        })
      )

      const totalPages = Math.ceil((totalCount || 0) / pageSize)

      return {
        tickets: ticketsWithMessages as TicketWithRelations[],
        totalCount: totalCount || 0,
        currentPage: page,
        totalPages
      } as PaginatedTicketsResponse
    },
    retry: 1,
    refetchInterval: 30000, // Refetch every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      subject: string
      content: string
      customerEmail: string
      customerName: string
      channel: Database['public']['Enums']['channel_type']
      priority?: Database['public']['Enums']['ticket_priority']
    }) => {
      const { data, error } = await supabase.rpc('create_ticket_with_message', {
        p_subject: params.subject,
        p_content: params.content,
        p_customer_email: params.customerEmail,
        p_customer_name: params.customerName,
        p_channel: params.channel,
        p_priority: params.priority || 'normal',
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useInboxCounts(userId: string) {
  return useQuery({
    queryKey: ['inbox-counts', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_inbox_counts', {
        p_user_id: userId,
      })

      if (error) {
        console.error('Error fetching inbox counts:', error)
        // Return default counts if error
        return {
          nieuw: 0,
          toegewezen: 0,
          gesloten: 0,
          spam: 0,
          aan_mij_toegewezen: 0,
          vermeld: 0,
          favorieten: 0
        }
      }
      
      return data as {
        nieuw: number
        toegewezen: number
        gesloten: number
        spam: number
        aan_mij_toegewezen: number
        vermeld: number
        favorieten: number
      }
    },
    retry: 1,
  })
}

export function useTicket(ticketNumber: number) {
  return useQuery({
    queryKey: ['ticket', ticketNumber],
    queryFn: async () => {
      // First get the ticket
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_id(id, name, email, phone),
          assignee:assignee_id(id, email, full_name),
          team:team_id(id, name)
        `)
        .eq('number', ticketNumber)
        .single()

      if (ticketError) {
        console.error('Error fetching ticket:', ticketError)
        throw ticketError
      }

      // Get the conversation ID
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single()

      if (convError && convError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error fetching conversation:', convError)
        // Don't throw, just continue without conversation
      }

      let processedMessages: any[] = []
      
      // If we have a conversation, get its messages
      if (conversation) {
        const { data: messages, error: msgError } = await supabase
          .from('messages')
          .select(`
            id,
            content,
            content_type,
            sender_type,
            sender_id,
            attachments,
            is_internal,
            created_at,
            metadata
          `)
          .eq('conversation_id', conversation.id)
          .order('created_at', { ascending: true })

        if (msgError) {
          console.error('Error fetching messages:', msgError)
        } else if (messages) {
          // Process messages to use originalHtml if available
          processedMessages = messages.map((message: any) => {
            // If we have originalHtml in metadata, use that
            if (message.metadata?.originalHtml) {
              return {
                ...message,
                content: message.metadata.originalHtml,
                content_type: 'text/html'
              }
            }
            return message
          })
        }
      }

      return {
        ...ticket,
        conversation: conversation ? { id: conversation.id } : null,
        messages: processedMessages
      }
    },
    enabled: !!ticketNumber,
    retry: 1,
  })
}

export function useSendMessage(options?: {
  onTicketResolved?: (ticketId: string) => Promise<void>
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      conversationId: string
      content: string
      isInternal?: boolean
      senderId: string
      senderType: 'agent' | 'customer' | 'system'
      ticketId?: string
    }) => {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: params.conversationId,
          content: params.content,
          is_internal: params.isInternal || false,
          sender_id: params.senderId,
          sender_type: params.senderType,
        })
        .select()
        .single()

      if (error) throw error

      // If it's an agent reply (not internal), update ticket status to resolved
      if (params.senderType === 'agent' && !params.isInternal && params.ticketId) {
        await supabase
          .from('tickets')
          .update({ 
            status: 'resolved' as Database['public']['Enums']['ticket_status'],
            resolved_at: new Date().toISOString()
          })
          .eq('id', params.ticketId)
        
        // Call the callback if provided
        if (options?.onTicketResolved) {
          try {
            await options.onTicketResolved(params.ticketId)
          } catch (err) {
            console.error('Failed to handle ticket resolved:', err)
          }
        }
      }

      return data
    },
    onSuccess: (data: any, variables: any) => {
      // Invalidate the ticket query to refetch messages
      queryClient.invalidateQueries({ queryKey: ['ticket'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useUpdateTicket(options?: {
  onStatusChange?: (ticketId: string, status: string) => Promise<void>
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      ticketId: string
      updates: Partial<{
        status: Database['public']['Enums']['ticket_status']
        priority: Database['public']['Enums']['ticket_priority']
        assignee_id: string | null
        team_id: string | null
      }>
    }) => {
      const { data, error } = await supabase
        .from('tickets')
        .update(params.updates)
        .eq('id', params.ticketId)
        .select()

      if (error) throw error
      
      // Call the callback if status changed
      if (params.updates.status && options?.onStatusChange) {
        try {
          await options.onStatusChange(params.ticketId, params.updates.status)
        } catch (err) {
          console.error('Failed to handle status change:', err)
        }
      }
      
      // Return the first updated ticket (should only be one)
      return data?.[0] || null
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
  })
}

export function useDeleteTicket() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketId: string) => {
      // With CASCADE DELETE, we only need to delete the ticket
      // All related conversations, messages, labels, etc. will be automatically deleted
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', ticketId)

      if (error) {
        console.error('Error deleting ticket:', error)
        throw error
      }
    },
    onSuccess: () => {
      // Invalidate all related queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['ticket'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
      queryClient.invalidateQueries({ queryKey: ['tickets-infinite'] })
    },
    onError: (error) => {
      console.error('Failed to delete ticket:', error)
    }
  })
}

export function useBulkUpdateTickets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      ticketIds: string[]
      updates: Partial<{
        status: Database['public']['Enums']['ticket_status']
        assignee_id: string | null
        team_id: string | null
        metadata: any
      }>
    }) => {
      const { ticketIds, updates } = params
      
      // Prepare the update object
      const updateData: any = { ...updates }
      
      // If closing tickets, set closed_at
      if (updates.status === 'closed') {
        updateData.closed_at = new Date().toISOString()
      }
      
      // If resolving tickets, set resolved_at
      if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString()
      }
      
      // Update tickets in batches
      const batchSize = 10
      for (let i = 0; i < ticketIds.length; i += batchSize) {
        const batch = ticketIds.slice(i, i + batchSize)
        const { error } = await supabase
          .from('tickets')
          .update(updateData)
          .in('id', batch)
          
        if (error) throw error
      }
      
      return ticketIds.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    },
  })
}

export function useBulkAssignTickets() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: {
      ticketIds: string[]
      assigneeId: string | null
      teamId?: string | null
    }) => {
      const { ticketIds, assigneeId, teamId } = params
      
      const updates: any = { 
        assignee_id: assigneeId,
        updated_at: new Date().toISOString()
      }
      
      // If assigning to someone, change status from 'new' to 'open'
      if (assigneeId) {
        // We'll update status conditionally for each ticket
        for (const ticketId of ticketIds) {
          const { data: ticket } = await supabase
            .from('tickets')
            .select('status')
            .eq('id', ticketId)
            .single()
            
          const ticketUpdate: any = { ...updates }
          if (ticket?.status === 'new') {
            ticketUpdate.status = 'open'
          }
          
          if (teamId !== undefined) {
            ticketUpdate.team_id = teamId
          }
          
          const { error } = await supabase
            .from('tickets')
            .update(ticketUpdate)
            .eq('id', ticketId)
            
          if (error) throw error
        }
      } else {
        // Bulk update if not changing status
        if (teamId !== undefined) {
          updates.team_id = teamId
        }
        
        const { error } = await supabase
          .from('tickets')
          .update(updates)
          .in('id', ticketIds)
          
        if (error) throw error
      }
      
      return ticketIds.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    },
  })
}

export function useBulkMarkAsSpam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (ticketIds: string[]) => {
      // Use the mark_ticket_as_spam function for each ticket
      const promises = ticketIds.map(ticketId => 
        supabase.rpc('mark_ticket_as_spam', {
          p_ticket_id: ticketId,
          p_is_spam: true
        })
      )
      
      const results = await Promise.all(promises)
      
      // Check for errors
      const errors = results.filter(result => result.error)
      if (errors.length > 0) {
        throw new Error(`Failed to mark ${errors.length} tickets as spam`)
      }
      
      return ticketIds.length
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    },
  })
} 