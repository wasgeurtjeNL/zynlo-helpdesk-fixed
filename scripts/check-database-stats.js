const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function checkDatabaseStats() {
  console.log('\n📊 Database Statistics\n');

  try {
    // Count tickets
    const { count: ticketCount } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Total tickets: ${ticketCount}`);

    // Count conversations
    const { count: convCount } = await supabase
      .from('conversations')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Total conversations: ${convCount}`);

    // Count messages
    const { count: msgCount } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Total messages: ${msgCount}`);

    // Count customers
    const { count: custCount } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Total customers: ${custCount}`);

    // Check for tickets without messages
    console.log('\n🔍 Checking for tickets without messages...\n');

    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, number, subject')
      .order('number', { ascending: false })
      .limit(20);

    for (const ticket of tickets || []) {
      // Get conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single();

      if (conv) {
        // Count messages
        const { count: msgCount } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        if (msgCount === 0) {
          console.log(`❌ Ticket #${ticket.number}: "${ticket.subject}" - NO MESSAGES`);
        } else {
          console.log(`✅ Ticket #${ticket.number}: "${ticket.subject}" - ${msgCount} messages`);
        }
      } else {
        console.log(`⚠️ Ticket #${ticket.number}: "${ticket.subject}" - NO CONVERSATION`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

checkDatabaseStats().catch(console.error);
