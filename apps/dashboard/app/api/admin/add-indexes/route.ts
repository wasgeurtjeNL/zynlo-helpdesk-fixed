import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // Check for admin authorization
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // SQL to add indexes
    const indexQueries = [
      'CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)',
      'CREATE INDEX IF NOT EXISTS idx_conversations_ticket_id ON conversations(ticket_id)'
    ]

    const results: Array<{query: string, success: boolean, error?: string}> = []
    for (const query of indexQueries) {
      try {
        const { error } = await supabase.rpc('exec_sql', { query_text: query })
        if (error) {
          results.push({ query, success: false, error: error.message })
        } else {
          results.push({ query, success: true })
        }
      } catch (err) {
        results.push({ query, success: false, error: String(err) })
      }
    }

    return NextResponse.json({ 
      message: 'Index creation attempted',
      results 
    })
  } catch (error) {
    console.error('Error adding indexes:', error)
    return NextResponse.json(
      { error: 'Failed to add indexes' },
      { status: 500 }
    )
  }
} 