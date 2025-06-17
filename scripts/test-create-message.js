const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function testCreateMessage() {
  console.log('\n🧪 Testing message creation...\n');

  try {
    // First find a ticket without messages
    const { data: ticket } = await supabase
      .from('tickets')
      .select('id, number, subject, customer_id')
      .eq('number', 611)
      .single();

    if (!ticket) {
      console.error('❌ Ticket 611 not found');
      return;
    }

    console.log(`✅ Found ticket #${ticket.number}: ${ticket.subject}`);

    // Get conversation
    const { data: conversation } = await supabase
      .from('conversations')
      .select('id')
      .eq('ticket_id', ticket.id)
      .single();

    if (!conversation) {
      console.error('❌ No conversation found for ticket');
      return;
    }

    console.log(`✅ Found conversation: ${conversation.id}`);

    // Test creating a message
    const messageData = {
      conversation_id: conversation.id,
      content: 'This is a test HTML email content <p>With HTML tags</p>',
      sender_type: 'customer',
      sender_id: ticket.customer_id,
      sender_name: 'Test Customer',
      content_type: 'text/html',
      metadata: {
        test: true,
        created_at: new Date().toISOString(),
      },
    };

    console.log('\n📝 Attempting to create message with data:');
    console.log(JSON.stringify(messageData, null, 2));

    const { data: message, error } = await supabase
      .from('messages')
      .insert(messageData)
      .select()
      .single();

    if (error) {
      console.error('\n❌ Error creating message:');
      console.error(JSON.stringify(error, null, 2));

      // Try without content_type
      console.log('\n🔄 Retrying without content_type...');
      delete messageData.content_type;

      const { data: message2, error: error2 } = await supabase
        .from('messages')
        .insert(messageData)
        .select()
        .single();

      if (error2) {
        console.error('❌ Still failed:', error2);
      } else {
        console.log('✅ Success without content_type!', message2);
      }
    } else {
      console.log('\n✅ Message created successfully!');
      console.log(`   ID: ${message.id}`);
      console.log(`   Content type: ${message.content_type}`);
      console.log(`   Content length: ${message.content.length}`);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

testCreateMessage().catch(console.error);
