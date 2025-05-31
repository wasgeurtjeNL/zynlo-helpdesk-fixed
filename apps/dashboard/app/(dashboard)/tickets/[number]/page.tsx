import { TicketDetail } from '@/components/ticket-detail'

export default function TicketPage({ params }: { params: { number: string } }) {
  return <TicketDetail ticketNumber={parseInt(params.number)} />
} 