import { Suspense } from 'react'
import { TicketList } from '@/components/ticket-list'
import { TicketDetailWrapper } from '@/components/ticket-detail-wrapper'
import { SelectedTicketProvider } from '@/hooks/use-selected-ticket'
import { Loader2 } from 'lucide-react'

// Server Component for static layout
export default function TicketsPage() {
  return (
    <SelectedTicketProvider>
      <div className="flex h-full">
        {/* Left side - Ticket list */}
        <div className="w-[30%] min-w-[350px] max-w-[400px] border-r border-gray-200 h-full">
          <div className="p-4 border-b border-gray-100">
            <h1 className="text-lg font-semibold">Alle tickets</h1>
          </div>
          
          {/* Use Suspense for loading state */}
          <Suspense fallback={<TicketListSkeleton />}>
            <TicketList className="h-[calc(100%-57px)]" />
          </Suspense>
        </div>

        {/* Right side - Ticket detail or empty state */}
        <div className="flex-1 h-full">
          <Suspense fallback={<TicketDetailSkeleton />}>
            <TicketDetailWrapper />
          </Suspense>
        </div>
      </div>
    </SelectedTicketProvider>
  )
}

// Loading skeleton for ticket list
function TicketListSkeleton() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )
}

// Loading skeleton for ticket detail
function TicketDetailSkeleton() {
  return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
    </div>
  )
} 