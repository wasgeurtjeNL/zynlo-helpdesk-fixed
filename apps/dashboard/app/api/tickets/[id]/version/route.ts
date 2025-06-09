import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/tickets/[id]/version - Get current ticket version
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

    // Get ticket with current version
    const { data: ticket, error } = await supabase
      .from('tickets')
      .select('id, version, updated_at')
      .eq('id', params.id)
      .single()

    if (error) {
      console.error('Error fetching ticket version:', error)
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      ticketId: ticket.id,
      version: ticket.version,
      updatedAt: ticket.updated_at 
    })
  } catch (error) {
    console.error('Unexpected error in version check:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/tickets/[id]/version - Update ticket with version check
export async function PUT(
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
    const { 
      expectedVersion, 
      subject, 
      description, 
      status, 
      priority, 
      assigneeId, 
      tags 
    } = body

    if (typeof expectedVersion !== 'number') {
      return NextResponse.json({ error: 'Expected version is required' }, { status: 400 })
    }

    // Use stored procedure for atomic version check and update
    const { data: result, error } = await supabase.rpc('update_ticket_with_version_check', {
      p_ticket_id: params.id,
      p_expected_version: expectedVersion,
      p_subject: subject || null,
      p_description: description || null,
      p_status: status || null,
      p_priority: priority || null,
      p_assignee_id: assigneeId || null,
      p_tags: tags || null
    })

    if (error) {
      console.error('Error updating ticket with version check:', error)
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    const updateResult = result[0]

    if (updateResult.conflict) {
      return NextResponse.json(
        { 
          error: 'Version conflict detected',
          conflict: true,
          currentVersion: updateResult.current_version,
          expectedVersion
        }, 
        { status: 409 }
      )
    }

    if (!updateResult.success) {
      return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      newVersion: updateResult.new_version,
      conflict: false
    })
  } catch (error) {
    console.error('Unexpected error in ticket version update:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 