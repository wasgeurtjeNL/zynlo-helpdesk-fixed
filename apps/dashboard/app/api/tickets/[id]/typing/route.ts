import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/tickets/[id]/typing - Get active typing indicators for ticket
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

    // Get active typing indicators using stored procedure
    const { data: typingIndicators, error } = await supabase.rpc('get_typing_indicators', {
      p_ticket_id: params.id
    })

    if (error) {
      console.error('Error fetching typing indicators:', error)
      return NextResponse.json({ error: 'Failed to fetch typing indicators' }, { status: 500 })
    }

    return NextResponse.json({ 
      ticketId: params.id,
      typingUsers: typingIndicators || []
    })
  } catch (error) {
    console.error('Unexpected error in typing indicators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tickets/[id]/typing - Set typing indicator
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

    const body = await request.json()
    const { isTyping = true } = body

    // Get user details
    const { data: userDetails, error: userError } = await supabase
      .from('users')
      .select('full_name, email')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('Error fetching user details:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userName = userDetails.full_name || userDetails.email

    // Set typing indicator using stored procedure
    const { error: typingError } = await supabase.rpc('set_typing_indicator', {
      p_ticket_id: params.id,
      p_user_id: user.id,
      p_user_name: userName,
      p_is_typing: isTyping
    })

    if (typingError) {
      console.error('Error setting typing indicator:', typingError)
      return NextResponse.json({ error: 'Failed to set typing indicator' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      ticketId: params.id,
      userId: user.id,
      userName,
      isTyping
    })
  } catch (error) {
    console.error('Unexpected error in typing indicator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/tickets/[id]/typing - Clear typing indicator
export async function DELETE(
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
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const userName = userDetails.full_name || userDetails.email

    // Clear typing indicator
    const { error: typingError } = await supabase.rpc('set_typing_indicator', {
      p_ticket_id: params.id,
      p_user_id: user.id,
      p_user_name: userName,
      p_is_typing: false
    })

    if (typingError) {
      console.error('Error clearing typing indicator:', typingError)
      return NextResponse.json({ error: 'Failed to clear typing indicator' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      ticketId: params.id,
      userId: user.id,
      cleared: true
    })
  } catch (error) {
    console.error('Unexpected error clearing typing indicator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 