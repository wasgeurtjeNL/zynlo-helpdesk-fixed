import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/tickets/[id]/activity - Get activity feed for a ticket
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

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const actionType = searchParams.get('actionType') // Optional filter

    // Get activity feed using stored procedure
    const { data: activities, error } = await supabase.rpc('get_ticket_activity_feed', {
      p_ticket_id: params.id,
      p_limit: Math.min(limit, 100), // Cap at 100
      p_offset: offset
    })

    if (error) {
      console.error('Error fetching activity feed:', error)
      return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 })
    }

    // Filter by action type if specified
    let filteredActivities = activities || []
    if (actionType) {
      filteredActivities = activities?.filter((activity: any) => activity.action_type === actionType) || []
    }

    return NextResponse.json({
      ticketId: params.id,
      activities: filteredActivities,
      pagination: {
        limit,
        offset,
        hasMore: filteredActivities.length === limit
      }
    })
  } catch (error) {
    console.error('Unexpected error in activity feed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/tickets/[id]/activity - Create manual activity log entry
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
    const { actionType, description, actionData = {}, metadata = {} } = body

    if (!actionType || !description) {
      return NextResponse.json({ error: 'Action type and description are required' }, { status: 400 })
    }

    // Create activity log entry using stored procedure
    const { data: logId, error } = await supabase.rpc('create_activity_log', {
      p_ticket_id: params.id,
      p_user_id: user.id,
      p_user_name: null, // Will be fetched automatically
      p_action_type: actionType,
      p_description: description,
      p_action_data: actionData,
      p_metadata: metadata
    })

    if (error) {
      console.error('Error creating activity log:', error)
      return NextResponse.json({ error: 'Failed to create activity log' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      activityLogId: logId,
      ticketId: params.id
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating activity log:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 