'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query'
import { supabase, useDeleteTicket, useBulkUpdateTickets, useBulkAssignTickets, useBulkMarkAsSpam, useUsers } from '@zynlo/supabase'
import { useSelectedTicketSafe } from '@/hooks/use-selected-ticket'
import { 
  MoreVertical, 
  Star, 
  Archive, 
  Trash2,
  CheckSquare,
  Square,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Loader2,
  Search,
  X as XIcon,
  UserPlus,
  Ban,
  Check,
  ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@zynlo/ui'
import type { Database } from '@zynlo/supabase'
import { toast } from 'sonner'

// ... Type definitions remain the same ...
type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed'
type Ticket = Database['public']['Tables']['tickets']['Row']
type TicketWithRelations = Ticket & {
  customer: Database['public']['Tables']['customers']['Row'] | null
  assignee: Database['public']['Tables']['users']['Row'] | null
  messages: Array<{
    id: string
    content: string
    created_at: string
  }>
}

const statusIcons = {
  new: { icon: AlertCircle, color: 'text-blue-500' },
  open: { icon: Clock, color: 'text-yellow-500' },
  pending: { icon: Clock, color: 'text-orange-500' },
  resolved: { icon: CheckCircle2, color: 'text-green-500' },
  closed: { icon: XCircle, color: 'text-gray-500' },
}

interface TicketListLoadMoreProps {
  status?: TicketStatus
  isSpam?: boolean
  className?: string
}

// Helper functions remain the same
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}

const getCustomerName = (customer: any): string => {
  if (customer?.name) return customer.name
  if (customer?.email) return customer.email.split('@')[0]
  return 'Onbekend'
}

const stripHtmlTags = (html: string): string => {
  // Return empty string if input is empty
  if (!html) return ''
  
  // First remove style and script tags completely with their content
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  
  // Remove @import statements
  text = text.replace(/@import\s+url\([^)]+\);?/gi, '')
  
  // Then create element to strip remaining HTML
  const tmp = document.createElement('div')
  tmp.innerHTML = text
  
  // Get text content and clean up whitespace
  const result = tmp.textContent || tmp.innerText || ''
  return result.trim().replace(/\s+/g, ' ')
}

const getMessagePreview = (ticket: any): string => {
  // First check if we have a last_message property (from the stored procedure)
  if (ticket.last_message) {
    const preview = stripHtmlTags(ticket.last_message.content)
    return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
  }
  
  // Fallback to messages array
  if (!ticket.messages || ticket.messages.length === 0) return 'Geen berichten'
  const lastMessage = ticket.messages[0]
  const preview = stripHtmlTags(lastMessage.content)
  return preview.length > 80 ? preview.substring(0, 80) + '...' : preview
}

const formatDate = (date: string) => {
  const d = new Date(date)
  const now = new Date()
  const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60)
  
  if (diffInHours < 1) {
    const diffInMinutes = Math.floor(diffInHours * 60)
    return `${diffInMinutes}m`
  } else if (diffInHours < 24) {
    return `${Math.floor(diffInHours)}u`
  } else if (diffInHours < 48) {
    return 'Gisteren'
  } else {
    return d.toLocaleDateString('nl-NL', { 
      day: 'numeric', 
      month: 'short' 
    })
  }
}

const getInitials = (name: string | null | undefined, email: string | null | undefined): string => {
  if (name) {
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }
  if (email) {
    return email.substring(0, 2).toUpperCase()
  }
  return '??'
}

export function TicketListLoadMore({ status, isSpam, className }: TicketListLoadMoreProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { selectedTicketNumber, setSelectedTicketNumber } = useSelectedTicketSafe()
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const deleteTicket = useDeleteTicket()
  const bulkUpdateTickets = useBulkUpdateTickets()
  const bulkAssignTickets = useBulkAssignTickets()
  const bulkMarkAsSpam = useBulkMarkAsSpam()
  const { data: users } = useUsers()
  const [isDeletingBulk, setIsDeletingBulk] = useState(false)
  const [showBulkMenu, setShowBulkMenu] = useState(false)
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [selectedAssignee, setSelectedAssignee] = useState<string>('')

  const PAGE_SIZE = 25

  // Fetch function for infinite query
  const fetchTickets = useCallback(async ({ pageParam = 0 }) => {
    let query = supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(id, name, email),
        assignee:assignee_id(id, email, full_name)
      `)
      .order('created_at', { ascending: false })
      .range(pageParam, pageParam + PAGE_SIZE - 1)

    if (status) {
      query = query.eq('status', status as TicketStatus)
    }

    // Add spam filtering
    if (isSpam !== undefined) {
      query = query.eq('is_spam', isSpam)
    }

    const { data, error } = await query

    if (error) throw error

    return {
      tickets: (data || []).map(ticket => ({
        ...ticket,
        messages: []
      })) as TicketWithRelations[],
      nextCursor: data?.length === PAGE_SIZE ? pageParam + PAGE_SIZE : null
    }
  }, [status, isSpam])

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ['tickets-infinite', status, isSpam],
    queryFn: fetchTickets,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: 0,
  })

  // Flatten all pages into single array
  const allTickets = useMemo(() => {
    return data?.pages.flatMap(page => page.tickets) || []
  }, [data])

  // Filter tickets based on search
  const filteredTickets = useMemo(() => {
    if (!allTickets || !debouncedSearchQuery) return allTickets
    
    const query = debouncedSearchQuery.toLowerCase()
    return allTickets.filter((ticket: any) => {
      const customerName = getCustomerName(ticket.customer).toLowerCase()
      const customerEmail = ticket.customer?.email?.toLowerCase() || ''
      const subject = ticket.subject?.toLowerCase() || ''
      const ticketNumber = `#${ticket.number}`.toLowerCase()
      const preview = getMessagePreview(ticket)
      
      return (
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        subject.includes(query) ||
        ticketNumber.includes(query) ||
        preview.includes(query)
      )
    })
  }, [allTickets, debouncedSearchQuery])

  const handleSelectAll = () => {
    if (selectedTickets.size === filteredTickets?.length) {
      setSelectedTickets(new Set())
    } else {
      setSelectedTickets(new Set(filteredTickets?.map((t: any) => t.id) || []))
    }
  }

  const handleSelectTicket = (ticketId: string) => {
    const newSelected = new Set(selectedTickets)
    if (newSelected.has(ticketId)) {
      newSelected.delete(ticketId)
    } else {
      newSelected.add(ticketId)
    }
    setSelectedTickets(newSelected)
  }

  const handleTicketClick = (ticketNumber: number) => {
    const pathname = window.location.pathname
    
    // Check if we're on a page that should use split-screen layout
    // This includes /tickets page and all /inbox/* pages  
    const isSplitScreenPage = pathname.startsWith('/tickets') || pathname.startsWith('/inbox')
    
    if (isSplitScreenPage && !pathname.includes(`/tickets/${ticketNumber}`)) {
      // Stay on the same page and just update the selected ticket
      setSelectedTicketNumber(ticketNumber)
    } else {
      // Only navigate if we're not on a split-screen page
      router.push(`/tickets/${ticketNumber}`)
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTickets.size === 0) return

    const confirmed = window.confirm(`Weet je zeker dat je ${selectedTickets.size} ticket(s) wilt verwijderen?`)
    if (!confirmed) return

    setIsDeletingBulk(true)
    
    try {
      // Delete each selected ticket
      const deletePromises = Array.from(selectedTickets).map(ticketId => 
        deleteTicket.mutateAsync(ticketId)
      )
      
      const results = await Promise.allSettled(deletePromises)
      
      // Count successes and failures
      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length
      
      if (failed > 0 && succeeded > 0) {
        toast.warning(`${succeeded} ticket(s) verwijderd, ${failed} ticket(s) konden niet worden verwijderd`)
      } else if (failed > 0) {
        toast.error(`Kon ${failed} ticket(s) niet verwijderen. Controleer je permissies.`)
      } else {
        toast.success(`${succeeded} ticket(s) succesvol verwijderd`)
      }
      
      // Clear selection even if some failed
      setSelectedTickets(new Set())
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tickets-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    } catch (error) {
      console.error('Error deleting tickets:', error)
      toast.error('Er is een onverwachte fout opgetreden bij het verwijderen van tickets')
    } finally {
      setIsDeletingBulk(false)
    }
  }

  const handleBulkClose = async () => {
    if (selectedTickets.size === 0) return

    try {
      await bulkUpdateTickets.mutateAsync({
        ticketIds: Array.from(selectedTickets),
        updates: { status: 'closed' }
      })
      
      toast.success(`${selectedTickets.size} ticket(s) succesvol gesloten`)
      setSelectedTickets(new Set())
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tickets-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    } catch (error) {
      console.error('Error closing tickets:', error)
      toast.error('Er is een fout opgetreden bij het sluiten van tickets')
    }
  }

  const handleBulkAssign = async () => {
    if (selectedTickets.size === 0) return
    setShowAssignModal(true)
  }

  const handleConfirmAssign = async () => {
    if (!selectedAssignee) {
      toast.error('Selecteer een agent om tickets aan toe te wijzen')
      return
    }

    try {
      await bulkAssignTickets.mutateAsync({
        ticketIds: Array.from(selectedTickets),
        assigneeId: selectedAssignee || null
      })
      
      toast.success(`${selectedTickets.size} ticket(s) succesvol toegewezen`)
      setSelectedTickets(new Set())
      setShowAssignModal(false)
      setSelectedAssignee('')
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tickets-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    } catch (error) {
      console.error('Error assigning tickets:', error)
      toast.error('Er is een fout opgetreden bij het toewijzen van tickets')
    }
  }

  const handleBulkMarkAsSpam = async () => {
    if (selectedTickets.size === 0) return

    const confirmed = window.confirm(`Weet je zeker dat je ${selectedTickets.size} ticket(s) als spam wilt markeren?`)
    if (!confirmed) return

    try {
      await bulkMarkAsSpam.mutateAsync(Array.from(selectedTickets))
      
      toast.success(`${selectedTickets.size} ticket(s) gemarkeerd als spam`)
      setSelectedTickets(new Set())
      
      // Invalidate queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['tickets-infinite'] })
      queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })
    } catch (error) {
      console.error('Error marking tickets as spam:', error)
      toast.error('Er is een fout opgetreden bij het markeren als spam')
    }
  }

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Er is een fout opgetreden bij het laden van tickets</p>
          <p className="text-sm text-gray-500 mt-2">{(error as Error).message}</p>
        </div>
      </div>
    )
  }

  if (!allTickets || allTickets.length === 0) {
    return (
      <div className={cn("flex items-center justify-center h-64", className)}>
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Geen tickets gevonden</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Search bar */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Zoek op naam, onderwerp of e-mail..."
            className="w-full pl-9 pr-9 py-2 text-sm rounded-md border border-gray-200 
                     focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                     placeholder:text-gray-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        {debouncedSearchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            {filteredTickets.length} tickets gevonden
          </p>
        )}
        {!debouncedSearchQuery && (
          <p className="text-xs text-gray-500 mt-2">
            {allTickets.length} tickets geladen
          </p>
        )}
      </div>

      {/* Select all header - more subtle */}
      {selectedTickets.size > 0 && (
        <div className="border-b border-gray-200 px-4 py-2.5 bg-white">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSelectAll}
              className="flex items-center"
            >
              {selectedTickets.size === filteredTickets?.length ? (
                <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400" />
              )}
            </button>
            
            <div className="relative">
              <button
                onClick={() => setShowBulkMenu(!showBulkMenu)}
                className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 font-medium"
              >
                Met geselecteerd ({selectedTickets.size})
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              
              {showBulkMenu && (
                <>
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowBulkMenu(false)}
                  />
                  <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleBulkAssign()
                          setShowBulkMenu(false)
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        Toewijzen
                      </button>
                      
                      <button
                        onClick={() => {
                          handleBulkClose()
                          setShowBulkMenu(false)
                        }}
                        disabled={bulkUpdateTickets.isPending}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        {bulkUpdateTickets.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sluiten...
                          </>
                        ) : (
                          'Sluiten'
                        )}
                      </button>
                      
                      <button
                        onClick={() => {
                          handleBulkDelete()
                          setShowBulkMenu(false)
                        }}
                        disabled={isDeletingBulk}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        {isDeletingBulk ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Verwijderen...
                          </>
                        ) : (
                          'Verwijderen'
                        )}
                      </button>
                      
                      <div className="border-t border-gray-100 my-1" />
                      
                      <button
                        onClick={() => {
                          handleBulkMarkAsSpam()
                          setShowBulkMenu(false)
                        }}
                        disabled={bulkMarkAsSpam.isPending}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                      >
                        {bulkMarkAsSpam.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Markeren als spam...
                          </>
                        ) : (
                          'Markeer als spam'
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Conversation-style list */}
      <div className="flex-1 overflow-y-auto">
        <div className="divide-y divide-gray-100">
          {filteredTickets.length === 0 && debouncedSearchQuery ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Search className="w-12 h-12 text-gray-300 mb-4" />
              <p className="text-gray-600 font-medium">Geen tickets gevonden</p>
              <p className="text-sm text-gray-500 mt-2">
                Probeer een andere zoekterm of filter
              </p>
            </div>
          ) : (
            <>
              {filteredTickets.map((ticket: any) => {
                const StatusIcon = statusIcons[ticket.status as TicketStatus]
                const isSelected = selectedTicketNumber === ticket.number
                const customerName = getCustomerName(ticket.customer)
                const initials = getInitials(ticket.customer?.name, ticket.customer?.email)
                const preview = getMessagePreview(ticket)
                
                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "group flex items-start gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors relative",
                      isSelected && "bg-blue-50 hover:bg-blue-50",
                      selectedTickets.has(ticket.id) && "bg-gray-50"
                    )}
                    onClick={() => ticket.number != null && handleTicketClick(ticket.number)}
                  >
                    {/* Checkbox */}
                    <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleSelectTicket(ticket.id)}
                        className={cn(
                          "flex items-center transition-opacity",
                          selectedTickets.has(ticket.id) || selectedTickets.size > 0 ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                        )}
                      >
                        {selectedTickets.has(ticket.id) ? (
                          <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-gray-400" />
                        )}
                      </button>
                    </div>

                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gray-400 text-white flex items-center justify-center text-sm font-medium">
                        {initials}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Header row */}
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-sm text-gray-900 truncate">
                            {customerName}
                          </h3>
                          <span className="text-xs text-gray-500 flex-shrink-0">
                            {ticket.number && `#${ticket.number}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {ticket.priority === 'urgent' && (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <StatusIcon.icon className={cn("w-4 h-4", StatusIcon.color)} />
                          <span className="text-xs text-gray-500">
                            {formatDate(ticket.updated_at || ticket.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* Subject */}
                      <p className="text-sm font-medium text-gray-800 truncate mb-1">
                        {ticket.subject}
                      </p>

                      {/* Preview */}
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {preview}
                      </p>

                      {/* Tags/Labels if any */}
                      {ticket.assignee && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-400">
                            Toegewezen aan {ticket.assignee.full_name || ticket.assignee.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>

        {/* Load More button */}
        {hasNextPage && !debouncedSearchQuery && (
          <div className="p-4 flex justify-center">
            <Button
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
              variant="outline"
              className="min-w-[200px]"
            >
              {isFetchingNextPage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Meer laden...
                </>
              ) : (
                'Meer tickets laden'
              )}
            </Button>
          </div>
        )}
      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-40" 
            onClick={() => {
              setShowAssignModal(false)
              setSelectedAssignee('')
            }}
          />
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
              <h3 className="text-lg font-semibold mb-4">
                Tickets toewijzen ({selectedTickets.size})
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Selecteer een agent
                </label>
                <select
                  value={selectedAssignee}
                  onChange={(e) => setSelectedAssignee(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Selecteer agent --</option>
                  <option value="">Geen (toewijzing verwijderen)</option>
                  {users?.map((user: any) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => {
                    setShowAssignModal(false)
                    setSelectedAssignee('')
                  }}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annuleren
                </button>
                <button
                  onClick={handleConfirmAssign}
                  disabled={bulkAssignTickets.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {bulkAssignTickets.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Toewijzen
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
} 