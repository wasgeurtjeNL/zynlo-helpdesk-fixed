// Gmail Sync Edge Function for Supabase
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('🔄 Gmail sync Edge Function triggered');

    // Check if Google OAuth is configured
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      console.warn('⚠️ Gmail sync disabled: Google OAuth credentials not configured');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google OAuth credentials not configured',
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // Get all active Gmail channels
    const { data: channels, error: channelsError } = await supabase
      .from('channels')
      .select('id, name, settings, last_sync')
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .eq('is_active', true);

    if (channelsError) {
      throw channelsError;
    }

    // Filter channels with valid OAuth tokens
    const validChannels = (channels || []).filter((channel) => {
      const settings = channel.settings || {};
      return settings.oauth_access_token || settings.oauth_refresh_token;
    });

    console.log(`Found ${validChannels.length} valid Gmail channels to sync`);

    let totalProcessed = 0;
    let totalErrors = 0;
    const results = [];

    // Process each channel
    for (const channel of validChannels) {
      try {
        const result = await syncChannel(channel, supabase, googleClientId, googleClientSecret);
        results.push({
          channelId: channel.id,
          ...result,
        });
        totalProcessed += result.processed;
        totalErrors += result.errors;
      } catch (error) {
        console.error(`Error syncing channel ${channel.id}:`, error);
        results.push({
          channelId: channel.id,
          processed: 0,
          errors: 1,
          error: error.message,
        });
        totalErrors++;
      }
    }

    const response = {
      success: true,
      message: 'Gmail sync completed',
      channels: validChannels.length,
      totalProcessed,
      totalErrors,
      results,
      timestamp: new Date().toISOString(),
    };

    console.log('✅ Gmail sync completed:', response);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('❌ Gmail sync failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function syncChannel(channel: any, supabase: any, clientId: string, clientSecret: string) {
  console.log(`[Gmail Sync] Processing channel: ${channel.id}`);

  const settings = channel.settings || {};

  // Prepare OAuth client
  const oauthUrl = 'https://oauth2.googleapis.com/token';
  const gmailApiUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';

  // Get access token (refresh if needed)
  let accessToken = settings.oauth_access_token;

  // If no access token or it might be expired, try to refresh
  if (!accessToken && settings.oauth_refresh_token) {
    const refreshResponse = await fetch(oauthUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: settings.oauth_refresh_token,
        grant_type: 'refresh_token',
      }),
    });

    if (refreshResponse.ok) {
      const tokenData = await refreshResponse.json();
      accessToken = tokenData.access_token;

      // Update token in database
      await supabase
        .from('channels')
        .update({
          settings: {
            ...settings,
            oauth_access_token: accessToken,
          },
        })
        .eq('id', channel.id);
    }
  }

  if (!accessToken) {
    throw new Error(`No valid access token for channel ${channel.id}`);
  }

  // Calculate time range for sync
  const after = channel.last_sync
    ? Math.floor(new Date(channel.last_sync).getTime() / 1000)
    : Math.floor(Date.now() / 1000 - 86400); // 24 hours ago

  // Search for new messages – unix timestamp + INBOX label
  const query = `in:inbox after:${after}`;

  let pageToken: string | undefined = undefined;
  const messages: Array<{ id: string }> = [];

  do {
    const url = new URL(`${gmailApiUrl}/messages`);
    url.searchParams.set('q', query);
    url.searchParams.set('maxResults', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const listResp = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listResp.ok) {
      const errorText = await listResp.text();
      throw new Error(`List messages failed ${listResp.status}: ${errorText}`);
    }

    const listData = await listResp.json();
    if (listData.messages) messages.push(...listData.messages);
    pageToken = listData.nextPageToken;
  } while (pageToken);

  console.log(`[Gmail Sync] Found ${messages.length} candidate messages for channel ${channel.id}`);

  let processed = 0;
  let errors = 0;
  let actuallyProcessedNewEmails = false;

  // Process each message
  for (const message of messages) {
    try {
      const wasProcessed = await processMessage(message.id, channel, supabase, accessToken);
      if (wasProcessed) {
        processed++;
        actuallyProcessedNewEmails = true;
      }
    } catch (error) {
      console.error(`Error processing message ${message.id}:`, error);
      errors++;
    }
  }

  // Update last sync time ONLY if we actually processed NEW messages (not duplicates)
  if (actuallyProcessedNewEmails) {
    console.log(`Updating last_sync because we processed ${processed} new messages`);
    await supabase
      .from('channels')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', channel.id);
  } else {
    console.log(
      `NOT updating last_sync - no new messages were processed (${messages.length} were duplicates)`
    );
  }

  return { processed, errors };
}

async function processMessage(
  messageId: string,
  channel: any,
  supabase: any,
  accessToken: string
): Promise<boolean> {
  // Get full message
  const messageUrl = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`;

  const messageResponse = await fetch(messageUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!messageResponse.ok) {
    throw new Error(`Failed to fetch message ${messageId}: ${messageResponse.statusText}`);
  }

  const message: GmailMessage = await messageResponse.json();

  // Extract email data
  const headers = message.payload.headers || [];
  const from = getHeader(headers, 'From');
  const subject = getHeader(headers, 'Subject');
  const messageIdHeader = getHeader(headers, 'Message-ID');

  // Parse from email
  const fromMatch = from?.match(/(.*?)<(.+?)>/) || [null, null, from];
  const fromName = fromMatch[1]?.trim().replace(/"/g, '');
  const fromEmail = fromMatch[2] || from;

  // Get message body
  const { text, html } = extractBody(message.payload);

  // Check if ticket already exists
  const { data: existingTicket } = await supabase
    .from('tickets')
    .select('id')
    .eq('metadata->>gmail_message_id', messageId)
    .single();

  if (existingTicket) {
    console.log(`Message ${messageId} already processed, skipping`);
    return false;
  }

  // Find or create customer
  const customerId = await findOrCreateCustomer(fromEmail, fromName, supabase);

  // Create ticket
  const ticketData = {
    subject: subject || 'No Subject',
    priority: 'medium',
    status: 'new',
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
      channel: 'email',
      external_id: messageId,
      metadata: {
        gmail_thread_id: message.threadId,
        message_id: messageIdHeader,
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
    sender_type: 'customer',
    sender_id: fromEmail,
    metadata: {
      from: fromEmail,
      from_name: fromName,
      subject,
      gmail_message_id: messageId,
      received_at: new Date(parseInt(message.internalDate)).toISOString(),
    },
  };

  await supabase.from('messages').insert(messageData);

  console.log(`✅ Created ticket ${ticket.id} from Gmail message ${messageId}`);
  return true;
}

async function findOrCreateCustomer(email: string, name: string | undefined, supabase: any) {
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

function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string | undefined {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

function extractBody(payload: any): { text?: string; html?: string } {
  const decodeContent = (data: string): string => {
    try {
      return atob(data.replace(/-/g, '+').replace(/_/g, '/'));
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
