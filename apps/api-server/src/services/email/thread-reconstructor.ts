import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface ThreadMessage {
  id: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  subject: string;
  date: Date;
  from: string;
  conversationId?: string;
  ticketId?: string;
}

export interface EmailThread {
  threadId: string;
  subject: string;
  participants: string[];
  messageCount: number;
  firstMessageDate: Date;
  lastMessageDate: Date;
  messages: ThreadMessage[];
}

export class ThreadReconstructor {
  private readonly SUBJECT_PREFIXES = ['re:', 'fwd:', 'fw:', 'tr:', 'aw:', 'sv:', 'vs:', 'antw:'];
  private readonly TIME_WINDOW_DAYS = 7; // Group messages with same subject within 7 days

  /**
   * Find existing thread for an incoming email
   */
  async findExistingThread(
    messageId: string,
    inReplyTo?: string,
    references?: string[],
    subject?: string,
    fromEmail?: string
  ): Promise<{ ticketId: string; conversationId: string } | null> {
    // 1. Try to find by message ID references (most reliable)
    if (inReplyTo || references?.length) {
      const messageIds = [
        ...(inReplyTo ? [inReplyTo] : []),
        ...(references || [])
      ].filter(Boolean);

      // Look for existing messages with these IDs
      const { data: existingMessages } = await supabase
        .from('messages')
        .select(`
          id,
          conversation_id,
          conversations!inner(
            id,
            ticket_id,
            tickets!inner(
              id,
              status
            )
          )
        `)
        .or(messageIds.map(id => `metadata->>'messageId'.eq.${id}`).join(','))
        .limit(1);

      if (existingMessages && existingMessages.length > 0) {
        const message = existingMessages[0] as any;
        return {
          ticketId: message.conversations.ticket_id,
          conversationId: message.conversation_id
        };
      }
    }

    // 2. Fallback to subject matching
    if (subject && fromEmail) {
      const normalizedSubject = this.normalizeSubject(subject);
      
      // Look for recent tickets with similar subject from same sender
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.TIME_WINDOW_DAYS);

      const { data: recentTickets } = await supabase
        .from('tickets')
        .select(`
          id,
          subject,
          conversations!inner(
            id,
            messages!inner(
              id,
              sender_id,
              created_at
            )
          )
        `)
        .gte('created_at', cutoffDate.toISOString())
        .order('created_at', { ascending: false });

      if (recentTickets) {
        // Find tickets with matching normalized subject and sender
        for (const ticket of recentTickets) {
          const ticketSubject = this.normalizeSubject(ticket.subject);
          
          // Check if subjects match and if sender participated
          if (this.subjectsMatch(normalizedSubject, ticketSubject)) {
            const hasSenderParticipated = ticket.conversations.some((conv: any) =>
              conv.messages.some((msg: any) => 
                msg.sender_id === fromEmail || 
                msg.sender_id.toLowerCase() === fromEmail.toLowerCase()
              )
            );

            if (hasSenderParticipated) {
              return {
                ticketId: ticket.id,
                conversationId: ticket.conversations[0].id
              };
            }
          }
        }
      }
    }

    return null;
  }

  /**
   * Reconstruct full email thread from database
   */
  async reconstructThread(ticketId: string): Promise<EmailThread | null> {
    // Get all messages for the ticket
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_id,
        sender_type,
        metadata,
        created_at,
        conversation_id,
        conversations!inner(
          ticket_id,
          tickets!inner(
            id,
            subject
          )
        )
      `)
      .eq('conversations.ticket_id', ticketId)
      .order('created_at', { ascending: true });

    if (error || !messages || messages.length === 0) {
      return null;
    }

    // Extract unique participants
    const participants = new Set<string>();
    const threadMessages: ThreadMessage[] = [];

    for (const message of messages) {
      participants.add(message.sender_id);
      
      const metadata = message.metadata as any || {};
      const conversation = message.conversations as any;
      const ticket = conversation?.tickets;
      
      threadMessages.push({
        id: message.id,
        messageId: metadata.messageId || message.id,
        inReplyTo: metadata.inReplyTo,
        references: metadata.references,
        subject: metadata.subject || ticket?.subject || '',
        date: new Date(message.created_at),
        from: message.sender_id,
        conversationId: message.conversation_id,
        ticketId: ticketId
      });
    }

    const firstMessage = messages[0] as any;
    const lastMessage = messages[messages.length - 1] as any;
    const ticketSubject = firstMessage.conversations?.tickets?.subject || 'No subject';

    return {
      threadId: ticketId,
      subject: ticketSubject,
      participants: Array.from(participants),
      messageCount: messages.length,
      firstMessageDate: new Date(firstMessage.created_at),
      lastMessageDate: new Date(lastMessage.created_at),
      messages: threadMessages
    };
  }

  /**
   * Build reference chain for replies
   */
  buildReferenceChain(thread: EmailThread, currentMessageId?: string): string[] {
    const references: string[] = [];
    
    // Add all previous message IDs in chronological order
    for (const message of thread.messages) {
      if (message.messageId && message.messageId !== currentMessageId) {
        references.push(message.messageId);
      }
    }

    return references;
  }

  /**
   * Normalize email subject for comparison
   */
  private normalizeSubject(subject: string): string {
    let normalized = subject.toLowerCase().trim();
    
    // Remove common prefixes
    let changed = true;
    while (changed) {
      changed = false;
      for (const prefix of this.SUBJECT_PREFIXES) {
        if (normalized.startsWith(prefix)) {
          normalized = normalized.substring(prefix.length).trim();
          changed = true;
          break;
        }
      }
    }
    
    // Remove ticket numbers like [#12345] or (#12345)
    normalized = normalized.replace(/[\[\(]#?\d+[\]\)]/g, '').trim();
    
    // Remove extra whitespace
    normalized = normalized.replace(/\s+/g, ' ');
    
    return normalized;
  }

  /**
   * Check if two normalized subjects match
   */
  private subjectsMatch(subject1: string, subject2: string): boolean {
    // Exact match
    if (subject1 === subject2) {
      return true;
    }

    // Check if one contains the other (for partial quotes)
    if (subject1.includes(subject2) || subject2.includes(subject1)) {
      return true;
    }

    // Calculate similarity score (simple approach)
    const words1 = new Set(subject1.split(' '));
    const words2 = new Set(subject2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    const similarity = intersection.size / union.size;
    
    // Consider 70% word overlap as matching
    return similarity >= 0.7;
  }

  /**
   * Group orphaned messages into threads
   */
  async groupOrphanedMessages(): Promise<void> {
    // Find messages without proper threading
    const { data: orphanedMessages } = await supabase
      .from('messages')
      .select(`
        id,
        metadata,
        created_at,
        conversation_id,
        conversations!inner(
          ticket_id
        )
      `)
      .is('metadata->inReplyTo', null)
      .is('metadata->references', null)
      .order('created_at', { ascending: true });

    if (!orphanedMessages || orphanedMessages.length === 0) {
      return;
    }

    // Group by normalized subject and time window
    const groups = new Map<string, ThreadMessage[]>();
    
    for (const message of orphanedMessages) {
      const metadata = message.metadata as any || {};
      const subject = metadata.subject || '';
      const normalizedSubject = this.normalizeSubject(subject);
      const conversation = message.conversations as any;
      
      // Find existing group or create new one
      let added = false;
      for (const [groupSubject, groupMessages] of groups.entries()) {
        if (this.subjectsMatch(normalizedSubject, groupSubject)) {
          // Check time window
          const lastMessage = groupMessages[groupMessages.length - 1];
          const timeDiff = new Date(message.created_at).getTime() - lastMessage.date.getTime();
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
          
          if (daysDiff <= this.TIME_WINDOW_DAYS) {
            groupMessages.push({
              id: message.id,
              messageId: metadata.messageId || message.id,
              subject: subject,
              date: new Date(message.created_at),
              from: metadata.from?.email || 'unknown',
              conversationId: message.conversation_id,
              ticketId: conversation?.ticket_id
            });
            added = true;
            break;
          }
        }
      }
      
      if (!added) {
        groups.set(normalizedSubject, [{
          id: message.id,
          messageId: metadata.messageId || message.id,
          subject: subject,
          date: new Date(message.created_at),
          from: metadata.from?.email || 'unknown',
          conversationId: message.conversation_id,
          ticketId: conversation?.ticket_id
        }]);
      }
    }

    // Update messages in groups to have proper references
    for (const [_, groupMessages] of groups.entries()) {
      if (groupMessages.length > 1) {
        // Sort by date
        groupMessages.sort((a, b) => a.date.getTime() - b.date.getTime());
        
        // Update references for each message after the first
        for (let i = 1; i < groupMessages.length; i++) {
          const previousMessages = groupMessages.slice(0, i);
          const references = previousMessages.map(m => m.messageId);
          
          // Update the message metadata
          const { data: message } = await supabase
            .from('messages')
            .select('metadata')
            .eq('id', groupMessages[i].id)
            .single();
          
          if (message) {
            const updatedMetadata = {
              ...(message.metadata as any),
              references: references,
              inReplyTo: references[references.length - 1]
            };
            
            await supabase
              .from('messages')
              .update({ metadata: updatedMetadata })
              .eq('id', groupMessages[i].id);
          }
        }
      }
    }
  }
}

// Export singleton instance
export const threadReconstructor = new ThreadReconstructor(); 