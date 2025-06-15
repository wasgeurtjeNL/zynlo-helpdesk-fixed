import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{
      mimeType: string;
      body: { data?: string; attachmentId?: string };
      filename?: string;
    }>;
  };
  internalDate: string;
}

export class GmailSyncService {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/gmail/callback`
  );

  async syncChannel(channelId: string) {
    try {
      // Check if OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn(
          `⚠️ Gmail sync skipped for channel ${channelId}: Google OAuth credentials not configured`
        );
        return { processed: 0, errors: 0, updated: 0 };
      }

      console.log('[Gmail Sync] Starting sync for channel:', channelId);

      // Get channel from database
      const { data: channel, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .eq('type', 'email')
        .eq('provider', 'gmail')
        .single();

      if (error || !channel) {
        throw new Error('Channel not found');
      }

      // Check if channel has valid OAuth tokens
      const settings = channel.settings || {};
      if (!settings.oauth_token && !settings.refresh_token) {
        console.warn(`⚠️ Gmail channel ${channelId} has no OAuth tokens - skipping sync`);
        return { processed: 0, errors: 0, updated: 0 };
      }

      // Set up OAuth client
      this.oauth2Client.setCredentials({
        access_token: channel.settings.oauth_token,
        refresh_token: channel.settings.refresh_token,
      });

      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Get messages from the last sync or last 24 hours
      const after = channel.last_sync
        ? new Date(channel.last_sync).getTime() / 1000
        : Date.now() / 1000 - 86400; // 24 hours ago

      // Search for messages
      const query = `after:${Math.floor(after)} -from:me`;
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50,
      });

      const messages = response.data.messages || [];
      console.log(`Found ${messages.length} new messages for channel ${channelId}`);

      let processed = 0;
      let errors = 0;

      // Process each message
      for (const message of messages) {
        try {
          await this.processMessage(gmail, message.id!, channel);
          processed++;
        } catch (error) {
          console.error(`Error processing message ${message.id}:`, error);
          errors++;
        }
      }

      // Update last sync time
      await supabase
        .from('channels')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', channelId);

      return { processed, errors };
    } catch (error) {
      console.error(`Error syncing channel ${channelId}:`, error);
      throw error;
    }
  }

  private async processMessage(gmail: any, messageId: string, channel: any) {
    try {
      // Get full message
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message: GmailMessage = response.data;

      // Extract email data
      const headers = message.payload.headers || [];
      const from = this.getHeader(headers, 'From');
      const subject = this.getHeader(headers, 'Subject');
      const messageIdHeader = this.getHeader(headers, 'Message-ID');
      const inReplyTo = this.getHeader(headers, 'In-Reply-To');
      const references = this.getHeader(headers, 'References');

      // Parse from email
      const fromMatch = from?.match(/(.*?)<(.+?)>/) || [null, null, from];
      const fromName = fromMatch[1]?.trim().replace(/"/g, '');
      const fromEmail = fromMatch[2] || from;

      // Get message body
      const { text, html } = this.extractBody(message.payload);

      // Check if ticket already exists
      const { data: existingTicket } = await supabase
        .from('tickets')
        .select('id')
        .eq('metadata->>gmail_message_id', messageId)
        .single();

      if (existingTicket) {
        console.log(`Message ${messageId} already processed, skipping`);
        return;
      }

      // Find or create customer
      const customerId = await this.findOrCreateCustomer(fromEmail, fromName);

      // Create ticket
      const ticketData = {
        subject: subject || 'No Subject',
        priority: 'medium' as const,
        status: 'new' as const,
        customer_id: customerId,
        metadata: {
          gmail_message_id: messageId,
          gmail_thread_id: message.threadId,
          channel_id: channel.id,
          created_via: 'gmail_sync',
        },
      };

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert(ticketData)
        .select()
        .single();

      if (ticketError) {
        throw ticketError;
      }

      // Create conversation
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          ticket_id: ticket.id,
          channel: 'email' as const,
          external_id: messageId,
          metadata: {
            gmail_thread_id: message.threadId,
            message_id: messageIdHeader,
            in_reply_to: inReplyTo,
            references: references?.split(/\s+/) || [],
          },
        })
        .select()
        .single();

      if (conversationError) {
        throw conversationError;
      }

      // Create message
      const messageData = {
        conversation_id: conversation.id,
        content: text || html || message.snippet || '',
        content_type: html ? 'html' : 'text',
        sender_type: 'customer' as const,
        sender_id: fromEmail,
        metadata: {
          from: fromEmail,
          from_name: fromName,
          subject,
          gmail_message_id: messageId,
          received_at: new Date(parseInt(message.internalDate)).toISOString(),
        },
      };

      const { error: messageError } = await supabase.from('messages').insert(messageData);

      if (messageError) {
        throw messageError;
      }

      console.log(`✅ Created ticket ${ticket.id} from Gmail message ${messageId}`);
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error);
      throw error;
    }
  }

  private async findOrCreateCustomer(email: string, name?: string) {
    // Try to find existing customer
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', email)
      .single();

    if (existingCustomer) {
      return existingCustomer.id;
    }

    // Create new customer
    const customerData = {
      email,
      name: name || email.split('@')[0],
      metadata: {
        created_via: 'gmail_sync',
      },
    };

    const { data: newCustomer, error } = await supabase
      .from('customers')
      .insert(customerData)
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return newCustomer.id;
  }

  private getHeader(
    headers: Array<{ name: string; value: string }>,
    name: string
  ): string | undefined {
    return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
  }

  private extractBody(payload: any): { text?: string; html?: string } {
    const decodeContent = (data: string): string => {
      try {
        return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
      } catch (error) {
        console.warn('Failed to decode content:', error);
        return '';
      }
    };

    if (payload.body?.data) {
      const content = decodeContent(payload.body.data);
      return payload.mimeType?.includes('html') ? { html: content } : { text: content };
    }

    if (payload.parts) {
      let text = '';
      let html = '';

      for (const part of payload.parts) {
        if (part.body?.data) {
          const content = decodeContent(part.body.data);

          if (part.mimeType?.includes('html')) {
            html = content;
          } else if (part.mimeType?.includes('text')) {
            text = content;
          }
        }
      }

      return { text, html };
    }

    return {};
  }

  // Run sync for all active Gmail channels
  async syncAllChannels() {
    try {
      // Check if OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️ Gmail sync disabled: Google OAuth credentials not configured');
        return { channels: 0, processed: 0, errors: 0 };
      }

      // Get all active Gmail channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('id, name, settings')
        .eq('type', 'email')
        .eq('provider', 'gmail')
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      // Filter out channels without OAuth tokens
      const validChannels = (channels || []).filter((channel) => {
        const settings = channel.settings || {};
        const hasTokens = settings.oauth_token || settings.refresh_token;
        if (!hasTokens) {
          console.log(`⚠️ Skipping channel ${channel.id}: no OAuth tokens`);
        }
        return hasTokens;
      });

      console.log(
        `Starting sync for ${validChannels.length} Gmail channels (${channels?.length || 0} total found)`
      );

      let totalProcessed = 0;
      let totalErrors = 0;

      // Sync each valid channel
      const results = await Promise.allSettled(
        validChannels.map((channel) => this.syncChannel(channel.id))
      );

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(
            `Channel ${validChannels[index].id} synced: ${result.value.processed} messages`
          );
          totalProcessed += result.value.processed;
          totalErrors += result.value.errors;
        } else {
          console.error(`Channel ${validChannels[index].id} sync failed:`, result.reason);
          totalErrors++;
        }
      });

      return {
        channels: validChannels.length,
        processed: totalProcessed,
        errors: totalErrors,
      };
    } catch (error) {
      console.error('Error syncing Gmail channels:', error);
      throw error;
    }
  }
}

// Create singleton instance
export const gmailSync = new GmailSyncService();
