'use client'

import { useSelectedTicket } from '@/hooks/use-selected-ticket'
import { TicketDetail } from './ticket-detail'
import { TicketEmptyState } from './ticket-empty-state'

export function TicketDetailWrapper() {
  const { selectedTicketNumber } = useSelectedTicket()
  
  if (!selectedTicketNumber) {
    return <TicketEmptyState />
  }
  
  return <TicketDetail ticketNumber={selectedTicketNumber} />
} 