const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testFrontendMessageDisplay() {
  console.log('🔍 Testing Frontend Message Display...\n');

  try {
    // Get ticket 614 that we know has messages
    const ticketNumber = 614;

    console.log(`1️⃣ Fetching ticket #${ticketNumber}...`);

    // Simulate the exact query from useTicket hook
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(
        `
        *,
        customer:customer_id(id, name, email, phone),
        assignee:assignee_id(id, email, full_name),
        team:team_id(id, name)
      `
      )
      .eq('number', ticketNumber)
      .single();

    if (ticketError) {
      console.error('❌ Error fetching ticket:', ticketError);
      return;
    }

    console.log('✅ Ticket found:', ticket.subject);

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('ticket_id', ticket.id)
      .single();

    if (convError) {
      console.error('❌ Error fetching conversation:', convError);
      return;
    }

    console.log('✅ Conversation found:', conversation.id);

    // Get messages - exactly as in useTicket
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(
        `
        id,
        content,
        content_type,
        sender_type,
        sender_id,
        attachments,
        is_internal,
        created_at,
        metadata
      `
      )
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`\n✅ Found ${messages.length} messages\n`);

    // Process messages like useTicket does
    const processedMessages = messages.map((message) => {
      // If we have originalHtml in metadata, use that
      if (message.metadata?.originalHtml) {
        return {
          ...message,
          content: message.metadata.originalHtml,
          content_type: 'text/html',
        };
      }
      return message;
    });

    // Display what the frontend would receive
    console.log('2️⃣ What the frontend receives:\n');

    processedMessages.forEach((msg, index) => {
      console.log(`Message ${index + 1}:`);
      console.log(`- ID: ${msg.id}`);
      console.log(`- Sender: ${msg.sender_type} (${msg.sender_id})`);
      console.log(`- Content Type: ${msg.content_type}`);
      console.log(`- Has Content: ${!!msg.content}`);
      console.log(`- Content Length: ${msg.content?.length || 0}`);

      if (msg.content) {
        console.log(`- Content Preview:`);
        console.log('  ' + msg.content.substring(0, 200).replace(/\n/g, '\n  '));
      }

      console.log('');
    });

    // Test the MessageContent component logic
    console.log('3️⃣ Testing MessageContent logic:\n');

    processedMessages.forEach((msg, index) => {
      console.log(`Message ${index + 1} rendering:`);

      // Check if it would be detected as HTML
      const isHtml =
        msg.content_type?.toLowerCase().includes('text/html') ||
        (msg.content && /<[a-z][\s\S]*>/i.test(msg.content));

      console.log(`- Would render as HTML: ${isHtml}`);
      console.log(`- Content exists: ${!!msg.content}`);

      if (!msg.content) {
        console.log('- Would show: "(Geen inhoud beschikbaar)"');
      } else if (isHtml) {
        console.log('- Would render in iframe with HTML content');
      } else {
        console.log('- Would render as plain text with line breaks');
      }

      console.log('');
    });

    console.log('✅ Test complete!');
    console.log(
      `\n📌 Check ticket #${ticketNumber} in the UI to verify messages display correctly.`
    );
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testFrontendMessageDisplay();
