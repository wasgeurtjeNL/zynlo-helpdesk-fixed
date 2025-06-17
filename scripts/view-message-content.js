const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function viewMessageContent(ticketNumber) {
  console.log(`\n📧 Viewing message content for ticket #${ticketNumber}\n`);

  try {
    // Get ticket with conversation and messages
    const { data: ticket } = await supabase
      .from('tickets')
      .select(
        `
        id, number, subject,
        conversations!inner(
          id,
          messages(
            id,
            content,
            content_type,
            sender_type,
            sender_name,
            created_at,
            metadata
          )
        )
      `
      )
      .eq('number', ticketNumber)
      .single();

    if (!ticket || !ticket.conversations?.[0]?.messages?.length) {
      console.log('No messages found for this ticket');
      return;
    }

    const messages = ticket.conversations[0].messages;
    console.log(`Found ${messages.length} message(s)\n`);

    messages.forEach((msg, index) => {
      console.log(`📨 Message ${index + 1}:`);
      console.log(`   ID: ${msg.id}`);
      console.log(`   Type: ${msg.content_type || 'text/plain'}`);
      console.log(`   Sender: ${msg.sender_name} (${msg.sender_type})`);
      console.log(`   Created: ${new Date(msg.created_at).toLocaleString()}`);

      if (msg.metadata?.original_sender_type) {
        console.log(`   Originally from: ${msg.metadata.original_sender_type}`);
      }

      console.log(`\n   Content (first 500 chars):`);
      console.log('   ' + '-'.repeat(60));
      console.log(msg.content.substring(0, 500));
      if (msg.content.length > 500) {
        console.log(`   ... (${msg.content.length - 500} more characters)`);
      }
      console.log('   ' + '-'.repeat(60) + '\n');
    });
  } catch (err) {
    console.error('Error:', err);
  }
}

const ticketNumber = process.argv[2];
if (!ticketNumber) {
  console.error('Please provide a ticket number');
  process.exit(1);
}

viewMessageContent(ticketNumber).catch(console.error);
