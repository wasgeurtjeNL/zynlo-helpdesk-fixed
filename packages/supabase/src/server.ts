// Server-only exports - no React hooks
export { createServerClient } from './client';
export type { Database } from './types/database';

// Service exports (these don't use React hooks)
export { TicketService } from './services/TicketService';
export type {
  Ticket,
  TicketInsert,
  TicketUpdate,
  TicketStatus,
  TicketPriority,
  TicketWithRelations,
  CreateTicketParams,
  SearchTicketParams,
  TicketStats,
} from './services/TicketService';
