const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function createTestTicketWithMessages() {
  console.log('Creating new test ticket with messages...');

  try {
    // Create a new ticket with an initial message using the RPC function
    const { data, error } = await supabase.rpc('create_ticket_with_message', {
      p_subject: 'Test Ticket - Vraag over Cooling Bundle',
      p_content: 'Hallo, ik heb een vraag over de Cooling Bundle aanbieding. Is deze nog geldig?',
      p_customer_email: 'testklant@example.com',
      p_customer_name: 'Test Klant',
      p_channel: 'email',
      p_priority: 'normal',
    });

    if (error) {
      console.error('Error creating ticket:', error);
      return;
    }

    console.log('✅ Created ticket with message:', data);

    // Get the created ticket number
    const { data: ticket } = await supabase
      .from('tickets')
      .select('number')
      .eq('id', data.ticket_id)
      .single();

    console.log('📋 Ticket number:', ticket?.number);

    // Add additional messages to the conversation
    const additionalMessages = [
      {
        conversation_id: data.conversation_id,
        content:
          'Bedankt voor uw vraag! De Cooling Bundle aanbieding is inderdaad nog geldig tot het einde van deze maand. U krijgt 30% korting op de hele bundel.',
        sender_type: 'agent',
        sender_id: 'agent-1',
        sender_name: 'Support Agent',
      },
      {
        conversation_id: data.conversation_id,
        content: 'Fantastisch! Dan wil ik die graag bestellen. Kan ik dat via deze chat doen?',
        sender_type: 'customer',
        sender_id: data.customer_id,
        sender_name: 'Test Klant',
      },
    ];

    for (const message of additionalMessages) {
      const { error: msgError } = await supabase.from('messages').insert(message);

      if (msgError) {
        console.error('Error adding message:', msgError);
      } else {
        console.log('✅ Added message:', message.content.substring(0, 50) + '...');
      }
    }

    console.log('\n🎉 Success! Created ticket #' + ticket?.number + ' with 3 messages.');
    console.log('Go to: http://localhost:3000/tickets/' + ticket?.number);
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

createTestTicketWithMessages().catch(console.error);
