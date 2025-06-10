// Client exports
export { supabase, createServerClient } from './client';

// Service exports
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
  TicketStats
} from './services/TicketService';

// Hook exports
export { useUser } from './hooks/useUser';
export { useUser as useAuthUser, useAuth } from './hooks/useAuth';
export * from './hooks/useTickets';
export * from './hooks/useTicketReadStatus';
export * from './hooks/useRealtimeTickets';
export * from './hooks/useUsers';
export * from './hooks/useLabels';
export * from './hooks/useTasks';
export * from './hooks/useTeams';
export * from './hooks/useTicketCounts';
export * from './hooks/useSendEmailReply';
export * from './hooks/useAutomation';
export * from './hooks/usePresence';
export * from './hooks/drafts';
export * from './hooks/signatures';
export * from './hooks/attachments';
export * from './hooks/savedReplies';
export * from './hooks/useChannels';

// AI usage hooks
export { 
  useCheckAIUsage,
  useRecordAIUsage,
  useAIUsageHistory,
  useAIUsageSummary,
  useUserAILimits
} from './hooks/aiUsage';

// Type exports
export type { Database } from './types/database';

export * from './types/database'; 