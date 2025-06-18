const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTicketMessages() {
  console.log('🔍 Checking ticket messages...\n');

  try {
    // Get all tickets
    const { data: tickets, error: ticketError } = await supabase
      .from('tickets')
      .select('id, number, subject, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (ticketError) {
      console.error('❌ Error fetching tickets:', ticketError);
      return;
    }

    console.log(`📋 Found ${tickets.length} recent tickets\n`);

    // Check messages for each ticket
    for (const ticket of tickets) {
      console.log(`\n🎫 Ticket #${ticket.number}: ${ticket.subject}`);
      console.log(`   ID: ${ticket.id}`);

      // Get conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('id, channel_id')
        .eq('ticket_id', ticket.id)
        .single();

      if (convError) {
        console.log('   ❌ No conversation found');
        continue;
      }

      console.log(`   📞 Conversation ID: ${conversation.id}`);

      // Get messages
      const { data: messages, error: msgError } = await supabase
        .from('messages')
        .select('id, content, content_type, sender_type, created_at, metadata')
        .eq('conversation_id', conversation.id)
        .order('created_at', { ascending: false });

      if (msgError) {
        console.log('   ❌ Error fetching messages:', msgError);
        continue;
      }

      console.log(`   💬 Messages: ${messages.length}`);

      if (messages.length > 0) {
        const firstMessage = messages[0];
        console.log(`   📝 Latest message:`);
        console.log(`      - Type: ${firstMessage.sender_type}`);
        console.log(`      - Content type: ${firstMessage.content_type || 'text/plain'}`);
        console.log(`      - Content length: ${firstMessage.content?.length || 0} chars`);
        console.log(`      - Has content: ${!!firstMessage.content}`);
        
        if (firstMessage.content) {
          const preview = firstMessage.content.substring(0, 100);
          console.log(`      - Preview: ${preview}...`);
        } else {
          console.log(`      - ⚠️  NO CONTENT IN MESSAGE!`);
        }

        if (firstMessage.metadata?.originalHtml) {
          console.log(`      - Has originalHtml in metadata: Yes (${firstMessage.metadata.originalHtml.length} chars)`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkTicketMessages(); 