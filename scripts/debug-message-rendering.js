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

async function debugMessageRendering() {
  console.log('🔍 Debugging Message Rendering...\n');

  try {
    // Get a specific ticket with messages
    const ticketNumber = process.argv[2] || 614;
    console.log(`📋 Checking ticket #${ticketNumber}...\n`);

    // Get ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('*')
      .eq('number', ticketNumber)
      .single();

    if (ticketError || !ticket) {
      console.error('❌ Ticket not found');
      return;
    }

    // Get conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .eq('ticket_id', ticket.id)
      .single();

    if (convError || !conversation) {
      console.error('❌ No conversation found');
      return;
    }

    // Get messages with all fields
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true });

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`Found ${messages.length} messages\n`);

    // Analyze each message
    for (const msg of messages) {
      console.log('═'.repeat(80));
      console.log(`📨 Message ID: ${msg.id}`);
      console.log(`📅 Created: ${new Date(msg.created_at).toLocaleString()}`);
      console.log(`👤 Sender: ${msg.sender_type} (${msg.sender_id})`);
      console.log(`📝 Content Type: ${msg.content_type || 'not set'}`);

      console.log('\n🔍 Content Analysis:');
      console.log(`- Field 'content' exists: ${msg.content !== null && msg.content !== undefined}`);
      console.log(`- Content is null: ${msg.content === null}`);
      console.log(`- Content is undefined: ${msg.content === undefined}`);
      console.log(`- Content is empty string: ${msg.content === ''}`);
      console.log(`- Content type: ${typeof msg.content}`);
      console.log(`- Content length: ${msg.content ? msg.content.length : 0}`);

      if (msg.content) {
        console.log('\n📄 Content Preview:');
        console.log('First 500 chars:');
        console.log('-'.repeat(60));
        console.log(msg.content.substring(0, 500));
        console.log('-'.repeat(60));

        // Check if it's HTML
        const isHtml = /<[a-z][\s\S]*>/i.test(msg.content);
        console.log(`\n- Contains HTML tags: ${isHtml}`);

        // Check for common issues
        if (msg.content.includes('\\n')) {
          console.log('- Contains escaped newlines (\\n)');
        }
        if (msg.content.includes('\\r')) {
          console.log('- Contains escaped carriage returns (\\r)');
        }
        if (msg.content.includes('\\t')) {
          console.log('- Contains escaped tabs (\\t)');
        }
        if (msg.content.includes('\\"')) {
          console.log('- Contains escaped quotes (\")');
        }
      }

      // Check metadata
      if (msg.metadata) {
        console.log('\n📊 Metadata Analysis:');
        const metadataKeys = Object.keys(msg.metadata);
        console.log(`- Has metadata: true`);
        console.log(`- Metadata keys: ${metadataKeys.join(', ')}`);

        if (msg.metadata.originalHtml) {
          console.log(`- originalHtml length: ${msg.metadata.originalHtml.length} chars`);
        }
        if (msg.metadata.cleanedText) {
          console.log(`- cleanedText length: ${msg.metadata.cleanedText.length} chars`);
        }
        if (msg.metadata.from) {
          console.log(
            `- From: ${msg.metadata.from.name || 'No name'} <${msg.metadata.from.email}>`
          );
        }
      }

      // Check attachments
      if (msg.attachments && Array.isArray(msg.attachments)) {
        console.log(`\n📎 Attachments: ${msg.attachments.length}`);
      }
    }

    console.log('\n═'.repeat(80));
    console.log('\n✅ Debug complete');
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugMessageRendering();
