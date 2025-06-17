const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

// Function to extract email content (same as in Gmail sync)
const extractEmailContent = (payload) => {
  const decodeContent = (data) => {
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch (error) {
      console.warn('Failed to decode content:', error);
      return '';
    }
  };

  if (payload.body?.data) {
    const mimeType = payload.mimeType || 'text/plain';
    const content = decodeContent(payload.body.data);
    return { content, contentType: mimeType };
  }

  if (payload.parts && Array.isArray(payload.parts)) {
    let htmlContent = '';
    let textContent = '';
    let foundContentType = 'text/plain';

    for (const part of payload.parts) {
      const partResult = extractEmailContent(part);

      if (part.mimeType === 'text/html' && partResult.content) {
        htmlContent = partResult.content;
        foundContentType = 'text/html';
      } else if (part.mimeType === 'text/plain' && partResult.content) {
        textContent = partResult.content;
      }

      if (part.parts) {
        const nestedResult = extractEmailContent(part);
        if (part.mimeType?.includes('text/html') || nestedResult.contentType === 'text/html') {
          htmlContent = htmlContent || nestedResult.content;
          foundContentType = 'text/html';
        } else if (nestedResult.content) {
          textContent = textContent || nestedResult.content;
        }
      }
    }

    if (htmlContent) {
      return { content: htmlContent, contentType: 'text/html' };
    } else if (textContent) {
      return { content: textContent, contentType: 'text/plain' };
    }
  }

  return { content: '', contentType: 'text/plain' };
};

async function resyncGmailMessages() {
  console.log('\n🔄 Re-syncing Gmail messages for existing tickets...\n');

  try {
    // Get tickets without messages that have Gmail message IDs
    const { data: ticketsToSync } = await supabase
      .from('tickets')
      .select(
        `
        id, 
        number, 
        subject,
        customer_id,
        metadata,
        conversations!inner(
          id,
          external_id,
          metadata
        )
      `
      )
      .order('number', { ascending: false })
      .limit(50);

    if (!ticketsToSync || ticketsToSync.length === 0) {
      console.log('No tickets found to sync');
      return;
    }

    // Filter tickets that have Gmail message IDs but no messages
    const ticketsNeedingMessages = [];

    for (const ticket of ticketsToSync) {
      if (ticket.conversations?.[0]?.external_id) {
        // Check if this ticket has messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', ticket.conversations[0].id);

        if (count === 0) {
          ticketsNeedingMessages.push(ticket);
        }
      }
    }

    console.log(`Found ${ticketsNeedingMessages.length} tickets without messages`);

    if (ticketsNeedingMessages.length === 0) {
      console.log('All tickets already have messages!');
      return;
    }

    // Get Gmail channel with OAuth tokens
    const { data: gmailChannel } = await supabase
      .from('channels')
      .select('id, settings')
      .eq('type', 'email')
      .eq('is_active', true)
      .single();

    if (!gmailChannel) {
      console.error('No active email channel found');
      return;
    }

    // Get OAuth tokens (check both new oauth_tokens table and legacy settings)
    let tokenData = null;

    // Try new oauth_tokens table first
    const { data: newTokenData } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('channel_id', gmailChannel.id)
      .eq('provider', 'gmail')
      .single();

    if (newTokenData?.access_token) {
      tokenData = newTokenData;
      console.log('Using tokens from oauth_tokens table');
    } else if (gmailChannel.settings?.oauth_token) {
      // Fallback to legacy storage
      tokenData = {
        access_token: gmailChannel.settings.oauth_token,
        refresh_token: gmailChannel.settings.refresh_token,
      };
      console.log('Using legacy tokens from channel settings');
    }

    if (!tokenData?.access_token) {
      console.error('No OAuth tokens found for Gmail channel');
      return;
    }

    // Setup Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Process each ticket
    let successCount = 0;
    let errorCount = 0;

    for (const ticket of ticketsNeedingMessages) {
      try {
        const gmailMessageId = ticket.conversations[0].external_id;
        console.log(`\n📧 Processing ticket #${ticket.number} (Gmail ID: ${gmailMessageId})...`);

        // Fetch the Gmail message
        const { data: fullMessage } = await gmail.users.messages.get({
          userId: 'me',
          id: gmailMessageId,
          format: 'full',
        });

        // Extract content
        let emailContent = '';
        let contentType = 'text/plain';

        if (fullMessage.payload) {
          const extracted = extractEmailContent(fullMessage.payload);
          if (extracted.content) {
            emailContent = extracted.content;
            contentType = extracted.contentType;
            console.log(`   Extracted ${contentType} content (${emailContent.length} chars)`);
          } else {
            emailContent = fullMessage.snippet || 'No content available';
          }
        }

        // Get customer info
        const { data: customer } = await supabase
          .from('customers')
          .select('name, email')
          .eq('id', ticket.customer_id)
          .single();

        // Create message using 'system' sender type to avoid trigger
        const { data: message, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: ticket.conversations[0].id,
            content: emailContent,
            sender_type: 'system', // Using system to avoid trigger
            sender_id: ticket.customer_id,
            sender_name: customer?.name || customer?.email || 'Unknown',
            content_type: contentType,
            metadata: {
              gmail_message_id: gmailMessageId,
              original_sender_type: 'customer', // Mark that this was originally from customer
              synced_at: new Date().toISOString(),
              from: fullMessage.payload?.headers?.find((h) => h.name?.toLowerCase() === 'from')
                ?.value,
              date: fullMessage.payload?.headers?.find((h) => h.name?.toLowerCase() === 'date')
                ?.value,
            },
          })
          .select()
          .single();

        if (msgError) {
          console.error(`   ❌ Error creating message:`, msgError);
          errorCount++;
        } else {
          console.log(`   ✅ Message created: ${message.id}`);
          successCount++;
        }
      } catch (error) {
        console.error(`   ❌ Error processing ticket #${ticket.number}:`, error.message);
        errorCount++;
      }
    }

    console.log(`\n📊 Re-sync completed:`);
    console.log(`   ✅ Success: ${successCount} messages`);
    console.log(`   ❌ Errors: ${errorCount} messages`);

    // Now update the sender_type for all synced messages back to 'customer'
    if (successCount > 0) {
      console.log('\n🔄 Updating sender types back to customer...');

      const { error: updateError } = await supabase
        .from('messages')
        .update({ sender_type: 'customer' })
        .eq('sender_type', 'system')
        .not('metadata->original_sender_type', 'is', null);

      if (!updateError) {
        console.log('✅ Sender types updated successfully');
      } else {
        console.error('❌ Error updating sender types:', updateError);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

resyncGmailMessages().catch(console.error);
