import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/tickets/[id]/comments - Get internal comments for a ticket
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the ticket to verify access
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select('id')
      .eq('id', params.id)
      .single()

    if (ticketError || !ticket) {
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    // Get internal comments for the ticket
    const { data: comments, error } = await supabase
      .from('messages')
      .select(`
        id,
        content,
        sender_type,
        sender_id,
        sender_name,
        created_at,
        conversation_id,
        conversations!inner(ticket_id)
      `)
      .eq('conversations.ticket_id', params.id)
      .eq('is_internal', true)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching comments:', error)
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
    }

    return NextResponse.json({ comments })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tickets/[id]/comments - Add internal comment to a ticket
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user details
    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user details:', userError)
      return NextResponse.json({ error: 'Failed to fetch user details' }, { status: 500 })
    }

    const body = await request.json()
    const { content } = body

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 })
    }

    // Get or create conversation for the ticket
    let { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id')
      .eq('ticket_id', params.id)
      .eq('channel', 'chat') // Use 'chat' for internal comments
      .single()

    if (convError && convError.code === 'PGRST116') {
      // No conversation exists, create one
      const { data: newConversation, error: createError } = await supabase
        .from('conversations')
        .insert({
          ticket_id: params.id,
          channel: 'chat',
          metadata: { type: 'internal_comments' }
        })
        .select('id')
        .single()

      if (createError) {
        console.error('Error creating conversation:', createError)
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 })
      }

      conversation = newConversation
    } else if (convError) {
      console.error('Error fetching conversation:', convError)
      return NextResponse.json({ error: 'Failed to fetch conversation' }, { status: 500 })
    }

    if (!conversation) {
      return NextResponse.json({ error: 'Failed to get conversation' }, { status: 500 })
    }

    // Create the internal comment
    const { data: comment, error: commentError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content: content.trim(),
        sender_type: 'agent',
        sender_id: user.id,
        sender_name: userDetails.full_name || userDetails.email,
        is_internal: true,
        metadata: {
          comment_type: 'internal',
          user_id: user.id
        }
      })
      .select(`
        id,
        content,
        sender_type,
        sender_id,
        sender_name,
        created_at,
        conversation_id
      `)
      .single()

    if (commentError) {
      console.error('Error creating comment:', commentError)
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
    }

    // Process @mentions in the comment content
    try {
      await supabase.rpc('extract_and_store_mentions', {
        p_message_id: comment.id,
        p_content: content.trim(),
        p_mentioned_by_user_id: user.id
      })
    } catch (mentionError) {
      // Log error but don't fail the comment creation
      console.error('Error processing mentions:', mentionError)
    }

    // Update ticket's updated_at timestamp
    await supabase
      .from('tickets')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', params.id)

    return NextResponse.json({ comment }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 