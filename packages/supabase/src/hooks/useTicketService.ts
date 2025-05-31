import { useMemo } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';
import { Database } from '../types/database.types';
import { TicketService } from '../services/TicketService';

export function useTicketService() {
  const supabase = useSupabaseClient<Database>();
  
  const ticketService = useMemo(() => {
    return new TicketService(supabase);
  }, [supabase]);
  
  return ticketService;
} 