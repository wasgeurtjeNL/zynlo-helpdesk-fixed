import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Only allow in development or with specific debug header
  const debugHeader = request.headers.get('x-debug-key')
  const isDev = process.env.NODE_ENV === 'development'
  
  if (!isDev && debugHeader !== 'debug-oauth-config') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const config = {
    environment: process.env.NODE_ENV || 'unknown',
    timestamp: new Date().toISOString(),
    oauth: {
      google_client_id: {
        exists: !!process.env.GOOGLE_CLIENT_ID,
        length: process.env.GOOGLE_CLIENT_ID?.length || 0,
        prefix: process.env.GOOGLE_CLIENT_ID?.substring(0, 10) + '...' || 'not set'
      },
      google_client_secret: {
        exists: !!process.env.GOOGLE_CLIENT_SECRET,
        length: process.env.GOOGLE_CLIENT_SECRET?.length || 0,
        prefix: process.env.GOOGLE_CLIENT_SECRET ? 'GOCSPX-...' : 'not set'
      }
    },
    supabase: {
      url: {
        exists: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        value: process.env.NEXT_PUBLIC_SUPABASE_URL || 'not set'
      },
      service_key: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
      }
    }
  }
  
  return NextResponse.json(config)
} 