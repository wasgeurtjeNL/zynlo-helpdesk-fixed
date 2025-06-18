const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function quickFixMessages() {
  console.log('🔍 Finding tickets without messages...\n');

  try {
    // Get recent tickets
    const { data: tickets } = await supabase
      .from('tickets')
      .select('id, number, subject, created_at, customer_id')
      .order('created_at', { ascending: false })
      .limit(20);

    const ticketsToFix = [];

    // Check each ticket
    for (const ticket of tickets || []) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single();

      if (conversation) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conversation.id);

        if (count === 0) {
          // Get customer info
          const { data: customer } = await supabase
            .from('customers')
            .select('email, name')
            .eq('id', ticket.customer_id)
            .single();

          ticketsToFix.push({ ticket, conversation, customer });
        }
      }
    }

    console.log(`Found ${ticketsToFix.length} tickets without messages\n`);

    for (const { ticket, conversation, customer } of ticketsToFix) {
      console.log(`🎫 Fixing ticket #${ticket.number}: ${ticket.subject}`);

      // Create a placeholder message based on the ticket subject
      const messageData = {
        conversation_id: conversation.id,
        content: `
          <div>
            <p><strong>Subject:</strong> ${ticket.subject}</p>
            <p>This message was reconstructed from ticket data.</p>
            <p>Original email content was not properly saved during sync.</p>
          </div>
        `,
        content_type: 'text/html',
        sender_type: 'customer',
        sender_id: customer?.email || 'unknown@example.com',
        metadata: {
          from: {
            email: customer?.email || 'unknown@example.com',
            name: customer?.name || 'Unknown Sender',
          },
          subject: ticket.subject,
          reconstructed: true,
          fixed_by: 'quick-fix-messages-script',
        },
        created_at: ticket.created_at,
      };

      const { error } = await supabase.from('messages').insert(messageData);

      if (error) {
        console.error(`   ❌ Failed:`, error);
      } else {
        console.log(`   ✅ Message created`);
      }
    }

    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

quickFixMessages();
