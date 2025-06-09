import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/notifications - Get user notifications
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const type = searchParams.get('type') // Optional filter
    const unreadOnly = searchParams.get('unreadOnly') === 'true'

    let query = supabase
      .from('notifications')
      .select(`
        id,
        type,
        title,
        message,
        action_url,
        data,
        is_read,
        is_seen,
        created_at,
        ticket_id,
        tickets!inner(number, subject),
        related_user_id,
        users(full_name, email)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Apply filters
    if (type) {
      query = query.eq('type', type)
    }
    if (unreadOnly) {
      query = query.eq('is_read', false)
    }

    const { data: notifications, error } = await query

    if (error) {
      console.error('Error fetching notifications:', error)
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 })
    }

    // Get notification stats
    const { data: stats, error: statsError } = await supabase.rpc('get_notification_stats', {
      p_user_id: user.id
    })

    if (statsError) {
      console.error('Error fetching notification stats:', statsError)
    }

    return NextResponse.json({
      notifications: notifications || [],
      stats: stats?.[0] || { total_count: 0, unread_count: 0, unseen_count: 0 },
      pagination: {
        limit,
        offset,
        hasMore: (notifications?.length || 0) === limit
      }
    })
  } catch (error) {
    console.error('Unexpected error in notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/notifications - Create a notification (system use)
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { 
      userId, 
      type, 
      title, 
      message, 
      actionUrl, 
      data = {}, 
      ticketId, 
      relatedUserId 
    } = body

    if (!userId || !type || !title || !message) {
      return NextResponse.json({ 
        error: 'User ID, type, title, and message are required' 
      }, { status: 400 })
    }

    // Create notification using stored procedure
    const { data: notificationId, error } = await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_type: type,
      p_title: title,
      p_message: message,
      p_action_url: actionUrl || null,
      p_data: data,
      p_ticket_id: ticketId || null,
      p_related_user_id: relatedUserId || null
    })

    if (error) {
      console.error('Error creating notification:', error)
      return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      notificationId
    }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error creating notification:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/notifications - Mark notifications as read/seen
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, notificationIds, markAll = false } = body

    if (!action || !['read', 'seen'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use "read" or "seen"' }, { status: 400 })
    }

    let result
    if (action === 'read') {
      const { data, error } = await supabase.rpc('mark_notifications_as_read', {
        p_user_id: user.id,
        p_notification_ids: notificationIds || null,
        p_mark_all: markAll
      })
      
      if (error) throw error
      result = { updatedCount: data }
    } else if (action === 'seen') {
      const { data, error } = await supabase.rpc('mark_notifications_as_seen', {
        p_user_id: user.id,
        p_notification_ids: notificationIds || null
      })
      
      if (error) throw error
      result = { updatedCount: data }
    }

    return NextResponse.json({
      success: true,
      action,
      ...result
    })
  } catch (error) {
    console.error('Unexpected error updating notifications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 