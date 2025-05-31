import { SupabaseClient } from '@supabase/supabase-js';
import { Database, Tables, TablesInsert, TablesUpdate, Enums } from '../types/database.types';

export type Ticket = Tables<'tickets'>;
export type TicketInsert = TablesInsert<'tickets'>;
export type TicketUpdate = TablesUpdate<'tickets'>;
export type TicketStatus = Enums<'ticket_status'>;
export type TicketPriority = Enums<'ticket_priority'>;

export interface TicketWithRelations extends Ticket {
  customer?: Tables<'customers'> | null;
  assignee?: Tables<'users'> | null;
  team?: Tables<'teams'> | null;
  conversations?: Tables<'conversations'>[];
  message_count?: number;
  last_message_at?: string;
}

export interface CreateTicketParams {
  subject: string;
  content: string;
  customer_email: string;
  customer_name: string;
  channel: Enums<'channel_type'>;
  priority?: TicketPriority;
  metadata?: Record<string, any>;
}

export interface SearchTicketParams {
  query?: string;
  status?: TicketStatus[];
  assignee_id?: string;
  customer_id?: string;
  limit?: number;
  offset?: number;
}

export interface TicketStats {
  status: {
    new_count: number;
    open_count: number;
    pending_count: number;
    resolved_count: number;
    closed_count: number;
    total_count: number;
    avg_resolution_hours: number;
  };
  priority: {
    urgent_count: number;
    high_count: number;
    normal_count: number;
    low_count: number;
  };
  period: {
    from: string;
    to: string;
  };
}

export class TicketService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a new ticket with initial message and conversation
   */
  async createTicket(params: CreateTicketParams) {
    const { data, error } = await this.supabase.rpc('create_ticket_with_message', {
      p_subject: params.subject,
      p_content: params.content,
      p_customer_email: params.customer_email,
      p_customer_name: params.customer_name,
      p_channel: params.channel,
      p_priority: params.priority || 'normal',
      p_metadata: params.metadata || {},
    });

    if (error) throw error;
    return data as {
      ticket_id: string;
      conversation_id: string;
      message_id: string;
      customer_id: string;
    };
  }

  /**
   * Get a single ticket by ID with relations
   */
  async getTicket(id: string): Promise<TicketWithRelations | null> {
    const { data, error } = await this.supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(*),
        assignee:users(*),
        team:teams(*),
        conversations(*)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get tickets with filters and pagination
   */
  async getTickets(filters?: {
    status?: TicketStatus[];
    assignee_id?: string;
    customer_id?: string;
    team_id?: string;
    limit?: number;
    offset?: number;
  }) {
    let query = this.supabase
      .from('tickets')
      .select(`
        *,
        customer:customers(id, name, email),
        assignee:users(id, full_name, avatar_url),
        conversations!inner(
          messages(created_at)
        )
      `, { count: 'exact' });

    if (filters?.status?.length) {
      query = query.in('status', filters.status);
    }
    if (filters?.assignee_id) {
      query = query.eq('assignee_id', filters.assignee_id);
    }
    if (filters?.customer_id) {
      query = query.eq('customer_id', filters.customer_id);
    }
    if (filters?.team_id) {
      query = query.eq('team_id', filters.team_id);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 50) - 1);

    const { data, error, count } = await query;

    if (error) throw error;
    
    return {
      tickets: data || [],
      total: count || 0,
    };
  }

  /**
   * Update a ticket
   */
  async updateTicket(id: string, update: TicketUpdate) {
    const { data, error } = await this.supabase
      .from('tickets')
      .update(update)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update ticket status with validation
   */
  async updateTicketStatus(id: string, status: TicketStatus) {
    // Get current ticket status
    const { data: ticket, error: fetchError } = await this.supabase
      .from('tickets')
      .select('status')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;
    if (!ticket) throw new Error('Ticket not found');

    // Validate status transition
    if (!this.isValidStatusTransition(ticket.status, status)) {
      throw new Error(`Invalid status transition from ${ticket.status} to ${status}`);
    }

    const update: TicketUpdate = { status };

    // Set resolved_at or closed_at timestamps
    if (status === 'resolved') {
      update.resolved_at = new Date().toISOString();
    } else if (status === 'closed') {
      update.closed_at = new Date().toISOString();
    }

    return this.updateTicket(id, update);
  }

  /**
   * Assign ticket to an agent
   */
  async assignTicket(ticketId: string, agentId: string) {
    const { error } = await this.supabase.rpc('assign_ticket', {
      p_ticket_id: ticketId,
      p_agent_id: agentId,
    });

    if (error) throw error;
  }

  /**
   * Search tickets
   */
  async searchTickets(params: SearchTicketParams) {
    const { data, error } = await this.supabase.rpc('search_tickets', {
      p_query: params.query || '',
      p_status: params.status || undefined,
      p_assignee_id: params.assignee_id || undefined,
      p_customer_id: params.customer_id || undefined,
      p_limit: params.limit || 50,
      p_offset: params.offset || 0,
    });

    if (error) throw error;
    return data;
  }

  /**
   * Get ticket statistics
   */
  async getTicketStats(params?: {
    team_id?: string;
    agent_id?: string;
    date_from?: string;
    date_to?: string;
  }): Promise<TicketStats> {
    const { data, error } = await this.supabase.rpc('get_ticket_stats', {
      p_team_id: params?.team_id || undefined,
      p_agent_id: params?.agent_id || undefined,
      p_date_from: params?.date_from || undefined,
      p_date_to: params?.date_to || undefined,
    });

    if (error) throw error;
    
    // Type guard to ensure data is TicketStats
    if (data && typeof data === 'object' && 'status' in data && 'priority' in data && 'period' in data) {
      return data as unknown as TicketStats;
    }
    
    throw new Error('Invalid ticket stats data format');
  }

  /**
   * Merge duplicate tickets
   */
  async mergeTickets(primaryTicketId: string, duplicateTicketIds: string[]) {
    const { error } = await this.supabase.rpc('merge_tickets', {
      p_primary_ticket_id: primaryTicketId,
      p_duplicate_ticket_ids: duplicateTicketIds,
    });

    if (error) throw error;
  }

  /**
   * Validate status transition
   */
  private isValidStatusTransition(from: TicketStatus | null, to: TicketStatus): boolean {
    const transitions: Record<TicketStatus, TicketStatus[]> = {
      'new': ['open', 'pending', 'resolved', 'closed'],
      'open': ['pending', 'resolved', 'closed'],
      'pending': ['open', 'resolved', 'closed'],
      'resolved': ['open', 'closed'],
      'closed': ['open'], // Allow reopening
    };

    if (!from) return true; // New ticket can have any status
    return transitions[from]?.includes(to) || false;
  }

  /**
   * Get available agents for assignment
   */
  async getAvailableAgents(teamId?: string) {
    let query = this.supabase
      .from('users')
      .select('id, email, full_name, avatar_url, team_id')
      .eq('is_active', true)
      .in('role', ['agent', 'admin']);

    if (teamId) {
      query = query.eq('team_id', teamId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }

  /**
   * Add tags to a ticket
   */
  async addTags(ticketId: string, tags: string[]) {
    const { data: ticket, error: fetchError } = await this.supabase
      .from('tickets')
      .select('tags')
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    const currentTags = ticket?.tags || [];
    const newTags = Array.from(new Set([...currentTags, ...tags]));

    const { error } = await this.supabase
      .from('tickets')
      .update({ tags: newTags })
      .eq('id', ticketId);

    if (error) throw error;
  }

  /**
   * Remove tags from a ticket
   */
  async removeTags(ticketId: string, tags: string[]) {
    const { data: ticket, error: fetchError } = await this.supabase
      .from('tickets')
      .select('tags')
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    const currentTags = ticket?.tags || [];
    const newTags = currentTags.filter(tag => !tags.includes(tag));

    const { error } = await this.supabase
      .from('tickets')
      .update({ tags: newTags })
      .eq('id', ticketId);

    if (error) throw error;
  }
} 