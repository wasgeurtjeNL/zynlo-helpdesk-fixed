import { QueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'

/**
 * Prefetch tickets for a specific status
 */
export async function prefetchTicketsByStatus(
  queryClient: QueryClient,
  status?: string,
  page: number = 1,
  pageSize: number = 25
) {
  return queryClient.prefetchQuery({
    queryKey: ['tickets', status, page, pageSize],
    queryFn: async () => {
      let countQuery = supabase
        .from('tickets')
        .select('*', { count: 'exact', head: true })
      
      if (status) {
        countQuery = countQuery.eq('status', status)
      }

      const { count } = await countQuery

      const offset = (page - 1) * pageSize

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

      const { data } = await query

      const ticketsWithMessages = data?.map(ticket => ({
        ...ticket,
        messages: []
      })) || []

      const totalCount = count || 0
      const totalPages = Math.ceil(totalCount / pageSize)

      return {
        tickets: ticketsWithMessages,
        totalCount,
        currentPage: page,
        totalPages
      }
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })
}

/**
 * Prefetch a specific ticket
 */
export async function prefetchTicket(
  queryClient: QueryClient,
  ticketNumber: number
) {
  return queryClient.prefetchQuery({
    queryKey: ['ticket', ticketNumber],
    queryFn: async () => {
      const { data: ticket } = await supabase
        .from('tickets')
        .select(`
          *,
          customer:customer_id(id, name, email, phone),
          assignee:assignee_id(id, email, full_name),
          team:team_id(id, name)
        `)
        .eq('number', ticketNumber)
        .single()

      if (!ticket) return null

      const { data: conversation } = await supabase
        .from('conversations')
        .select(`
          id,
          messages(
            id,
            content,
            content_type,
            sender_type,
            sender_id,
            attachments,
            is_internal,
            created_at,
            metadata
          )
        `)
        .eq('ticket_id', ticket.id)
        .single()

      const processedMessages = conversation?.messages?.map((message: any) => {
        if (message.metadata?.originalHtml) {
          return {
            ...message,
            content: message.metadata.originalHtml,
            content_type: 'text/html'
          }
        }
        return message
      }) || []

      return {
        ...ticket,
        conversation: conversation ? { id: conversation.id } : null,
        messages: processedMessages
      }
    },
    staleTime: 30 * 1000, // Consider data fresh for 30 seconds
  })
}

/**
 * Prefetch inbox counts for navigation
 */
export async function prefetchInboxCounts(
  queryClient: QueryClient,
  userId: string
) {
  return queryClient.prefetchQuery({
    queryKey: ['inbox-counts', userId],
    queryFn: async () => {
      const { data } = await supabase.rpc('get_inbox_counts', {
        p_user_id: userId,
      })
      
      return data || {
        nieuw: 0,
        toegewezen: 0,
        gesloten: 0,
        spam: 0,
        aan_mij_toegewezen: 0,
        vermeld: 0,
        favorieten: 0
      }
    },
    staleTime: 60 * 1000, // Consider data fresh for 1 minute
  })
}

/**
 * Prefetch customer list
 */
export async function prefetchCustomers(
  queryClient: QueryClient,
  searchTerm?: string
) {
  return queryClient.prefetchQuery({
    queryKey: ['customers', searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select(`
          *,
          tickets(count)
        `)
        .order('created_at', { ascending: false })

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      }

      const { data } = await query

      return data?.map(customer => ({
        ...customer,
        ticket_count: customer.tickets?.[0]?.count || 0
      })) || []
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  })
} 