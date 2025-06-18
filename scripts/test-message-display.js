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

async function testMessageDisplay() {
  console.log('🧪 Testing Message Display Flow...\n');

  try {
    // Test a simple message creation
    console.log('1️⃣ Creating test ticket...');

    // Create a test customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        email: `test-${Date.now()}@example.com`,
        name: 'Test Customer',
      })
      .select()
      .single();

    if (customerError) throw customerError;
    console.log('✅ Customer created:', customer.id);

    // Create a test ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .insert({
        subject: 'Test Message Display',
        customer_id: customer.id,
        status: 'new',
        priority: 'normal',
      })
      .select()
      .single();

    if (ticketError) throw ticketError;
    console.log('✅ Ticket created:', ticket.number);

    // Create a conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        ticket_id: ticket.id,
        channel: 'email',
        external_id: `test-${Date.now()}`,
      })
      .select()
      .single();

    if (convError) throw convError;
    console.log('✅ Conversation created:', conversation.id);

    // Create test messages with different content types
    const testMessages = [
      {
        content: 'This is a simple plain text message.',
        content_type: 'text/plain',
        sender_type: 'customer',
      },
      {
        content:
          '<p>This is an <strong>HTML</strong> message with <a href="https://example.com">a link</a>.</p>',
        content_type: 'text/html',
        sender_type: 'customer',
      },
      {
        content: 'Agent reply: Thank you for your message!',
        content_type: 'text/plain',
        sender_type: 'agent',
      },
    ];

    console.log('\n2️⃣ Creating test messages...');

    for (const msgData of testMessages) {
      const { data: message, error: msgError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversation.id,
          content: msgData.content,
          content_type: msgData.content_type,
          sender_type: msgData.sender_type,
          sender_id: msgData.sender_type === 'customer' ? customer.id : 'test-agent',
          is_internal: false,
        })
        .select()
        .single();

      if (msgError) {
        console.error('❌ Error creating message:', msgError);
      } else {
        console.log(`✅ Message created: ${message.id}`);
        console.log(`   Content: ${message.content.substring(0, 50)}...`);
        console.log(`   Type: ${message.content_type}`);
      }
    }

    // Now fetch the messages back
    console.log('\n3️⃣ Fetching messages back...');
    const { data: fetchedMessages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (fetchError) {
      console.error('❌ Error fetching messages:', fetchError);
    } else {
      console.log(`✅ Fetched ${fetchedMessages.length} messages`);

      fetchedMessages.forEach((msg, index) => {
        console.log(`\n   Message ${index + 1}:`);
        console.log(`   - ID: ${msg.id}`);
        console.log(`   - Content exists: ${!!msg.content}`);
        console.log(`   - Content length: ${msg.content?.length || 0}`);
        console.log(`   - Content type: ${msg.content_type}`);
        console.log(`   - Sender: ${msg.sender_type}`);
      });
    }

    console.log('\n✅ Test complete!');
    console.log(`\n📌 Test ticket number: ${ticket.number}`);
    console.log('You can now check this ticket in the UI to see if messages display correctly.');
  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testMessageDisplay();
