const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRecentTickets() {
  console.log('🔍 Checking recent tickets...\n');

  try {
    // Get last 10 tickets
    const { data: tickets, error } = await supabase
      .from('tickets')
      .select('id, number, subject, created_at, metadata')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('❌ Error fetching tickets:', error);
      return;
    }

    console.log(`📋 Last ${tickets.length} tickets:\n`);

    for (const ticket of tickets) {
      console.log(`\n🎫 Ticket #${ticket.number}`);
      console.log(`   Subject: ${ticket.subject}`);
      console.log(`   Created: ${new Date(ticket.created_at).toLocaleString()}`);

      if (ticket.metadata) {
        console.log(`   Metadata:`);
        console.log(`   - Created via: ${ticket.metadata.created_via || 'Unknown'}`);
        console.log(`   - Gmail message ID: ${ticket.metadata.gmail_message_id || 'None'}`);
        console.log(`   - Channel ID: ${ticket.metadata.channel_id || 'None'}`);
      }

      // Check for conversation
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, channel')
        .eq('ticket_id', ticket.id)
        .single();

      if (conversation) {
        console.log(`   ✅ Has conversation (ID: ${conversation.id})`);

        // Count messages
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id);

        console.log(`   💬 Messages: ${count || 0}`);

        if (count === 0) {
          console.log(`   ⚠️  WARNING: Conversation exists but has NO messages!`);
        }
      } else {
        console.log(`   ❌ No conversation found`);
      }
    }

    // Check for tickets without messages
    console.log('\n\n🔍 Checking for tickets without messages...');

    const { data: problemTickets } = await supabase
      .from('tickets')
      .select('id, number, subject, created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    let ticketsWithoutMessages = 0;
    for (const ticket of problemTickets || []) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single();

      if (conv) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        if (count === 0) {
          ticketsWithoutMessages++;
        }
      }
    }

    console.log(
      `\n📊 Summary: ${ticketsWithoutMessages} out of last 50 tickets have conversations but no messages`
    );
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkRecentTickets();
