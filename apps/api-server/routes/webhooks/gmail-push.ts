import { Router, Request, Response } from 'express';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { gmailSync } from '../../services/gmail-sync';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
);

/**
 * Gmail Push Notification webhook endpoint
 * This endpoint receives notifications from Google Cloud Pub/Sub when new emails arrive
 */
router.post('/gmail-push', async (req: Request, res: Response) => {
  console.log('📧 Gmail Push Notification received:', {
    headers: req.headers,
    body: req.body,
  });

  try {
    // Verify the request comes from Google Cloud Pub/Sub
    const expectedToken = process.env.GMAIL_PUSH_TOKEN;
    const receivedToken = req.query.token || req.headers['x-goog-channel-token'];

    if (expectedToken && receivedToken !== expectedToken) {
      console.warn('⚠️ Invalid push notification token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Parse Pub/Sub message
    let pubsubMessage;

    // Handle both direct Pub/Sub format and Cloud Functions format
    if (req.body.message) {
      // Cloud Functions Pub/Sub trigger format
      pubsubMessage = req.body.message;
    } else if (req.body.subscription) {
      // Direct Pub/Sub webhook format
      pubsubMessage = req.body;
    } else {
      console.warn('⚠️ Unknown push notification format');
      return res.status(400).json({ error: 'Invalid message format' });
    }

    // Decode the message data
    let messageData = {};
    if (pubsubMessage.data) {
      try {
        const decodedData = Buffer.from(pubsubMessage.data, 'base64').toString('utf-8');
        messageData = JSON.parse(decodedData);
        console.log('📧 Decoded message data:', messageData);
      } catch (error) {
        console.warn('⚠️ Could not decode message data:', error);
      }
    }

    // Extract email address from attributes or data
    const emailAddress =
      pubsubMessage.attributes?.emailAddress || (messageData as any)?.emailAddress;

    if (!emailAddress) {
      console.warn('⚠️ No email address found in push notification');
      return res.status(400).json({ error: 'No email address specified' });
    }

    console.log(`📧 Push notification for email: ${emailAddress}`);

    // Find the channel associated with this email address
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, name, settings')
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .ilike('settings->>email_address', emailAddress)
      .single();

    if (channelError || !channel) {
      console.warn(`⚠️ No active Gmail channel found for ${emailAddress}`);
      // Still return 200 to avoid retries from Pub/Sub
      return res.status(200).json({
        success: true,
        message: 'No matching channel found',
        emailAddress,
      });
    }

    console.log(`🔄 Triggering sync for channel ${channel.id} (${channel.name})`);

    // Trigger immediate sync for this channel
    try {
      const syncResult = await gmailSync.syncChannel(channel.id);

      console.log(`✅ Push notification sync completed for ${channel.name}:`, syncResult);

      // Log the push notification event
      await supabase.from('webhook_logs').insert({
        channel_type: 'gmail_push',
        channel_id: channel.id,
        payload: {
          emailAddress,
          messageData,
          pubsubMessage: pubsubMessage.attributes,
          syncResult,
        },
        headers: req.headers as any,
      });

      return res.status(200).json({
        success: true,
        message: 'Gmail sync triggered successfully',
        channelId: channel.id,
        channelName: channel.name,
        syncResult,
      });
    } catch (syncError) {
      console.error(`❌ Gmail sync failed for channel ${channel.id}:`, syncError);

      // Log the error but still return 200 to avoid Pub/Sub retries
      await supabase.from('webhook_logs').insert({
        channel_type: 'gmail_push',
        channel_id: channel.id,
        payload: {
          emailAddress,
          error: syncError instanceof Error ? syncError.message : 'Sync failed',
          messageData,
          pubsubMessage: pubsubMessage.attributes,
        },
        headers: req.headers as any,
      });

      return res.status(200).json({
        success: false,
        message: 'Gmail sync failed',
        channelId: channel.id,
        error: syncError instanceof Error ? syncError.message : 'Unknown error',
      });
    }
  } catch (error) {
    console.error('❌ Gmail push notification processing failed:', error);

    // Return 200 to avoid infinite retries from Pub/Sub
    return res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Processing failed',
    });
  }
});

/**
 * Setup Gmail Push Notifications for a channel
 * This endpoint sets up the Gmail watch API to send notifications to our webhook
 */
router.post('/gmail-push/setup/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;

  try {
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
      return res.status(404).json({ error: 'Gmail channel not found' });
    }

    // Check OAuth tokens
    const settings = channel.settings || {};
    if (!settings.oauth_token || !settings.refresh_token) {
      return res.status(400).json({
        error: 'Gmail channel not properly authenticated. Please re-connect the Gmail account.',
      });
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
      },
    };

    await supabase.from('channels').update({ settings: updatedSettings }).eq('id', channelId);

    return res.json({
      success: true,
      message: 'Gmail Push Notifications setup successfully',
      watchData: watchResponse.data,
    });
  } catch (error) {
    console.error('❌ Failed to setup Gmail Push Notifications:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Setup failed',
    });
  }
});

/**
 * Stop Gmail Push Notifications for a channel
 */
router.post('/gmail-push/stop/:channelId', async (req: Request, res: Response) => {
  const { channelId } = req.params;

  try {
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
      return res.status(404).json({ error: 'Gmail channel not found' });
    }

    const settings = channel.settings || {};
    if (!settings.oauth_token || !settings.refresh_token) {
      return res.status(400).json({
        error: 'Gmail channel not properly authenticated.',
      });
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

    return res.json({
      success: true,
      message: 'Gmail Push Notifications stopped successfully',
    });
  } catch (error) {
    console.error('❌ Failed to stop Gmail Push Notifications:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Stop failed',
    });
  }
});

/**
 * Get Gmail Push Notification status for all channels
 */
router.get('/gmail-push/status', async (req: Request, res: Response) => {
  try {
    console.log('📊 Getting Gmail Push Notification status...');

    // Import the manager here to avoid circular imports
    const { gmailPushManager } = require('../../services/gmail-push-manager');
    const status = await gmailPushManager.getPushNotificationStatus();

    return res.json({
      success: true,
      channels: status,
      summary: {
        total: status.length,
        active: status.filter((c) => c.pushNotificationStatus === 'Active').length,
        expiring: status.filter((c) => c.pushNotificationStatus === 'Expiring soon').length,
        inactive: status.filter((c) => c.pushNotificationStatus === 'Not configured').length,
        expired: status.filter((c) => c.pushNotificationStatus === 'Expired').length,
      },
    });
  } catch (error) {
    console.error('❌ Failed to get Gmail Push Notification status:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Status check failed',
    });
  }
});

export default router;
