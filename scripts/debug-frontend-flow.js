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

async function debugFrontendFlow() {
  console.log('🔍 Debugging Frontend Flow for Ticket #614...\n');

  try {
    const ticketNumber = 614;

    // 1. Simulate the exact query from useTicket hook
    console.log('1️⃣ Fetching ticket (like useTicket hook)...');

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(
        `
        *,
        customer:customer_id(id, name, email, phone),
        assignee:assignee_id(id, email, full_name),
        team:team_id(id, name)
      `
      )
      .eq('number', ticketNumber)
      .single();

    if (ticketError) {
      console.error('❌ Error fetching ticket:', ticketError);
      return;
    }

    console.log('✅ Ticket found:', ticket.subject);
    console.log('   ID:', ticket.id);
    console.log('   Status:', ticket.status);
    console.log('   Customer:', ticket.customer?.email);

    // 2. Get conversation
    console.log('\n2️⃣ Fetching conversation...');

    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('ticket_id', ticket.id)
      .single();

    if (convError && convError.code !== 'PGRST116') {
      console.error('❌ Error fetching conversation:', convError);
    }

    if (conversation) {
      console.log('✅ Conversation found:', conversation.id);
      console.log('   Channel:', conversation.channel);
    } else {
      console.log('⚠️ No conversation found');
      return;
    }

    // 3. Get messages
    console.log('\n3️⃣ Fetching messages...');

    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select(
        `
        id,
        content,
        content_type,
        sender_type,
        sender_id,
        attachments,
        is_internal,
        created_at,
        metadata
      `
      )
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`✅ Found ${messages?.length || 0} messages`);

    // 4. Process messages like the hook does
    console.log('\n4️⃣ Processing messages...');

    const processedMessages =
      messages?.map((message, index) => {
        console.log(`\nMessage ${index + 1}:`);
        console.log('  ID:', message.id);
        console.log('  Content exists:', !!message.content);
        console.log('  Content length:', message.content?.length || 0);
        console.log('  Content type:', message.content_type);
        console.log('  Has originalHtml:', !!message.metadata?.originalHtml);

        // Process like the hook
        if (message.metadata?.originalHtml) {
          console.log('  ✅ Using originalHtml from metadata');
          return {
            ...message,
            content: message.metadata.originalHtml,
            content_type: 'text/html',
          };
        }

        console.log('  ✅ Using regular content');
        return message;
      }) || [];

    // 5. Final result
    console.log('\n5️⃣ Final result that would be passed to components:');
    console.log('  Ticket with details:', {
      id: ticket.id,
      number: ticket.number,
      subject: ticket.subject,
      conversation: !!conversation,
      messages: processedMessages.length,
    });

    // 6. Check first message content
    if (processedMessages.length > 0) {
      console.log('\n6️⃣ First message details:');
      const firstMsg = processedMessages[0];
      console.log('  Content preview:', firstMsg.content?.substring(0, 200) + '...');
      console.log('  Content type:', firstMsg.content_type);
      console.log('  Sender type:', firstMsg.sender_type);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

debugFrontendFlow();
