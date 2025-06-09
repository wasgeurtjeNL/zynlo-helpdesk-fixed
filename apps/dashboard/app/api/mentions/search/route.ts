import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// GET /api/mentions/search?q=username - Search users for @mention autocomplete
export async function GET(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query || query.trim().length < 1) {
      return NextResponse.json({ users: [] })
    }

    // Use the stored procedure to get mention suggestions
    const { data: suggestions, error } = await supabase.rpc('get_mention_suggestions', {
      p_query: query.trim(),
      p_limit: Math.min(limit, 20) // Cap at 20 results
    })

    if (error) {
      console.error('Error fetching mention suggestions:', error)
      return NextResponse.json({ error: 'Failed to search users' }, { status: 500 })
    }

    return NextResponse.json({ users: suggestions || [] })
  } catch (error) {
    console.error('Unexpected error in mentions search:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 