const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testRealtime() {
  console.log('🔍 Testing Supabase Realtime...\n');

  // Subscribe to tickets table
  console.log('📡 Subscribing to tickets table...');
  const ticketChannel = supabase
    .channel('test-tickets')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'tickets',
      },
      (payload) => {
        console.log('\n✅ Ticket change received:', {
          event: payload.eventType,
          data: payload.new || payload.old,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe((status) => {
      console.log('Ticket subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to tickets table');
      }
    });

  // Subscribe to messages table
  console.log('\n📡 Subscribing to messages table...');
  const messageChannel = supabase
    .channel('test-messages')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      },
      (payload) => {
        console.log('\n✅ New message received:', {
          data: payload.new,
          timestamp: new Date().toISOString(),
        });
      }
    )
    .subscribe((status) => {
      console.log('Message subscription status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to messages table');
      }
    });

  // Keep the script running
  console.log('\n🎯 Listening for realtime updates... (Press Ctrl+C to stop)');
  console.log('💡 Try creating a new ticket or message in another window to test realtime.\n');

  // Prevent script from exiting
  process.stdin.resume();
}

// Run the test
testRealtime().catch(console.error);
