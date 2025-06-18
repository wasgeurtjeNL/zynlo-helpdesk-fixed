const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OAuth client
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/gmail/callback`
);

async function fixMissingMessages() {
  console.log('🔍 Finding tickets with missing messages...\n');

  try {
    // Find tickets created by gmail_sync that have no messages
    const { data: problemTickets } = await supabase
      .from('tickets')
      .select('id, number, subject, metadata')
      .eq('metadata->>created_via', 'gmail_sync_v17')
      .order('created_at', { ascending: false })
      .limit(50);

    console.log(`Found ${problemTickets?.length || 0} tickets to check\n`);

    const ticketsToFix = [];

    // Check each ticket for messages
    for (const ticket of problemTickets || []) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, external_id')
        .eq('ticket_id', ticket.id)
        .single();

      if (conversation) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id);

        if (count === 0) {
          ticketsToFix.push({
            ticket,
            conversation,
            gmailMessageId: ticket.metadata?.gmail_message_id,
          });
        }
      }
    }

    console.log(`\n🔧 Found ${ticketsToFix.length} tickets that need messages\n`);

    if (ticketsToFix.length === 0) {
      console.log('✅ All tickets have messages!');
      return;
    }

    // Get Gmail channel
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single();

    if (!channel || !channel.settings?.refresh_token) {
      console.error('❌ No active Gmail channel found with OAuth tokens');
      return;
    }

    // Set up OAuth
    oauth2Client.setCredentials({
      access_token: channel.settings.oauth_token,
      refresh_token: channel.settings.refresh_token,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Fix each ticket
    for (const { ticket, conversation, gmailMessageId } of ticketsToFix) {
      console.log(`\n🎫 Fixing ticket #${ticket.number}: ${ticket.subject}`);

      if (!gmailMessageId) {
        console.log('   ⚠️  No Gmail message ID found, skipping...');
        continue;
      }

      try {
        // Fetch the Gmail message
        const response = await gmail.users.messages.get({
          userId: 'me',
          id: gmailMessageId,
          format: 'full',
        });

        const message = response.data;

        // Extract email data
        const headers = message.payload?.headers || [];
        const from = headers.find((h) => h.name?.toLowerCase() === 'from')?.value;
        const subject = headers.find((h) => h.name?.toLowerCase() === 'subject')?.value;

        // Parse from email
        const fromMatch = from?.match(/(.*?)<(.+?)>/) || [null, null, from];
        const fromName = fromMatch[1]?.trim().replace(/"/g, '');
        const fromEmail = fromMatch[2] || from;

        // Extract body
        const { text, html } = extractBody(message.payload);

        // Create the missing message
        const messageData = {
          conversation_id: conversation.id,
          content: html || text || message.snippet || '',
          content_type: html ? 'text/html' : 'text/plain',
          sender_type: 'customer',
          sender_id: fromEmail,
          metadata: {
            from: { email: fromEmail, name: fromName },
            subject,
            gmail_message_id: gmailMessageId,
            received_at: new Date(parseInt(message.internalDate)).toISOString(),
            fixed_by: 'fix-missing-messages-script',
            originalHtml: html || null,
          },
          created_at: new Date(parseInt(message.internalDate)).toISOString(),
        };

        const { error } = await supabase.from('messages').insert(messageData);

        if (error) {
          console.error(`   ❌ Failed to create message:`, error);
        } else {
          console.log(`   ✅ Message created successfully`);
          console.log(`   📧 From: ${fromName} <${fromEmail}>`);
          console.log(`   📝 Content: ${(html || text || '').substring(0, 100)}...`);
        }
      } catch (error) {
        console.error(`   ❌ Error processing Gmail message:`, error.message);
      }
    }

    console.log('\n✅ Fix complete!');
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

function extractBody(payload) {
  const decodeContent = (data) => {
    try {
      return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    } catch (error) {
      console.warn('Failed to decode content:', error);
      return '';
    }
  };

  if (payload?.body?.data) {
    const content = decodeContent(payload.body.data);
    return payload.mimeType?.includes('html') ? { html: content } : { text: content };
  }

  if (payload?.parts) {
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

fixMissingMessages();
