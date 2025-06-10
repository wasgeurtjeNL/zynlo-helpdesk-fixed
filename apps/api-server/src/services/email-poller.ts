import { emailService } from './email/email-service';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class EmailPoller {
  private isRunning = false;
  private pollingInterval = 60000; // 1 minute default

  /**
   * Start the email poller
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('Email poller is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting email poller...');

    // Initialize all email channels
    await this.initializeChannels();

    // Start periodic check for new channels
    setInterval(() => {
      this.checkForNewChannels().catch(console.error);
    }, 300000); // Check every 5 minutes
  }

  /**
   * Initialize all active email channels
   */
  private async initializeChannels(): Promise<void> {
    try {
      // Get all active email channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('*')
        .eq('type', 'email')
        .eq('is_active', true);

      if (error) {
        console.error('Failed to fetch email channels:', error);
        return;
      }

      if (!channels || channels.length === 0) {
        console.log('No active email channels found');
        return;
      }

      // Initialize each channel
      for (const channel of channels) {
        try {
          await this.initializeChannel(channel);
        } catch (error) {
          console.error(`Failed to initialize channel ${channel.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to initialize email channels:', error);
    }
  }

  /**
   * Initialize a single email channel
   */
  private async initializeChannel(channel: any): Promise<void> {
    const settings = channel.settings || {};
    
    // Skip if no email address configured
    if (!settings.email_address) {
      console.log(`Channel ${channel.id} has no email address configured`);
      return;
    }

    // Get OAuth tokens for this channel if it's a Gmail channel
    let oauthTokens = null;
    if (channel.provider === 'gmail') {
      // Check if Google OAuth credentials are configured in environment
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.log(`⚠️ Skipping Gmail OAuth channel ${channel.id}: Google OAuth credentials not configured in environment`);
        return;
      }

      // Fetch OAuth tokens from oauth_tokens table
      const { data: tokenData, error: tokenError } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('channel_id', channel.id)
        .eq('provider', 'gmail')
        .single();

      if (tokenError || !tokenData) {
        console.log(`⚠️ Skipping Gmail channel ${channel.id}: No OAuth tokens found in database`);
        return;
      }

      oauthTokens = tokenData;
    }

    const config = {
      id: channel.id,
      provider: channel.provider || 'other',
      emailAddress: settings.email_address,
      imapHost: settings.imap_host,
      imapPort: settings.imap_port,
      imapUsername: settings.imap_username,
      imapPassword: settings.imap_password,
      smtpHost: settings.smtp_host,
      smtpPort: settings.smtp_port,
      smtpSecure: settings.smtp_secure,
      smtpUsername: settings.smtp_username,
      smtpPassword: settings.smtp_password,
      // Use environment variables for OAuth client credentials
      oauth2ClientId: channel.provider === 'gmail' ? process.env.GOOGLE_CLIENT_ID : settings.oauth2_client_id,
      oauth2ClientSecret: channel.provider === 'gmail' ? process.env.GOOGLE_CLIENT_SECRET : settings.oauth2_client_secret,
      // Use refresh token from oauth_tokens table
      oauth2RefreshToken: oauthTokens?.refresh_token || settings.oauth_refresh_token,
      webhookUrl: settings.webhook_url,
    };

    // Initialize the channel
    await emailService.initializeChannel(config);

    // Start polling or IDLE based on provider
    if (channel.provider === 'gmail' || channel.provider === 'outlook') {
      // Use IDLE for real-time updates
      try {
        await emailService.startIdleConnection(channel.id);
        console.log(`Started IDLE connection for channel ${channel.id}`);
      } catch (error) {
        // Fallback to polling if IDLE fails
        console.error(`IDLE failed for channel ${channel.id}, falling back to polling:`, error);
        emailService.startPolling(channel.id, this.pollingInterval);
      }
    } else {
      // Use polling for other providers
      emailService.startPolling(channel.id, this.pollingInterval);
    }
  }

  /**
   * Check for new channels that need initialization
   */
  private async checkForNewChannels(): Promise<void> {
    try {
      const { data: channels, error } = await supabase
        .from('channels')
        .select('id')
        .eq('type', 'email')
        .eq('is_active', true);

      if (error || !channels) return;

      for (const channel of channels) {
        // Check if channel is already initialized
        // This is a simplified check - in production you might want to track this better
        try {
          await emailService.fetchNewEmails(channel.id);
        } catch (error) {
          // Channel not initialized, initialize it
          console.log(`Found uninitialized channel ${channel.id}, initializing...`);
          const { data: fullChannel } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channel.id)
            .single();
          
          if (fullChannel) {
            await this.initializeChannel(fullChannel);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check for new channels:', error);
    }
  }

  /**
   * Stop the email poller
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('Email poller is not running');
      return;
    }

    this.isRunning = false;
    console.log('Stopping email poller...');

    // Get all channels and disconnect them
    const { data: channels } = await supabase
      .from('channels')
      .select('id')
      .eq('type', 'email');

    if (channels) {
      for (const channel of channels) {
        await emailService.disconnectChannel(channel.id);
      }
    }
  }
}

// Export singleton instance
export const emailPoller = new EmailPoller(); 