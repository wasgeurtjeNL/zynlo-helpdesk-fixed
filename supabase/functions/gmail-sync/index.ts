// Gmail Sync Edge Function for Supabase v10 - FIXED PRIORITY MAPPING
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

interface SyncResult {
  processed: number;
  errors: number;
  error?: string;
}

interface ChannelData {
  id: string;
  name: string;
  settings: {
    oauth_access_token?: string;
    oauth_refresh_token?: string;
  };
  last_sync?: string;
}

// 🔧 CRITICAL FIX: Type-safe priority mapping
const PRIORITY_MAPPING: Record<string, 'low' | 'normal' | 'high' | 'urgent'> = {
  low: 'low',
  medium: 'normal', // 🚨 FIXED: Maps medium to normal
  normal: 'normal',
  high: 'high',
  urgent: 'urgent',
};

serve(async (req: Request) => {
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

    console.log('🔄 Gmail sync Edge Function triggered - VERSION 16 WITH DEBUG LOGGING');

    // Check if Google OAuth is configured
    const googleClientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const googleClientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

    console.log(
      `[Debug] Google Client ID exists: ${!!googleClientId}, length: ${googleClientId?.length || 0}`
    );
    console.log(
      `[Debug] Google Client Secret exists: ${!!googleClientSecret}, length: ${googleClientSecret?.length || 0}`
    );

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
    const validChannels = (channels || []).filter((channel: ChannelData) => {
      const settings = channel.settings || {};
      return settings.oauth_access_token || settings.oauth_refresh_token;
    });

    console.log(`Found ${validChannels.length} valid Gmail channels to sync`);

    let totalProcessed = 0;
    let totalErrors = 0;
    const results: Array<SyncResult & { channelId: string }> = [];

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
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.push({
          channelId: channel.id,
          processed: 0,
          errors: 1,
          error: errorMessage,
        });
        totalErrors++;
      }
    }

    const response = {
      success: true,
      message: 'Gmail sync completed',
      version: 17, // 🚨 FIXED: OAuth token refresh logic to always refresh when refresh token available
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
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
        version: 17,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});

async function syncChannel(
  channel: ChannelData,
  supabase: any,
  clientId: string,
  clientSecret: string
): Promise<SyncResult> {
  console.log(`[Gmail Sync v17] Processing channel: ${channel.id}`);

  const settings = channel.settings || {};
  console.log(`[Debug] Channel settings keys: ${Object.keys(settings).join(', ')}`);
  console.log(
    `[Debug] Has access token: ${!!settings.oauth_access_token}, Has refresh token: ${!!settings.oauth_refresh_token}`
  );

  // Prepare OAuth client
  const oauthUrl = 'https://oauth2.googleapis.com/token';
  const gmailApiUrl = 'https://gmail.googleapis.com/gmail/v1/users/me';

  // Get access token (refresh if needed)
  let accessToken = settings.oauth_access_token;

  // 🚨 CRITICAL FIX: Always try to refresh if we have a refresh token
  // This handles both missing and expired access tokens
  if (settings.oauth_refresh_token) {
    console.log(`[Token Refresh] Attempting to refresh access token for channel ${channel.id}`);
    try {
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
        console.log(
          `[Token Refresh] Successfully refreshed access token for channel ${channel.id}`
        );

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
        console.log(`[Token Refresh] Updated access token in database for channel ${channel.id}`);
      } else {
        const errorText = await refreshResponse.text();
        console.error(
          `[Token Refresh] Failed to refresh token for channel ${channel.id}:`,
          errorText
        );
        throw new Error(`Token refresh failed: ${refreshResponse.status} ${errorText}`);
      }
    } catch (error) {
      console.error(`[Token Refresh] Failed to refresh token for channel ${channel.id}:`, error);
      throw new Error(
        `Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  if (!accessToken) {
    throw new Error(`No valid access token for channel ${channel.id} - no refresh token available`);
  }

  console.log(
    `[Gmail API] Using access token for channel ${channel.id}: ${accessToken.substring(0, 20)}...`
  );

  // Calculate time range for sync
  const after = channel.last_sync
    ? Math.floor(new Date(channel.last_sync).getTime() / 1000)
    : Math.floor(Date.now() / 1000 - 86400); // 24 hours ago

  // Search for new messages – unix timestamp + INBOX label
  const query = `in:inbox after:${after}`;

  let pageToken: string | undefined = undefined;
  const messages: Array<{ id: string }> = [];

  try {
    do {
      const url = new URL(`${gmailApiUrl}/messages`);
      url.searchParams.set('q', query);
      url.searchParams.set('maxResults', '100');
      if (pageToken) url.searchParams.set('pageToken', pageToken);

      console.log(`[Gmail API] Fetching messages with query: ${query}`);
      const listResp = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!listResp.ok) {
        const errorText = await listResp.text();
        console.error(`[Gmail API] List messages failed ${listResp.status}: ${errorText}`);
        throw new Error(`List messages failed ${listResp.status}: ${errorText}`);
      }

      const listData = await listResp.json();
      if (listData.messages) messages.push(...listData.messages);
      pageToken = listData.nextPageToken;
      console.log(
        `[Gmail API] Fetched ${listData.messages?.length || 0} messages, pageToken: ${pageToken}`
      );
    } while (pageToken);
  } catch (error) {
    console.error(`[Gmail API] Failed to list messages for channel ${channel.id}:`, error);
    throw new Error(`Gmail API error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log(
    `[Gmail Sync v17] Found ${messages.length} candidate messages for channel ${channel.id}`
  );

  let processed = 0;
  let errors = 0;
  let actuallyProcessedNewEmails = false;

  // Process each message with better error handling
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
      // Continue processing other messages instead of failing completely
    }
  }

  // Update last sync time ONLY if we actually processed NEW messages (not duplicates)
  if (actuallyProcessedNewEmails) {
    console.log(`Updating last_sync because we processed ${processed} new messages`);
    try {
      await supabase
        .from('channels')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', channel.id);
    } catch (error) {
      console.error(`Failed to update last_sync for channel ${channel.id}:`, error);
      // Don't throw here - sync was successful even if timestamp update failed
    }
  } else {
    console.log(
      `NOT updating last_sync - no new messages were processed (${messages.length} were duplicates)`
    );
  }

  return { processed, errors };
}

async function processMessage(
  messageId: string,
  channel: ChannelData,
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

  // Parse from email with better error handling
  if (!from) {
    throw new Error(`Message ${messageId} has no From header`);
  }

  const fromMatch = from.match(/(.*?)<(.+?)>/) || [null, null, from];
  const fromName = fromMatch[1]?.trim().replace(/"/g, '') || undefined;
  const fromEmail = fromMatch[2] || from;

  if (!fromEmail) {
    throw new Error(`Could not extract email from From header: ${from}`);
  }

  // 🔧 IMPROVED: Better message body extraction
  const { text, html } = extractBody(message.payload);
  console.log(
    `[Body Extraction] Message ${messageId}: text=${text?.length || 0} chars, html=${html?.length || 0} chars, snippet=${message.snippet?.length || 0} chars`
  );

  // 🎯 ENHANCED: Preserve original HTML while also creating cleaned text version
  const isHtmlContent = !!html;
  let finalContent: string;
  let cleanedTextContent: string;
  let contentType: string;

  if (isHtmlContent && html) {
    // For HTML emails: preserve original HTML as main content
    console.log(`[Debug] Processing HTML email, original length: ${html.length}`);
    try {
      finalContent = cleanHtmlContent(html); // Light cleaning of HTML (remove tracking, etc.)
      console.log(`[Debug] cleanHtmlContent completed, result length: ${finalContent.length}`);
    } catch (error) {
      console.error(`[Debug] cleanHtmlContent failed:`, error);
      finalContent = html; // Fallback to original HTML
    }

    try {
      cleanedTextContent = cleanEmailContent(html, true); // Convert to clean text for search/preview
      console.log(
        `[Debug] cleanEmailContent completed, result length: ${cleanedTextContent.length}`
      );
    } catch (error) {
      console.error(`[Debug] cleanEmailContent failed:`, error);
      cleanedTextContent = html; // Fallback
    }

    contentType = 'text/html';
    console.log(
      `[HTML Email] Original HTML: ${html.length} chars, Cleaned HTML: ${finalContent.length} chars, Text version: ${cleanedTextContent.length} chars`
    );
  } else {
    // For text emails: use cleaned text
    const rawTextContent = text || message.snippet || '';
    console.log(`[Debug] Processing text email, original length: ${rawTextContent.length}`);
    try {
      finalContent = cleanEmailContent(rawTextContent, false);
      console.log(
        `[Debug] cleanEmailContent for text completed, result length: ${finalContent.length}`
      );
    } catch (error) {
      console.error(`[Debug] cleanEmailContent for text failed:`, error);
      finalContent = rawTextContent; // Fallback
    }
    cleanedTextContent = finalContent;
    contentType = 'text/plain';
    console.log(
      `[Text Email] Original: ${rawTextContent.length} chars, Cleaned: ${finalContent.length} chars`
    );
  }

  // Create preview from cleaned text (not HTML)
  console.log(`[Debug] Creating preview from text length: ${cleanedTextContent.length}`);
  const contentPreview = extractEmailPreview(cleanedTextContent);
  console.log(`[Debug] Preview created: "${contentPreview.substring(0, 100)}..."`);

  console.log(
    `[Content Processing] Content type: ${contentType}, Final content: ${finalContent.length} chars, Preview: "${contentPreview}"`
  );

  // 🔧 FIX: Use safer query to check for existing ticket
  const { data: existingTickets, error: checkError } = await supabase
    .from('tickets')
    .select('id')
    .eq('metadata->>gmail_message_id', messageId)
    .limit(1);

  if (checkError) {
    console.warn(`Error checking for existing ticket: ${checkError.message}`);
    // Continue anyway - better to risk duplicate than miss emails
  }

  if (existingTickets && existingTickets.length > 0) {
    console.log(`Message ${messageId} already processed, skipping`);
    return false;
  }

  // Find or create customer
  const customerId = await findOrCreateCustomer(fromEmail, fromName, supabase);

  // 🚨 CRITICAL FIX: Use correct priority enum value
  const priorityValue = PRIORITY_MAPPING['medium']; // Maps to 'normal'
  console.log(`Using priority value: ${priorityValue} (mapped from medium)`);

  const ticketData = {
    subject: subject || 'No Subject',
    priority: priorityValue,
    status: 'new' as const,
    customer_id: customerId,
    metadata: {
      gmail_message_id: messageId,
      gmail_thread_id: message.threadId,
      channel_id: channel.id,
      created_via: 'gmail_sync_v16',
    },
  };

  const { data: ticket, error: ticketError } = await supabase
    .from('tickets')
    .insert(ticketData)
    .select()
    .single();

  if (ticketError) {
    console.error(`Ticket creation failed for message ${messageId}:`, ticketError);
    throw new Error(`Failed to create ticket: ${ticketError.message}`);
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
    throw new Error(`Failed to create conversation: ${conversationError.message}`);
  }

  // 🚨 ENHANCED: Save both HTML and text content with proper metadata
  const messageData = {
    conversation_id: conversation.id,
    content: finalContent, // Original HTML or cleaned text
    content_type: contentType,
    sender_type: 'customer',
    sender_id: fromEmail,
    sender_name: fromName,
    is_internal: false,
    metadata: {
      from: fromEmail,
      from_name: fromName,
      subject,
      gmail_message_id: messageId,
      received_at: new Date(parseInt(message.internalDate)).toISOString(),
      content_processing: {
        is_html_email: isHtmlContent,
        original_html_length: html?.length || 0,
        original_text_length: text?.length || 0,
        final_content_length: finalContent.length,
        cleaned_text_length: cleanedTextContent.length,
        preview: contentPreview,
      },
      // 🎯 NEW: Save cleaned text version for search/display options
      text_content: cleanedTextContent, // Always available as fallback
      original_snippet: message.snippet,
    },
  };

  console.log(
    `[Message Creation] Creating message with ${contentType} content length: ${finalContent.length}, text fallback: ${cleanedTextContent.length}`
  );

  const { error: messageError } = await supabase.from('messages').insert(messageData);

  if (messageError) {
    console.error(`Message creation failed for ${messageId}:`, messageError);
    throw new Error(`Failed to create message: ${messageError.message}`);
  }

  console.log(
    `✅ Created ticket ${ticket.id} from Gmail message ${messageId} with priority ${priorityValue} and cleaned content length ${finalContent.length}`
  );
  return true;
}

async function findOrCreateCustomer(
  email: string,
  name: string | undefined,
  supabase: any
): Promise<string> {
  // Try to find existing customer
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    // PGRST116 = no rows returned, which is fine
    throw new Error(`Error finding customer: ${findError.message}`);
  }

  if (existingCustomer) {
    return existingCustomer.id;
  }

  // Create new customer
  const customerData = {
    email,
    name: name || email.split('@')[0],
    metadata: {
      created_via: 'gmail_sync_v16',
    },
  };

  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert(customerData)
    .select('id')
    .single();

  if (createError) {
    throw new Error(`Failed to create customer: ${createError.message}`);
  }

  return newCustomer.id;
}

function getHeader(
  headers: Array<{ name: string; value: string }>,
  name: string
): string | undefined {
  return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value;
}

// 🎯 IMPROVED: Enhanced body extraction with better debugging
function extractBody(payload: any): { text?: string; html?: string } {
  const decodeContent = (data: string): string => {
    try {
      // Gmail uses URL-safe Base64 encoding
      const normalized = data.replace(/-/g, '+').replace(/_/g, '/');
      // Add padding if needed
      const padded = normalized + '==='.slice(0, (4 - (normalized.length % 4)) % 4);
      return atob(padded);
    } catch (error) {
      console.warn('Failed to decode content:', error);
      return '';
    }
  };

  console.log(`[Body Extraction] Payload mimeType: ${payload.mimeType}`);

  // Single part message
  if (payload.body?.data) {
    console.log(`[Body Extraction] Found single part body, size: ${payload.body.data.length}`);
    const content = decodeContent(payload.body.data);
    const result = payload.mimeType?.includes('html') ? { html: content } : { text: content };
    console.log(`[Body Extraction] Single part result: ${Object.keys(result).join(', ')}`);
    return result;
  }

  // Multi-part message
  if (payload.parts) {
    console.log(`[Body Extraction] Found ${payload.parts.length} parts`);
    let text = '';
    let html = '';

    for (const [index, part] of payload.parts.entries()) {
      console.log(
        `[Body Extraction] Part ${index}: mimeType=${part.mimeType}, hasData=${!!part.body?.data}`
      );

      if (part.body?.data) {
        const content = decodeContent(part.body.data);
        console.log(`[Body Extraction] Part ${index} decoded content length: ${content.length}`);

        if (part.mimeType?.includes('html')) {
          html = content;
        } else if (part.mimeType?.includes('text') && !part.mimeType?.includes('html')) {
          text = content;
        }
      }

      // Handle nested parts
      if (part.parts) {
        console.log(`[Body Extraction] Part ${index} has ${part.parts.length} sub-parts`);
        const nestedResult = extractBody(part);
        if (nestedResult.text && !text) text = nestedResult.text;
        if (nestedResult.html && !html) html = nestedResult.html;
      }
    }

    console.log(
      `[Body Extraction] Multi-part result - text: ${text.length} chars, html: ${html.length} chars`
    );
    return { text, html };
  }

  console.log(`[Body Extraction] No body data found`);
  return {};
}

// 🎯 IMPROVED: Clean and format email content while preserving readability
function cleanEmailContent(content: string, isHtml: boolean = false): string {
  if (!content) return '';

  let cleaned = content;

  // If HTML, convert to text but preserve structure better
  if (isHtml) {
    // Preserve line breaks and paragraph structure
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Normalize line endings first
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove quoted replies (everything after common quote indicators)
  const quotePatterns = [
    /\n\s*Op\s+.+?\s+schreef\s+.+?:/i, // Dutch: "Op [date] schreef [person]:"
    /\n\s*On\s+.+?\s+wrote:/i, // English: "On [date] wrote:"
    /\n\s*Van:\s*.+/i, // Dutch: "Van: [person]"
    /\n\s*From:\s*.+/i, // English: "From: [person]"
    /\n\s*-----+.*?-----+/i, // Separator lines
    /\n\s*_{10,}/i, // Underscore separators
    /\n\s*-{10,}/i, // Dash separators
  ];

  for (const pattern of quotePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(0, match.index || 0).trim();
      break;
    }
  }

  // Remove common email signatures and footers
  const signaturePatterns = [
    /\n\s*Met\s+vriendelijke\s+groet[,\s]*/i, // Dutch signature
    /\n\s*Best\s+regards[,\s]*/i, // English signature
    /\n\s*Kind\s+regards[,\s]*/i, // English signature
    /\n\s*Ticket\s+referentie:\s*#\d+/i, // Ticket reference
    /\n\s*Ticket\s+#\d+/i, // Ticket number
  ];

  for (const pattern of signaturePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Handle quoted lines more carefully
  const lines = cleaned.split('\n');
  const cleanedLines = [];
  let consecutiveQuotes = 0;
  let skippingQuotes = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) {
      consecutiveQuotes++;
      if (consecutiveQuotes <= 2 && !skippingQuotes) {
        // Keep first 2 lines of quoted content for context
        cleanedLines.push(`💬 ${trimmed.substring(1).trim()}`);
      } else if (consecutiveQuotes === 3) {
        cleanedLines.push('💬 ...');
        skippingQuotes = true;
      }
    } else {
      consecutiveQuotes = 0;
      skippingQuotes = false;
      // Keep all non-quoted lines, including empty ones for spacing
      cleanedLines.push(line);
    }
  }

  // Join with proper spacing
  cleaned = cleanedLines.join('\n');

  // Clean up excessive whitespace but preserve intentional spacing
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n') // Max 3 consecutive newlines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces
    .replace(/\n[ \t]+/g, '\n') // Remove leading spaces on new lines
    .trim();

  // If cleaned content is too short compared to original, use gentler cleaning
  if (cleaned.length < 20 && content.length > 50) {
    console.log('[Content Cleaning] Cleaned content too short, using gentler approach');
    // Just do basic HTML cleanup without removing quotes
    cleaned = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return cleaned;
}

// 🎯 NEW: Extract the most relevant part of the email for preview
function extractEmailPreview(content: string, maxLength: number = 200): string {
  if (!content) return '';

  // Remove quoted content for preview
  const lines = content.split('\n');
  const previewLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('>') && !trimmed.startsWith('💬') && trimmed.length > 3) {
      previewLines.push(trimmed);
      if (previewLines.join(' ').length > maxLength) break;
    }
  }

  let preview = previewLines.join(' ').substring(0, maxLength);
  if (preview.length === maxLength) {
    preview += '...';
  }

  return preview || content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
}

// 🎯 NEW: Light HTML cleaning - preserves HTML structure but removes tracking and cleans up
function cleanHtmlContent(htmlContent: string): string {
  if (!htmlContent) return '';

  let cleaned = htmlContent;

  // Remove tracking URLs and pixels (common in newsletters/automated emails)
  cleaned = cleaned
    .replace(/https?:\/\/post\.eu\.spmailfeedback\.com[^\s"'>]*/gi, '') // Remove specific tracking
    .replace(/https?:\/\/[^\s"'>]*track[^\s"'>]*/gi, '') // Remove tracking URLs
    .replace(/https?:\/\/[^\s"'>]*pixel[^\s"'>]*/gi, '') // Remove tracking pixels
    .replace(/<img[^>]*src=["'][^"']*pixel[^"']*["'][^>]*>/gi, '') // Remove pixel images
    .replace(/<img[^>]*src=["'][^"']*track[^"']*["'][^>]*>/gi, '') // Remove tracking images
    .replace(/<img[^>]*width=["']1["'][^>]*height=["']1["'][^>]*>/gi, '') // Remove 1x1 tracking pixels
    .replace(/<img[^>]*height=["']1["'][^>]*width=["']1["'][^>]*>/gi, ''); // Remove 1x1 tracking pixels

  // Clean up excessive whitespace in HTML while preserving structure
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/>\s+</g, '><') // Remove spaces between HTML tags
    .trim();

  // Remove empty elements that might be left over
  cleaned = cleaned
    .replace(/<p>\s*<\/p>/gi, '') // Empty paragraphs
    .replace(/<div>\s*<\/div>/gi, '') // Empty divs
    .replace(/<span>\s*<\/span>/gi, ''); // Empty spans

  return cleaned;
}
