import { google } from 'googleapis';
import { supabase } from '../utils/supabase';

export class GmailPushManager {
  /**
   * Set up Gmail Push Notifications for all active Gmail channels
   */
  async setupPushNotificationsForAllChannels(): Promise<void> {
    try {
      console.log('🔧 Setting up Gmail Push Notifications for all channels...');

      // Check if required environment variables are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn(
          '⚠️ Gmail Push Notifications setup skipped: Google OAuth credentials not configured'
        );
        return;
      }

      if (!process.env.GOOGLE_CLOUD_PROJECT_ID || !process.env.GMAIL_PUBSUB_TOPIC) {
        console.warn(
          '⚠️ Gmail Push Notifications setup skipped: Google Cloud Pub/Sub not configured'
        );
        console.warn('   Required: GOOGLE_CLOUD_PROJECT_ID and GMAIL_PUBSUB_TOPIC');
        return;
      }

      // Get all active Gmail channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('id, name, settings')
        .eq('type', 'email')
        .eq('provider', 'gmail')
        .eq('is_active', true);

      if (error) {
        console.error('❌ Failed to fetch Gmail channels:', error);
        return;
      }

      if (!channels || channels.length === 0) {
        console.log('📭 No active Gmail channels found');
        return;
      }

      console.log(`📧 Found ${channels.length} active Gmail channels`);

      // Set up push notifications for each channel
      for (const channel of channels) {
        try {
          await this.setupPushNotificationForChannel(channel.id);
          console.log(`✅ Push notifications set up for channel: ${channel.name}`);
        } catch (error) {
          console.error(
            `❌ Failed to setup push notifications for channel ${channel.name}:`,
            error
          );
        }
      }

      console.log('🎉 Gmail Push Notifications setup completed');
    } catch (error) {
      console.error('❌ Failed to setup Gmail Push Notifications:', error);
    }
  }

  /**
   * Set up Gmail Push Notifications for a specific channel
   */
  async setupPushNotificationForChannel(channelId: string): Promise<any> {
    console.log(`🔧 Setting up Gmail Push Notifications for channel: ${channelId}`);

    // Get channel from database
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .single();

    if (channelError || !channel) {
      throw new Error('Gmail channel not found');
    }

    // Check OAuth tokens
    const settings = channel.settings || {};
    if (!settings.oauth_token || !settings.refresh_token) {
      throw new Error(
        'Gmail channel not properly authenticated. Please re-connect the Gmail account.'
      );
    }

    // Check if push notifications are already set up and still valid
    if (settings.gmail_watch?.expiration) {
      const expiration = new Date(parseInt(settings.gmail_watch.expiration));
      const now = new Date();
      const hoursUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilExpiration > 24) {
        // If more than 24 hours left
        console.log(
          `⏰ Push notifications already set up for channel ${channel.name} (expires in ${Math.round(hoursUntilExpiration)} hours)`
        );
        return settings.gmail_watch;
      } else {
        console.log(`🔄 Push notifications expiring soon for channel ${channel.name}, renewing...`);
      }
    }

    // Setup Gmail API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: settings.oauth_token,
      refresh_token: settings.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Stop existing watch if any
    try {
      await gmail.users.stop({ userId: 'me' });
      console.log('🛑 Stopped existing Gmail watch');
    } catch (stopError) {
      // Ignore errors when stopping (might not exist)
      console.log('ℹ️ No existing watch to stop');
    }

    // Setup push notifications
    const topicName = process.env.GMAIL_PUBSUB_TOPIC || 'gmail-notifications';
    const watchRequest = {
      userId: 'me',
      requestBody: {
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/${topicName}`,
        labelIds: ['INBOX'], // Only watch inbox
        labelFilterAction: 'include',
      },
    };

    const watchResponse = await gmail.users.watch(watchRequest);

    console.log('📧 Gmail watch setup successful:', watchResponse.data);

    // Store the watch details in channel settings
    const updatedSettings = {
      ...settings,
      gmail_watch: {
        historyId: watchResponse.data.historyId,
        expiration: watchResponse.data.expiration,
        setupAt: new Date().toISOString(),
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/${topicName}`,
      },
    };

    await supabase.from('channels').update({ settings: updatedSettings }).eq('id', channelId);

    return watchResponse.data;
  }

  /**
   * Stop Gmail Push Notifications for a specific channel
   */
  async stopPushNotificationForChannel(channelId: string): Promise<void> {
    console.log(`🛑 Stopping Gmail Push Notifications for channel: ${channelId}`);

    // Get channel from database
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .single();

    if (channelError || !channel) {
      throw new Error('Gmail channel not found');
    }

    const settings = channel.settings || {};
    if (!settings.oauth_token || !settings.refresh_token) {
      throw new Error('Gmail channel not properly authenticated.');
    }

    // Setup Gmail API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: settings.oauth_token,
      refresh_token: settings.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Stop watching
    await gmail.users.stop({ userId: 'me' });

    console.log('🛑 Gmail watch stopped successfully');

    // Remove watch details from channel settings
    const updatedSettings = { ...settings };
    delete updatedSettings.gmail_watch;

    await supabase.from('channels').update({ settings: updatedSettings }).eq('id', channelId);
  }

  /**
   * Check and renew expiring Gmail Push Notifications
   * Should be called periodically (e.g., daily) to ensure notifications don't expire
   */
  async renewExpiringPushNotifications(): Promise<void> {
    try {
      console.log('🔍 Checking for expiring Gmail Push Notifications...');

      // Get all active Gmail channels with push notifications
      const { data: channels, error } = await supabase
        .from('channels')
        .select('id, name, settings')
        .eq('type', 'email')
        .eq('provider', 'gmail')
        .eq('is_active', true)
        .not('settings->gmail_watch', 'is', null);

      if (error) {
        console.error('❌ Failed to fetch Gmail channels:', error);
        return;
      }

      if (!channels || channels.length === 0) {
        console.log('📭 No Gmail channels with push notifications found');
        return;
      }

      console.log(`📧 Checking ${channels.length} Gmail channels for expiring notifications`);

      for (const channel of channels) {
        try {
          const settings = channel.settings || {};
          const gmailWatch = settings.gmail_watch;

          if (!gmailWatch?.expiration) {
            console.log(`⚠️ Channel ${channel.name}: No expiration found, setting up fresh`);
            await this.setupPushNotificationForChannel(channel.id);
            continue;
          }

          const expiration = new Date(parseInt(gmailWatch.expiration));
          const now = new Date();
          const hoursUntilExpiration = (expiration.getTime() - now.getTime()) / (1000 * 60 * 60);

          if (hoursUntilExpiration <= 48) {
            // Renew if less than 48 hours left
            console.log(
              `🔄 Renewing push notifications for channel ${channel.name} (expires in ${Math.round(hoursUntilExpiration)} hours)`
            );
            await this.setupPushNotificationForChannel(channel.id);
          } else {
            console.log(
              `✅ Channel ${channel.name}: Push notifications valid (expires in ${Math.round(hoursUntilExpiration)} hours)`
            );
          }
        } catch (error) {
          console.error(
            `❌ Failed to check/renew push notifications for channel ${channel.name}:`,
            error
          );
        }
      }
    } catch (error) {
      console.error('❌ Failed to renew expiring push notifications:', error);
    }
  }

  /**
   * Get the status of Gmail Push Notifications for all channels
   */
  async getPushNotificationStatus(): Promise<any[]> {
    const { data: channels, error } = await supabase
      .from('channels')
      .select('id, name, settings, is_active')
      .eq('type', 'email')
      .eq('provider', 'gmail');

    if (error) {
      console.error('❌ Failed to fetch Gmail channels:', error);
      return [];
    }

    return (channels || []).map((channel) => {
      const settings = channel.settings || {};
      const gmailWatch = settings.gmail_watch;

      let status = 'Not configured';
      let expiresAt = null;
      let hoursUntilExpiration = null;

      if (gmailWatch?.expiration) {
        expiresAt = new Date(parseInt(gmailWatch.expiration));
        const now = new Date();
        hoursUntilExpiration = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60);

        if (hoursUntilExpiration > 0) {
          status = hoursUntilExpiration > 48 ? 'Active' : 'Expiring soon';
        } else {
          status = 'Expired';
        }
      }

      return {
        channelId: channel.id,
        channelName: channel.name,
        isActive: channel.is_active,
        pushNotificationStatus: status,
        expiresAt,
        hoursUntilExpiration: hoursUntilExpiration ? Math.round(hoursUntilExpiration) : null,
        setupAt: gmailWatch?.setupAt,
        historyId: gmailWatch?.historyId,
      };
    });
  }
}

// Create singleton instance
export const gmailPushManager = new GmailPushManager();
