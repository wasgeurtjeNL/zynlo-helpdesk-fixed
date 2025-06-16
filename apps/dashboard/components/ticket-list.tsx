'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  useTickets,
  useDeleteTicket,
  useBulkUpdateTickets,
  useBulkAssignTickets,
  useBulkMarkAsSpam,
  useUsers,
  useTicketUnreadStatus,
  useMarkTicketAsRead,
} from '@zynlo/supabase';
import { useSelectedTicketSafe } from '@/hooks/use-selected-ticket';
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
  Mail,
  MessageSquare,
  Search,
  X as XIcon,
  ChevronLeft,
  ChevronRight,
  UserPlus,
  Ban,
  Check,
  ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Database } from '@zynlo/supabase';
import { toast } from 'sonner';

type TicketStatus = 'new' | 'open' | 'pending' | 'resolved' | 'closed';
type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketWithRelations = Ticket & {
  customer: Database['public']['Tables']['customers']['Row'] | null;
  assignee: Database['public']['Tables']['users']['Row'] | null;
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
  }>;
};

const statusIcons = {
  new: { icon: AlertCircle, color: 'text-blue-500' },
  open: { icon: Clock, color: 'text-yellow-500' },
  pending: { icon: Clock, color: 'text-orange-500' },
  resolved: { icon: CheckCircle2, color: 'text-green-500' },
  closed: { icon: XCircle, color: 'text-gray-500' },
};

const priorityColors = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
};

interface TicketListProps {
  status?: TicketStatus;
  isSpam?: boolean;
  className?: string;
}

// Custom debounce hook
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

// Helper functions
const getCustomerName = (customer: any): string => {
  if (customer?.name) return customer.name;
  if (customer?.email) return customer.email.split('@')[0];
  return 'Onbekend';
};

const stripHtmlTags = (html: string): string => {
  // Return empty string if input is empty
  if (!html) return '';

  // First remove style and script tags completely with their content
  let text = html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Remove @import statements
  text = text.replace(/@import\s+url\([^)]+\);?/gi, '');

  // Then create element to strip remaining HTML
  const tmp = document.createElement('div');
  tmp.innerHTML = text;

  // Get text content and clean up whitespace
  const result = tmp.textContent || tmp.innerText || '';
  return result.trim().replace(/\s+/g, ' ');
};

// Get last message preview for display
const getMessagePreview = (ticket: any): string => {
  // First check if there's a last_message from the stored procedure
  if (ticket.last_message) {
    const preview = stripHtmlTags(ticket.last_message.content);
    return preview.length > 80 ? preview.substring(0, 80) + '...' : preview;
  }

  // Fallback to messages array
  if (!ticket.messages || ticket.messages.length === 0) {
    // For outbound tickets without messages, use the description
    if (ticket.description) {
      const preview = stripHtmlTags(ticket.description);
      return preview.length > 80 ? preview.substring(0, 80) + '...' : preview;
    }
    return 'Geen berichten';
  }

  const lastMessage = ticket.messages[0];
  const preview = stripHtmlTags(lastMessage.content);
  return preview.length > 80 ? preview.substring(0, 80) + '...' : preview;
};

export function TicketList({ status, isSpam, className }: TicketListProps) {
  const router = useRouter();
  const [currentPage, setCurrentPage] = useState(1);
  const { data, error, isLoading, refetch } = useTickets({
    status,
    isSpam,
    page: currentPage,
    pageSize: 25,
  });
  const { selectedTicketNumber, setSelectedTicketNumber } = useSelectedTicketSafe();
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const deleteTicket = useDeleteTicket();
  const bulkUpdateTickets = useBulkUpdateTickets();
  const bulkAssignTickets = useBulkAssignTickets();
  const bulkMarkAsSpam = useBulkMarkAsSpam();
  const { data: users } = useUsers();
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [showBulkMenu, setShowBulkMenu] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string>('');

  // Extract tickets from paginated response
  const tickets = data?.tickets || [];
  const totalCount = data?.totalCount || 0;
  const totalPages = data?.totalPages || 1;

  // Get unread status for all tickets
  const ticketIds = tickets.map((ticket: any) => ticket.id);
  const { data: unreadStatuses = [] } = useTicketUnreadStatus(ticketIds);
  const markTicketAsRead = useMarkTicketAsRead();

  // Create a map for fast lookup of unread status
  const unreadMap = useMemo(() => {
    const map = new Map();
    unreadStatuses.forEach((item: any) => {
      map.set(item.ticketId, item.isUnread);
    });
    return map;
  }, [unreadStatuses]);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchQuery]);

  // Filter tickets based on search query
  const filteredTickets = useMemo(() => {
    if (!tickets || !debouncedSearchQuery) return tickets || [];

    const query = debouncedSearchQuery.toLowerCase();
    return tickets.filter((ticket: any) => {
      const customerName = getCustomerName(ticket.customer).toLowerCase();
      const customerEmail = ticket.customer?.email?.toLowerCase() || '';
      const subject = ticket.subject?.toLowerCase() || '';
      const ticketNumber = `#${ticket.number}`.toLowerCase();
      const preview = getMessagePreview(ticket).toLowerCase();

      return (
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        subject.includes(query) ||
        ticketNumber.includes(query) ||
        preview.includes(query)
      );
    });
  }, [tickets, debouncedSearchQuery]);

  const handleSelectAll = () => {
    if (selectedTickets.size === filteredTickets?.length) {
      setSelectedTickets(new Set());
      setLastSelectedIndex(null);
    } else {
      setSelectedTickets(new Set(filteredTickets?.map((t: any) => t.id) || []));
      setLastSelectedIndex(null);
    }
  };

  const handleSelectTicket = (ticketId: string, index: number, event?: React.MouseEvent) => {
    const newSelected = new Set(selectedTickets);

    // Check if shift key is pressed and we have a previous selection
    if (event?.shiftKey && lastSelectedIndex !== null && lastSelectedIndex !== index) {
      // Determine the range to select
      const startIndex = Math.min(lastSelectedIndex, index);
      const endIndex = Math.max(lastSelectedIndex, index);

      // Select all tickets in the range
      for (let i = startIndex; i <= endIndex; i++) {
        if (filteredTickets[i]) {
          newSelected.add(filteredTickets[i].id);
        }
      }
    } else if (event?.ctrlKey || event?.metaKey) {
      // CTRL/CMD + click = toggle this item without affecting others
      if (newSelected.has(ticketId)) {
        newSelected.delete(ticketId);
      } else {
        newSelected.add(ticketId);
      }
    } else {
      // Regular click without modifiers = clear selection and select only this item
      if (newSelected.has(ticketId) && newSelected.size === 1) {
        // If this is the only selected item, deselect it
        newSelected.clear();
      } else {
        // Clear all and select only this item
        newSelected.clear();
        newSelected.add(ticketId);
      }
    }

    setSelectedTickets(newSelected);
    setLastSelectedIndex(index);
  };

  const handleTicketClick = (ticketNumber: number, ticketId: string) => {
    const pathname = window.location.pathname;

    // Mark ticket as read when clicked
    markTicketAsRead.mutate(ticketId);

    // Check if we're on a page that should use split-screen layout
    // This includes /tickets page and all /inbox/* pages
    const isSplitScreenPage = pathname.startsWith('/tickets') || pathname.startsWith('/inbox');

    if (isSplitScreenPage && !pathname.includes(`/tickets/${ticketNumber}`)) {
      // Stay on the same page and just update the selected ticket
      setSelectedTicketNumber(ticketNumber);
    } else {
      // Only navigate if we're not on a split-screen page
      router.push(`/tickets/${ticketNumber}`);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffInHours = (now.getTime() - d.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60);
      return `${diffInMinutes}m`;
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}u`;
    } else if (diffInHours < 48) {
      return 'Gisteren';
    } else {
      return d.toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short',
      });
    }
  };

  const getInitials = (
    name: string | null | undefined,
    email: string | null | undefined
  ): string => {
    if (name && name.trim()) {
      return name
        .trim()
        .split(' ')
        .map((word) => word[0]?.toUpperCase())
        .slice(0, 2)
        .join('');
    }
    if (email) {
      return email.slice(0, 2).toUpperCase();
    }
    return '??';
  };

  // Generate consistent color for customer based on their email or name
  const getCustomerColor = (customer: any): string => {
    const identifier = customer?.email || customer?.name || 'unknown';

    // Trengo-like color palette
    const colors = [
      'bg-blue-500', // #3B82F6
      'bg-emerald-500', // #10B981
      'bg-purple-500', // #8B5CF6
      'bg-pink-500', // #EC4899
      'bg-orange-500', // #F97316
      'bg-teal-500', // #14B8A6
      'bg-indigo-500', // #6366F1
      'bg-red-500', // #EF4444
      'bg-yellow-500', // #EAB308
      'bg-cyan-500', // #06B6D4
      'bg-violet-500', // #7C3AED
      'bg-rose-500', // #F43F5E
      'bg-lime-500', // #84CC16
      'bg-amber-500', // #F59E0B
      'bg-green-500', // #22C55E
      'bg-sky-500', // #0EA5E9
    ];

    // Simple hash function to consistently map identifier to color
    let hash = 0;
    for (let i = 0; i < identifier.length; i++) {
      const char = identifier.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  const handleBulkDelete = async () => {
    if (selectedTickets.size === 0) return;

    const confirmed = window.confirm(
      `Weet je zeker dat je ${selectedTickets.size} ticket(s) wilt verwijderen?`
    );
    if (!confirmed) return;

    setIsDeletingBulk(true);

    try {
      // Delete each selected ticket
      const deletePromises = Array.from(selectedTickets).map((ticketId) =>
        deleteTicket.mutateAsync(ticketId)
      );

      const results = await Promise.allSettled(deletePromises);

      // Count successes and failures
      const succeeded = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      if (failed > 0 && succeeded > 0) {
        toast.warning(
          `${succeeded} ticket(s) verwijderd, ${failed} ticket(s) konden niet worden verwijderd`
        );
      } else if (failed > 0) {
        toast.error(`Kon ${failed} ticket(s) niet verwijderen. Controleer je permissies.`);
      } else {
        toast.success(`${succeeded} ticket(s) succesvol verwijderd`);
      }

      // Clear selection even if some failed
      setSelectedTickets(new Set());
      refetch(); // Refresh the ticket list
    } catch (error) {
      console.error('Error deleting tickets:', error);
      toast.error('Er is een onverwachte fout opgetreden bij het verwijderen van tickets');
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleBulkClose = async () => {
    if (selectedTickets.size === 0) return;

    console.log('Starting bulk close for tickets:', Array.from(selectedTickets));

    try {
      await bulkUpdateTickets.mutateAsync({
        ticketIds: Array.from(selectedTickets),
        updates: { status: 'closed' as Database['public']['Enums']['ticket_status'] },
      });

      toast.success(`${selectedTickets.size} ticket(s) succesvol gesloten`);
      setSelectedTickets(new Set());
      refetch();
    } catch (error) {
      console.error('Error closing tickets:', error);
      toast.error('Er is een fout opgetreden bij het sluiten van tickets');
    }
  };

  const handleBulkAssign = async () => {
    if (selectedTickets.size === 0) return;
    setShowAssignModal(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedAssignee) {
      toast.error('Selecteer een agent om tickets aan toe te wijzen');
      return;
    }

    try {
      await bulkAssignTickets.mutateAsync({
        ticketIds: Array.from(selectedTickets),
        assigneeId: selectedAssignee || null,
      });

      toast.success(`${selectedTickets.size} ticket(s) succesvol toegewezen`);
      setSelectedTickets(new Set());
      setShowAssignModal(false);
      setSelectedAssignee('');
      refetch();
    } catch (error) {
      console.error('Error assigning tickets:', error);
      toast.error('Er is een fout opgetreden bij het toewijzen van tickets');
    }
  };

  const handleBulkMarkAsSpam = async () => {
    if (selectedTickets.size === 0) return;

    const confirmed = window.confirm(
      `Weet je zeker dat je ${selectedTickets.size} ticket(s) als spam wilt markeren?`
    );
    if (!confirmed) return;

    try {
      await bulkMarkAsSpam.mutateAsync(Array.from(selectedTickets));

      toast.success(`${selectedTickets.size} ticket(s) gemarkeerd als spam`);
      setSelectedTickets(new Set());
      refetch();
    } catch (error) {
      console.error('Error marking tickets as spam:', error);
      toast.error('Er is een fout opgetreden bij het markeren als spam');
    }
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Er is een fout opgetreden bij het laden van tickets</p>
          <p className="text-sm text-gray-500 mt-2">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!tickets || tickets.length === 0) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Geen tickets gevonden</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('h-full flex flex-col', className)}>
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
            {filteredTickets.length} van {tickets.length} tickets gevonden
          </p>
        )}
        {!debouncedSearchQuery && totalCount > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Pagina {currentPage} van {totalPages} ({totalCount} tickets totaal)
          </p>
        )}
      </div>

      {/* Select all header - more subtle */}
      {selectedTickets.size > 0 && (
        <div className="border-b border-gray-200 px-4 py-2.5 bg-white">
          <div className="flex items-center gap-3">
            <button onClick={handleSelectAll} className="flex items-center">
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
                  <div className="fixed inset-0 z-10" onClick={() => setShowBulkMenu(false)} />
                  <div className="absolute left-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          handleBulkAssign();
                          setShowBulkMenu(false);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                      >
                        Toewijzen
                      </button>

                      <button
                        onClick={() => {
                          handleBulkClose();
                          setShowBulkMenu(false);
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
                          handleBulkDelete();
                          setShowBulkMenu(false);
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
                          handleBulkMarkAsSpam();
                          setShowBulkMenu(false);
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
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {filteredTickets.length === 0 && debouncedSearchQuery ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Search className="w-12 h-12 text-gray-300 mb-4" />
            <p className="text-gray-600 font-medium">Geen tickets gevonden</p>
            <p className="text-sm text-gray-500 mt-2">Probeer een andere zoekterm of filter</p>
          </div>
        ) : (
          filteredTickets.map((ticket: any, index: number) => {
            const StatusIcon = statusIcons[ticket.status as TicketStatus];
            const isSelected = selectedTicketNumber === ticket.number;
            const customerName = getCustomerName(ticket.customer);
            const initials = getInitials(ticket.customer?.name, ticket.customer?.email);
            const preview = getMessagePreview(ticket);
            const isUnread = unreadMap.get(ticket.id) === true;

            return (
              <div
                key={ticket.id}
                className={cn(
                  'group flex items-start gap-3 px-4 py-3 hover:bg-gray-50/70 cursor-pointer transition-all duration-200 relative border-l-2 border-transparent',
                  isSelected && 'bg-blue-50/50 hover:bg-blue-50/70 border-l-blue-400',
                  selectedTickets.has(ticket.id) && 'bg-gray-50/70'
                )}
                onClick={() => ticket.number != null && handleTicketClick(ticket.number, ticket.id)}
              >
                {/* Checkbox */}
                <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={(e) => handleSelectTicket(ticket.id, index, e)}
                    className={cn(
                      'flex items-center transition-all duration-200',
                      selectedTickets.has(ticket.id) || selectedTickets.size > 0
                        ? 'opacity-100'
                        : 'opacity-0 group-hover:opacity-100'
                    )}
                  >
                    {selectedTickets.has(ticket.id) ? (
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="w-4 h-4 rounded-full border-2 border-gray-300 hover:border-blue-400 transition-colors" />
                    )}
                  </button>
                </div>

                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className={cn(
                      getCustomerColor(ticket.customer),
                      'w-9 h-9 rounded-full text-white flex items-center justify-center text-xs font-semibold'
                    )}
                  >
                    {initials}
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <h3
                        className={cn(
                          'text-sm text-gray-900 truncate',
                          isUnread ? 'font-bold' : 'font-semibold'
                        )}
                      >
                        {customerName}
                      </h3>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {ticket.number && `#${ticket.number}`}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {ticket.priority === 'urgent' && (
                        <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                      )}
                      <StatusIcon.icon className={cn('w-3.5 h-3.5', StatusIcon.color)} />
                      <span className="text-xs text-gray-400">
                        {formatDate(ticket.updated_at || ticket.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Subject */}
                  <p
                    className={cn(
                      'text-sm text-gray-800 truncate mb-1',
                      isUnread ? 'font-bold' : 'font-medium'
                    )}
                  >
                    {ticket.subject}
                  </p>

                  {/* Preview */}
                  <p
                    className={cn(
                      'text-xs line-clamp-2',
                      isUnread ? 'text-gray-600 font-medium' : 'text-gray-500'
                    )}
                  >
                    {preview}
                  </p>

                  {/* Tags/Labels if any */}
                  {ticket.assignee && (
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                        <div className="w-1 h-1 rounded-full bg-blue-500" />
                        {ticket.assignee.full_name || ticket.assignee.email}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination controls */}
      {!debouncedSearchQuery && totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              currentPage === 1
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
            Vorige
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum = i + 1;
              if (totalPages > 5) {
                if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={cn(
                    'w-8 h-8 flex items-center justify-center text-sm font-medium rounded-md transition-colors',
                    currentPage === pageNum
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-100'
                  )}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage === totalPages}
            className={cn(
              'flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
              currentPage === totalPages
                ? 'text-gray-400 cursor-not-allowed'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            Volgende
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <>
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            onClick={() => {
              setShowAssignModal(false);
              setSelectedAssignee('');
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
                    setShowAssignModal(false);
                    setSelectedAssignee('');
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
                  {bulkAssignTickets.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Toewijzen
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
