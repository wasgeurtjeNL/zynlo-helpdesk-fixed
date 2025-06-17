const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkTicketData(ticketNumber) {
  console.log(`\n🔍 Checking data for ticket #${ticketNumber}\n`);

  try {
    // 1. Get ticket details
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('number', ticketNumber)
      .single();

    if (ticketError) {
      console.error('❌ Error fetching ticket:', ticketError);
      return;
    }

    console.log('✅ Ticket found:');
    console.log(`   ID: ${ticket.id}`);
    console.log(`   Subject: ${ticket.subject}`);
    console.log(`   Status: ${ticket.status}`);
    console.log(`   Customer ID: ${ticket.customer_id}`);

    // 2. Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('ticket_id', ticket.id)
      .single();

    if (convError) {
      console.error('❌ No conversation found:', convError);
      return;
    }

    console.log('\n✅ Conversation found:');
    console.log(`   ID: ${conversation.id}`);
    console.log(`   Channel: ${conversation.channel}`);
    console.log(`   Channel ID: ${conversation.channel_id || 'Not set'}`);
    console.log(`   External ID: ${conversation.external_id || 'Not set'}`);

    // 3. Get messages
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`\n✅ Found ${messages.length} messages:`);

    messages.forEach((msg, index) => {
      console.log(`\n📧 Message ${index + 1}:`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   Sender Type: ${msg.sender_type}`);
      console.log(`   Sender Name: ${msg.sender_name || 'Not set'}`);
      console.log(`   Content Type: ${msg.content_type || 'text/plain'}`);
      console.log(`   Content Length: ${msg.content?.length || 0} characters`);
      console.log(`   Content Preview: ${msg.content?.substring(0, 100) || 'No content'}...`);
      console.log(`   Created: ${new Date(msg.created_at).toLocaleString()}`);

      // Check for HTML content
      if (
        msg.content_type === 'text/html' ||
        msg.content?.includes('<html') ||
        msg.content?.includes('<body')
      ) {
        console.log(`   📄 HTML Content Detected`);
      }

      // Check metadata
      if (msg.metadata) {
        console.log(
          `   📋 Metadata:`,
          JSON.stringify(msg.metadata, null, 2).substring(0, 200) + '...'
        );
      }
    });

    // 4. Check customer
    if (ticket.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('*')
        .eq('id', ticket.customer_id)
        .single();

      if (customer) {
        console.log('\n✅ Customer found:');
        console.log(`   ID: ${customer.id}`);
        console.log(`   Name: ${customer.name}`);
        console.log(`   Email: ${customer.email}`);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

// Get ticket number from command line argument
const ticketNumber = process.argv[2];

if (!ticketNumber) {
  console.log('Usage: node scripts/check-ticket-data.js <ticket-number>');
  console.log('Example: node scripts/check-ticket-data.js 611');
} else {
  checkTicketData(parseInt(ticketNumber)).catch(console.error);
}
