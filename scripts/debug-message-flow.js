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

async function debugMessageFlow() {
  console.log('🔍 Debugging Message Flow...\n');

  try {
    // 1. Check recent messages
    console.log('📨 Checking recent messages...');
    const { data: messages, error: msgError } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);

    if (msgError) {
      console.error('❌ Error fetching messages:', msgError);
      return;
    }

    console.log(`Found ${messages.length} messages\n`);

    for (const msg of messages) {
      console.log('─'.repeat(60));
      console.log(`Message ID: ${msg.id}`);
      console.log(`Conversation ID: ${msg.conversation_id}`);
      console.log(`Content Type: ${msg.content_type}`);
      console.log(`Sender Type: ${msg.sender_type}`);
      console.log(`Created: ${new Date(msg.created_at).toLocaleString()}`);

      // Check content field
      console.log('\n📝 Content Analysis:');
      console.log(`- Content exists: ${msg.content !== null && msg.content !== undefined}`);
      console.log(`- Content type: ${typeof msg.content}`);
      console.log(`- Content length: ${msg.content ? msg.content.length : 0}`);

      if (msg.content) {
        console.log(`- First 200 chars: ${msg.content.substring(0, 200)}...`);

        // Check if content is JSON
        try {
          const parsed = JSON.parse(msg.content);
          console.log('- Content is JSON:', Object.keys(parsed));
        } catch {
          console.log('- Content is plain text/HTML');
        }
      }

      // Check metadata
      if (msg.metadata) {
        console.log('\n📊 Metadata:');
        console.log(`- Has metadata: true`);
        console.log(`- Keys: ${Object.keys(msg.metadata).join(', ')}`);
        if (msg.metadata.originalHtml) {
          console.log(`- Has originalHtml: ${msg.metadata.originalHtml.length} chars`);
        }
        if (msg.metadata.cleanedText) {
          console.log(`- Has cleanedText: ${msg.metadata.cleanedText.length} chars`);
        }
      }

      // Check related conversation
      const { data: conv } = await supabase
        .from('conversations')
        .select('*, tickets(*)')
        .eq('id', msg.conversation_id)
        .single();

      if (conv) {
        console.log('\n🎫 Related Ticket:');
        console.log(`- Ticket #${conv.tickets?.number}: ${conv.tickets?.subject}`);
        console.log(`- Channel: ${conv.channel}`);
      }
    }

    // 2. Check specific problematic tickets
    console.log('\n\n📋 Checking tickets with empty messages...');
    const { data: tickets } = await supabase
      .from('tickets')
      .select(
        `
        *,
        conversations(
          *,
          messages(*)
        )
      `
      )
      .order('created_at', { ascending: false })
      .limit(10);

    let emptyContentCount = 0;
    for (const ticket of tickets || []) {
      for (const conv of ticket.conversations || []) {
        for (const msg of conv.messages || []) {
          if (!msg.content || msg.content.trim() === '') {
            emptyContentCount++;
            console.log(`\n⚠️ Empty content in ticket #${ticket.number}`);
            console.log(`  Message ID: ${msg.id}`);
            console.log(`  Content type: ${msg.content_type}`);
            console.log(`  Has metadata: ${!!msg.metadata}`);
          }
        }
      }
    }

    console.log(`\n📊 Summary: Found ${emptyContentCount} messages with empty content`);
  } catch (error) {
    console.error('❌ Debug error:', error);
  }
}

debugMessageFlow();
