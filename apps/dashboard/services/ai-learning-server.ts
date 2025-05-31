// This is a server-side only module
// It should only be imported in API routes, not in client components

import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import OpenAI from 'openai'

// Only create the OpenAI instance on the server
let openaiInstance: OpenAI | null = null

function getOpenAI() {
  if (!openaiInstance && process.env.OPENAI_API_KEY) {
    openaiInstance = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  }
  return openaiInstance
}

// Get Supabase client
function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createClient(supabaseUrl, supabaseServiceKey)
}

export async function queueForLearning(ticketId: string, priority: number = 5) {
  const supabase = getSupabaseClient()
  
  // Get full conversation data
  const { data: conversation } = await supabase
    .from('conversations')
    .select('id')
    .eq('ticket_id', ticketId)
    .single()
  
  if (!conversation) return
  
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversation.id)
    .order('created_at')

  await supabase
    .from('ai_learning_queue')
    .insert({
      ticket_id: ticketId,
      conversation_data: { messages },
      priority: priority,
    })
}

export async function extractPatterns(
  ticketId: string,
  messages: Array<{ role: string; content: string }>
): Promise<void> {
  const openai = getOpenAI()
  if (!openai) {
    console.warn('OpenAI not configured, skipping pattern extraction')
    return
  }

  const supabase = getSupabaseClient()

  try {
    // Analyze conversation for patterns
    const analysis = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `Analyze this conversation and extract:
          1. Common query patterns
          2. Successful resolution patterns
          3. Key topics and entities
          4. Customer sentiment trends
          
          Return as JSON with structure:
          {
            queryPatterns: [{type, content, frequency}],
            resolutionPatterns: [{pattern, effectiveness}],
            entities: [{name, type, relevance}],
            sentiment: {overall, trend}
          }`
        },
        {
          role: 'user',
          content: JSON.stringify(messages)
        }
      ],
      temperature: 0.3,
    })

    const patterns = JSON.parse(analysis.choices[0]?.message?.content || '{}')

    // Store patterns in database
    for (const pattern of patterns.queryPatterns || []) {
      await storePattern(supabase, 'query', pattern)
    }

    for (const pattern of patterns.resolutionPatterns || []) {
      await storePattern(supabase, 'resolution', pattern)
    }

  } catch (error) {
    console.error('Pattern extraction failed:', error)
  }
}

async function storePattern(supabase: any, type: string, pattern: any): Promise<void> {
  // Check if similar pattern exists
  const { data: existing } = await supabase
    .from('ai_learning_patterns')
    .select('*')
    .eq('pattern_type', type)
    .single()

  if (existing) {
    // Update frequency and success rate
    await supabase.rpc('update_pattern_statistics', {
      pattern_id: existing.id,
      was_successful: pattern.effectiveness > 0.7
    })
  } else {
    // Create new pattern
    await supabase
      .from('ai_learning_patterns')
      .insert({
        pattern_type: type,
        pattern_content: pattern,
        context_tags: pattern.tags || [],
      })
  }
} 