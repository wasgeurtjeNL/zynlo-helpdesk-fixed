import { ImapClient, EmailMessage } from './imap-client';
import { OAuth2Handler, OAuth2Config } from './oauth2';
import { SmtpClient, EmailSendOptions, EmailSendResult } from './smtp-client';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export interface EmailChannelConfig {
  id: string;
  provider: 'gmail' | 'outlook' | 'other';
  emailAddress: string;
  imapHost?: string;
  imapPort?: number;
  imapUsername?: string;
  imapPassword?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpSecure?: boolean;
  smtpUsername?: string;
  smtpPassword?: string;
  oauth2ClientId?: string;
  oauth2ClientSecret?: string;
  oauth2RefreshToken?: string;
  webhookUrl?: string;
}

export class EmailService {
  private imapClients: Map<string, ImapClient> = new Map();
  private smtpClients: Map<string, SmtpClient> = new Map();
  private oauth2Handlers: Map<string, OAuth2Handler> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Initialize email service for a channel
   */
  async initializeChannel(config: EmailChannelConfig): Promise<void> {
    console.log(`Initializing email channel ${config.id} for ${config.emailAddress}`);

    // Create OAuth2 handler if using OAuth
    if (config.oauth2ClientId && config.oauth2ClientSecret) {
      const oauth2Config: OAuth2Config = {
        provider: config.provider as 'gmail' | 'outlook',
        clientId: config.oauth2ClientId,
        clientSecret: config.oauth2ClientSecret,
        redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback/${config.provider}`,
        refreshToken: config.oauth2RefreshToken,
      };

      const oauth2Handler = new OAuth2Handler(oauth2Config);
      this.oauth2Handlers.set(config.id, oauth2Handler);

      // Create IMAP client with OAuth2
      const imapClient = new ImapClient({
        channelId: config.id,
        provider: config.provider,
        oauth2Handler,
      });

      this.imapClients.set(config.id, imapClient);

      // Create SMTP client with OAuth2
      const smtpClient = new SmtpClient({
        channelId: config.id,
        provider: config.provider,
        oauth2Handler,
      });

      this.smtpClients.set(config.id, smtpClient);
    } else if (config.imapPassword) {
      // Create IMAP client with password auth
      const imapClient = new ImapClient({
        channelId: config.id,
        provider: config.provider,
        host: config.imapHost,
        port: config.imapPort,
        username: config.imapUsername || config.emailAddress,
        password: config.imapPassword,
      });

      this.imapClients.set(config.id, imapClient);

      // Create SMTP client with password auth
      const smtpClient = new SmtpClient({
        channelId: config.id,
        provider: config.provider,
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        username: config.smtpUsername || config.emailAddress,
        password: config.smtpPassword || config.imapPassword,
      });

      this.smtpClients.set(config.id, smtpClient);
    } else {
      throw new Error('No authentication method configured for email channel');
    }

    // Test connection
    const imapClient = this.imapClients.get(config.id)!;
    await imapClient.connect();
    console.log(`Successfully connected to email server for channel ${config.id}`);
  }

  /**
   * Fetch new emails for a channel
   */
  async fetchNewEmails(channelId: string): Promise<EmailMessage[]> {
    const imapClient = this.imapClients.get(channelId);
    if (!imapClient) {
      throw new Error(`No IMAP client found for channel ${channelId}`);
    }

    try {
      // Get last fetched UID from database
      const { data: channel } = await supabase
        .from('channels')
        .select('settings')
        .eq('id', channelId)
        .single();

      const lastFetchedUid = (channel?.settings as any)?.last_fetched_uid || 0;

      // Fetch new messages
      const messages = await imapClient.fetchMessages('INBOX', ['UNSEEN'], 50);

      // Filter messages newer than last fetched
      const newMessages = messages.filter(msg => msg.uid > lastFetchedUid);

      if (newMessages.length > 0) {
        // Update last fetched UID
        const maxUid = Math.max(...newMessages.map(m => m.uid));
        await supabase
          .from('channels')
          .update({
            settings: {
              ...(channel?.settings as any),
              last_fetched_uid: maxUid,
              last_fetch_at: new Date().toISOString(),
            }
          })
          .eq('id', channelId);

        // Process each new message
        for (const message of newMessages) {
          await this.processEmail(channelId, message);
        }
      }

      return newMessages;
    } catch (error) {
      console.error(`Failed to fetch emails for channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Process a single email message
   */
  private async processEmail(channelId: string, message: EmailMessage): Promise<void> {
    // Get channel config
    const { data: channel } = await supabase
      .from('channels')
      .select('settings')
      .eq('id', channelId)
      .single();

    const webhookUrl = (channel?.settings as any)?.webhook_url || 
                      process.env.EMAIL_WEBHOOK_URL || 
                      'http://localhost:3001/webhooks/email';

    // Convert to webhook format
    const webhookPayload = {
      messageId: message.messageId,
      from: message.from[0] || { address: 'unknown@example.com' },
      to: message.to,
      cc: message.cc,
      subject: message.subject,
      text: message.text,
      html: message.html,
      attachments: message.attachments.map(att => ({
        filename: att.filename,
        contentType: att.contentType,
        size: att.size,
        // Don't include content in webhook, too large
      })),
      headers: Object.fromEntries(message.headers),
      inReplyTo: message.inReplyTo,
      references: message.references,
      receivedAt: message.date.toISOString(),
    };

    // Send to webhook
    try {
      const response = await axios.post(webhookUrl, webhookPayload, {
        headers: {
          'Content-Type': 'application/json',
          'x-channel-id': channelId,
          'x-webhook-signature': this.generateWebhookSignature(webhookPayload),
        },
        timeout: 30000,
      });

      console.log(`Email ${message.messageId} processed successfully`);

      // Mark as seen
      const imapClient = this.imapClients.get(channelId)!;
      await imapClient.markAsSeen(message.uid);
    } catch (error) {
      console.error(`Failed to process email ${message.messageId}:`, error);
      throw error;
    }
  }

  /**
   * Start polling for new emails
   */
  startPolling(channelId: string, intervalMs: number = 60000): void {
    // Clear existing interval if any
    this.stopPolling(channelId);

    console.log(`Starting email polling for channel ${channelId} every ${intervalMs}ms`);

    const interval = setInterval(async () => {
      try {
        const newMessages = await this.fetchNewEmails(channelId);
        if (newMessages.length > 0) {
          console.log(`Fetched ${newMessages.length} new emails for channel ${channelId}`);
        }
      } catch (error) {
        console.error(`Polling error for channel ${channelId}:`, error);
      }
    }, intervalMs);

    this.pollingIntervals.set(channelId, interval);

    // Fetch immediately
    this.fetchNewEmails(channelId).catch(console.error);
  }

  /**
   * Stop polling for a channel
   */
  stopPolling(channelId: string): void {
    const interval = this.pollingIntervals.get(channelId);
    if (interval) {
      clearInterval(interval);
      this.pollingIntervals.delete(channelId);
      console.log(`Stopped polling for channel ${channelId}`);
    }
  }

  /**
   * Start IDLE connection for real-time updates
   */
  async startIdleConnection(channelId: string): Promise<void> {
    const imapClient = this.imapClients.get(channelId);
    if (!imapClient) {
      throw new Error(`No IMAP client found for channel ${channelId}`);
    }

    await imapClient.startIdleConnection('INBOX', async (message) => {
      console.log(`New email received for channel ${channelId}: ${message.subject}`);
      await this.processEmail(channelId, message);
    });
  }

  /**
   * Get OAuth2 authorization URL
   */
  getAuthorizationUrl(channelId: string): string {
    const oauth2Handler = this.oauth2Handlers.get(channelId);
    if (!oauth2Handler) {
      throw new Error(`No OAuth2 handler found for channel ${channelId}`);
    }

    return oauth2Handler.getAuthorizationUrl();
  }

  /**
   * Handle OAuth2 callback
   */
  async handleOAuth2Callback(channelId: string, code: string): Promise<void> {
    const oauth2Handler = this.oauth2Handlers.get(channelId);
    if (!oauth2Handler) {
      throw new Error(`No OAuth2 handler found for channel ${channelId}`);
    }

    const tokens = await oauth2Handler.exchangeCodeForTokens(code);

    // Update channel with tokens
    const { data: channel } = await supabase
      .from('channels')
      .select('settings')
      .eq('id', channelId)
      .single();

    await supabase
      .from('channels')
      .update({
        settings: {
          ...(channel?.settings as any),
          oauth_access_token: tokens.accessToken,
          oauth_refresh_token: tokens.refreshToken,
          oauth_expires_at: tokens.expiresAt?.toISOString(),
        }
      })
      .eq('id', channelId);

    console.log(`OAuth2 tokens saved for channel ${channelId}`);
  }

  /**
   * Send an email through a channel
   */
  async sendEmail(channelId: string, options: EmailSendOptions): Promise<EmailSendResult> {
    const smtpClient = this.smtpClients.get(channelId);
    if (!smtpClient) {
      throw new Error(`No SMTP client found for channel ${channelId}`);
    }

    try {
      const result = await smtpClient.sendEmail(options);
      
      // Log sent email to database
      await supabase
        .from('email_logs')
        .insert({
          channel_id: channelId,
          message_id: result.messageId,
          direction: 'outbound',
          from_address: options.from.address,
          to_addresses: options.to.map(addr => addr.address),
          subject: options.subject,
          sent_at: new Date().toISOString(),
        });

      return result;
    } catch (error) {
      console.error(`Failed to send email through channel ${channelId}:`, error);
      throw error;
    }
  }

  /**
   * Send a reply through a channel
   */
  async sendReply(
    channelId: string,
    originalMessage: {
      messageId: string;
      references?: string[];
      subject: string;
    },
    replyOptions: EmailSendOptions
  ): Promise<EmailSendResult> {
    const smtpClient = this.smtpClients.get(channelId);
    if (!smtpClient) {
      throw new Error(`No SMTP client found for channel ${channelId}`);
    }

    return smtpClient.sendReply(originalMessage, replyOptions);
  }

  /**
   * Forward an email through a channel
   */
  async forwardEmail(
    channelId: string,
    originalMessage: {
      subject: string;
      from: string;
      date: Date;
      body: string;
    },
    forwardOptions: EmailSendOptions
  ): Promise<EmailSendResult> {
    const smtpClient = this.smtpClients.get(channelId);
    if (!smtpClient) {
      throw new Error(`No SMTP client found for channel ${channelId}`);
    }

    return smtpClient.forwardEmail(originalMessage, forwardOptions);
  }

  /**
   * Disconnect a channel
   */
  async disconnectChannel(channelId: string): Promise<void> {
    // Stop polling
    this.stopPolling(channelId);

    // Disconnect IMAP
    const imapClient = this.imapClients.get(channelId);
    if (imapClient) {
      await imapClient.disconnect();
      this.imapClients.delete(channelId);
    }

    // Close SMTP connection
    const smtpClient = this.smtpClients.get(channelId);
    if (smtpClient) {
      await smtpClient.close();
      this.smtpClients.delete(channelId);
    }

    // Remove OAuth2 handler
    this.oauth2Handlers.delete(channelId);

    console.log(`Disconnected email channel ${channelId}`);
  }

  /**
   * Generate webhook signature
   */
  private generateWebhookSignature(payload: any): string {
    const crypto = require('crypto');
    const secret = process.env.EMAIL_WEBHOOK_SECRET || 'dev-secret';
    return crypto
      .createHmac('sha256', secret)
      .update(JSON.stringify(payload))
      .digest('hex');
  }
}

// Export singleton instance
export const emailService = new EmailService(); 