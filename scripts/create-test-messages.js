const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function createTestMessages() {
  console.log('Creating test messages for ticket #612...');

  // Get ticket info
  const { data: ticket } = await supabase
    .from('tickets')
    .select('id, customer_id')
    .eq('number', 612)
    .single();

  if (!ticket) {
    console.error('Ticket 612 not found!');
    return;
  }

  console.log('Ticket ID:', ticket.id);

  // Get conversation
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('ticket_id', ticket.id)
    .single();

  if (!conversation) {
    console.error('No conversation found for ticket 612!');
    return;
  }

  console.log('Conversation ID:', conversation.id);

  // Get customer info
  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('id', ticket.customer_id)
    .single();

  console.log('Customer:', customer?.name || 'Unknown');

  // Create test messages with sender_name field
  const messages = [
    {
      conversation_id: conversation.id,
      content: 'Hallo, ik heb een vraag over mijn bestelling.',
      sender_type: 'customer',
      sender_id: customer?.id || 'customer-1',
      sender_name: customer?.name || 'Test Klant',
    },
    {
      conversation_id: conversation.id,
      content: 'Bedankt voor uw bericht! Ik help u graag verder. Kunt u mij uw bestelnummer geven?',
      sender_type: 'agent',
      sender_id: 'agent-1',
      sender_name: 'Support Agent',
    },
    {
      conversation_id: conversation.id,
      content:
        'Mijn bestelnummer is 12345. Het gaat om de Cooling Bundle die ik vorige week besteld heb.',
      sender_type: 'customer',
      sender_id: customer?.id || 'customer-1',
      sender_name: customer?.name || 'Test Klant',
    },
  ];

  // Insert messages one by one to better handle errors
  for (const message of messages) {
    const { data, error } = await supabase.from('messages').insert(message).select();

    if (error) {
      console.error('Error creating message:', error);
    } else {
      console.log('✅ Created message:', data[0].id, '-', data[0].content.substring(0, 40) + '...');
    }
  }

  console.log('\nDone! Refresh your browser to see the messages.');
}

createTestMessages().catch(console.error);
