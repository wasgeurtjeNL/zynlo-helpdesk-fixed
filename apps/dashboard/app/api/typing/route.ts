import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// POST /api/typing - Set typing indicator
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ticketId, isTyping = true } = body

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
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

    // Set typing indicator using stored procedure
    const { error: typingError } = await supabase.rpc('set_typing_indicator', {
      p_ticket_id: ticketId,
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
      ticketId,
      userId: user.id,
      userName,
      isTyping
    })
  } catch (error) {
    console.error('Unexpected error in typing indicator:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/typing?ticketId=uuid - Get active typing indicators for ticket
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ticketId = searchParams.get('ticketId')

    if (!ticketId) {
      return NextResponse.json({ error: 'Ticket ID is required' }, { status: 400 })
    }

    // Get active typing indicators using stored procedure
    const { data: typingIndicators, error } = await supabase.rpc('get_typing_indicators', {
      p_ticket_id: ticketId
    })

    if (error) {
      console.error('Error fetching typing indicators:', error)
      return NextResponse.json({ error: 'Failed to fetch typing indicators' }, { status: 500 })
    }

    return NextResponse.json({ 
      ticketId,
      typingUsers: typingIndicators || []
    })
  } catch (error) {
    console.error('Unexpected error in typing indicators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 