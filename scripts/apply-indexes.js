const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: './apps/dashboard/.env.local' })

async function applyIndexes() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const indexQueries = [
    {
      name: 'idx_customers_email',
      query: 'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
      table: 'customers'
    },
    {
      name: 'idx_tickets_status',
      query: 'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
      table: 'tickets'
    },
    {
      name: 'idx_tickets_created_at',
      query: 'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC)',
      table: 'tickets'
    },
    {
      name: 'idx_tickets_assignee_id',
      query: 'CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id)',
      table: 'tickets'
    },
    {
      name: 'idx_tickets_status_created',
      query: 'CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at DESC)',
      table: 'tickets'
    },
    {
      name: 'idx_messages_conversation_id',
      query: 'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)',
      table: 'messages'
    },
    {
      name: 'idx_conversations_ticket_id',
      query: 'CREATE INDEX IF NOT EXISTS idx_conversations_ticket_id ON conversations(ticket_id)',
      table: 'conversations'
    }
  ]

  console.log('🚀 Applying database indexes...\n')

  for (const index of indexQueries) {
    try {
      console.log(`📊 Creating index: ${index.name} on ${index.table}...`)
      
      // Note: Supabase doesn't have a direct RPC for DDL, so we'll note this
      console.log(`   ⚠️  Please run this query in Supabase SQL Editor:`)
      console.log(`   ${index.query}`)
      console.log('')
    } catch (error) {
      console.error(`❌ Error with ${index.name}:`, error.message)
    }
  }

  console.log('\n✅ Index queries generated. Please run them in Supabase SQL Editor.')
  console.log('   Go to: https://app.supabase.com/project/nkrytssezaefinbjgwnq/editor/sql')
}

applyIndexes().catch(console.error) 