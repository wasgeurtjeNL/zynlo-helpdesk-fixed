const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAutoReplyStatus() {
  console.log('🔍 Checking auto-reply status...\n');

  try {
    // 1. Check if auto-reply rules exist
    const { data: rules, error: rulesError } = await supabase
      .from('auto_reply_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) {
      console.error('❌ Error fetching auto-reply rules:', rulesError);
      return;
    }

    console.log(`📋 Active auto-reply rules: ${rules?.length || 0}`);
    if (rules && rules.length > 0) {
      rules.forEach((rule) => {
        console.log(`   - ${rule.name} (${rule.trigger_type})`);
      });
    }

    // 2. Check recent system messages
    console.log('\n🤖 Recent system messages:');
    const { data: systemMessages } = await supabase
      .from('messages')
      .select('id, created_at, metadata, conversation_id')
      .eq('sender_type', 'system')
      .order('created_at', { ascending: false })
      .limit(10);

    console.log(`   Found: ${systemMessages?.length || 0} system messages`);

    if (systemMessages && systemMessages.length > 0) {
      systemMessages.forEach((msg) => {
        console.log(`   - ${msg.id} (${new Date(msg.created_at).toLocaleString()})`);
        console.log(`     Auto-reply: ${msg.metadata?.auto_reply || false}`);
      });
    }

    // 3. Check auto-reply execution logs
    console.log('\n📝 Recent auto-reply execution logs:');
    const { data: logs } = await supabase
      .from('auto_reply_execution_logs')
      .select('*')
      .order('executed_at', { ascending: false })
      .limit(10);

    console.log(`   Found: ${logs?.length || 0} execution logs`);
    if (logs && logs.length > 0) {
      logs.forEach((log) => {
        console.log(`   - ${log.id} (${new Date(log.executed_at).toLocaleString()})`);
        console.log(`     Status: ${log.status}`);
        console.log(`     Rule: ${log.rule_id}`);
      });
    }

    // 4. Check tickets without auto-replies
    console.log('\n🎫 Recent tickets and their auto-reply status:');
    const { data: recentTickets } = await supabase
      .from('tickets')
      .select('id, number, subject, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    for (const ticket of recentTickets || []) {
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticket.id)
        .single();

      if (conversation) {
        const { data: autoReplyMsg } = await supabase
          .from('messages')
          .select('id, created_at')
          .eq('conversation_id', conversation.id)
          .eq('sender_type', 'system')
          .eq('metadata->>auto_reply', 'true')
          .single();

        console.log(`\n   Ticket #${ticket.number}: ${ticket.subject}`);
        console.log(`   Created: ${new Date(ticket.created_at).toLocaleString()}`);
        console.log(`   Auto-reply: ${autoReplyMsg ? '✅ Yes' : '❌ No'}`);

        if (autoReplyMsg) {
          console.log(`   Auto-reply sent: ${new Date(autoReplyMsg.created_at).toLocaleString()}`);
        }
      }
    }

    // 5. Test the trigger function exists
    console.log('\n⚙️ Checking database functions:');
    const { data: functions } = await supabase.rpc('get_function_names', {});

    const autoReplyFunctions = [
      'execute_auto_reply_rules',
      'send_auto_reply_message',
      'trigger_auto_reply_on_message',
    ];

    for (const funcName of autoReplyFunctions) {
      console.log(`   ${funcName}: ❓ (check manually in database)`);
    }
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkAutoReplyStatus();
