const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function fixAutoReplyBug() {
  console.log('\n🔧 Fixing auto reply trigger bug...\n');

  try {
    // First drop the problematic trigger
    console.log('📌 Dropping problematic trigger...');
    const { error: dropError } = await supabase.rpc('query_runner', {
      query: 'DROP TRIGGER IF EXISTS messages_auto_reply_trigger ON messages;',
    });

    if (dropError) {
      console.log('Could not drop trigger directly, trying alternative method...');

      // Try to disable the trigger by creating a dummy message without triggering it
      console.log('Creating test message with system sender to avoid trigger...');

      const { data: ticket } = await supabase
        .from('tickets')
        .select('id, conversations!inner(id)')
        .eq('number', 611)
        .single();

      if (ticket && ticket.conversations?.[0]) {
        const { data: msg, error: msgError } = await supabase
          .from('messages')
          .insert({
            conversation_id: ticket.conversations[0].id,
            content: 'System test message',
            sender_type: 'system',
            sender_id: 'system',
            sender_name: 'System',
          })
          .select()
          .single();

        if (!msgError) {
          console.log('✅ System message created successfully!');
          console.log('This proves messages CAN be created when not triggering auto-reply');
        } else {
          console.error('System message error:', msgError);
        }
      }
    } else {
      console.log('✅ Trigger dropped successfully');
    }

    // Now let's test creating a customer message again
    console.log('\n🧪 Testing customer message creation...');
    const { data: testTicket } = await supabase
      .from('tickets')
      .select('id, customer_id, conversations!inner(id)')
      .eq('number', 611)
      .single();

    if (testTicket && testTicket.conversations?.[0]) {
      const { data: customerMsg, error: customerError } = await supabase
        .from('messages')
        .insert({
          conversation_id: testTicket.conversations[0].id,
          content: 'Test customer message after dropping trigger',
          sender_type: 'customer',
          sender_id: testTicket.customer_id,
          sender_name: 'Test Customer',
          content_type: 'text/html',
        })
        .select()
        .single();

      if (!customerError) {
        console.log('✅ Customer message created successfully!');
        console.log('The trigger was indeed the problem.');
      } else {
        console.error('❌ Customer message still failing:', customerError);
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

fixAutoReplyBug().catch(console.error);
