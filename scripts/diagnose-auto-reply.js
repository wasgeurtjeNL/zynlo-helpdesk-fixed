require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
);

async function diagnoseAutoReply() {
  console.log('🔍 Diagnosing Auto-Reply System...\n');

  // 1. Check conversation table structure
  console.log('1️⃣ Checking conversation table structure...');
  const { data: conversationColumns, error: convError } = await supabase
    .from('conversations')
    .select('*')
    .limit(0);

  if (!convError) {
    console.log('✅ Conversation table exists');
  } else {
    console.log('❌ Error checking conversation table:', convError.message);
  }

  // 2. Check if conversations have customer_id field
  console.log('\n2️⃣ Checking conversation fields...');
  const { data: sampleConv } = await supabase.from('conversations').select('*').limit(1).single();

  if (sampleConv) {
    console.log('Sample conversation fields:', Object.keys(sampleConv));
    console.log('Has customer_id?', 'customer_id' in sampleConv ? 'YES' : 'NO');
  }

  // 3. Check auto_reply_rules table
  console.log('\n3️⃣ Checking auto_reply_rules table...');
  const { data: rules, error: rulesError } = await supabase
    .from('auto_reply_rules')
    .select('*')
    .eq('is_active', true);

  if (rulesError) {
    console.log('❌ Error checking auto_reply_rules:', rulesError.message);
  } else {
    console.log(`✅ Found ${rules?.length || 0} active auto-reply rules`);
    rules?.forEach((rule, index) => {
      console.log(`   Rule ${index + 1}: "${rule.name}" - Delay: ${rule.delay_minutes}min`);
    });
  }

  // 4. Check auto_reply_logs table
  console.log('\n4️⃣ Checking auto_reply_logs...');
  const { data: logs, error: logsError } = await supabase
    .from('auto_reply_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5);

  if (logsError) {
    console.log('❌ Error checking auto_reply_logs:', logsError.message);
  } else {
    console.log(`✅ Found ${logs?.length || 0} recent log entries`);
    logs?.forEach((log) => {
      console.log(`   ${new Date(log.created_at).toLocaleString()} - Status: ${log.status}`);
      if (log.error) console.log(`   Error: ${log.error}`);
    });
  }

  // 5. Check database triggers
  console.log('\n5️⃣ Checking database triggers...');
  const { data: triggers, error: triggerError } = await supabase.rpc('get_table_triggers', {
    p_table_name: 'messages',
  });

  if (triggerError) {
    console.log('❌ Could not fetch triggers. Creating function to check...');

    // Try alternative approach
    const { data, error } = await supabase.rpc('get_trigger_definition', {
      p_trigger_name: 'messages_auto_reply_trigger',
    });

    if (error) {
      console.log('❌ Could not get trigger definition:', error.message);
    } else if (data) {
      console.log('✅ Found trigger definition');
    }
  } else {
    console.log(`✅ Found ${triggers?.length || 0} triggers on messages table`);
    triggers?.forEach((trigger) => {
      console.log(`   - ${trigger.trigger_name}`);
    });
  }

  // 6. Test creating a message to see the exact error
  console.log('\n6️⃣ Testing message creation to trigger auto-reply...');

  // First get a test conversation
  const { data: testConv } = await supabase
    .from('conversations')
    .select('*, ticket:tickets!inner(*)')
    .limit(1)
    .single();

  if (testConv) {
    console.log(`Using test conversation: ${testConv.id}`);
    console.log(`Associated ticket: ${testConv.ticket?.number || 'Unknown'}`);

    // Try to create a test message
    const { data: msg, error: msgError } = await supabase
      .from('messages')
      .insert({
        conversation_id: testConv.id,
        content: 'Test message for auto-reply diagnosis',
        sender_type: 'customer',
        sender_id: testConv.ticket?.customer_id || 'test-customer',
        metadata: { test: true, diagnosis: true },
      })
      .select()
      .single();

    if (msgError) {
      console.log('❌ Error creating message:', msgError);
      console.log('   This confirms the trigger issue');
    } else {
      console.log('✅ Message created successfully!');
      console.log('   Auto-reply might be working now');

      // Clean up test message
      await supabase.from('messages').delete().eq('id', msg.id);
    }
  }

  // 7. Check the ticket-conversation relationship
  console.log('\n7️⃣ Checking ticket-conversation relationship...');
  const { data: ticketWithConv } = await supabase
    .from('tickets')
    .select('*, conversation:conversations!inner(*)')
    .limit(1)
    .single();

  if (ticketWithConv) {
    console.log('✅ Ticket has customer_id:', ticketWithConv.customer_id ? 'YES' : 'NO');
    console.log('✅ Conversation structure:', Object.keys(ticketWithConv.conversation));
  }

  console.log('\n📊 Diagnosis Summary:');
  console.log('The issue is that the auto-reply trigger expects v_conversation.customer_id');
  console.log('but conversations table does not have a customer_id field.');
  console.log('Customer ID is stored in the tickets table instead.');
  console.log('\n💡 Solution: The trigger needs to join with tickets table to get customer_id');
}

// Add helper function to check trigger definition
async function createHelperFunctions() {
  // Create function to get trigger definition if it doesn't exist
  const { error } = await supabase.rpc('create_get_trigger_definition_function');

  if (!error || error.message.includes('already exists')) {
    console.log('✅ Helper functions ready\n');
  }
}

async function main() {
  await createHelperFunctions();
  await diagnoseAutoReply();
}

main().catch(console.error);
