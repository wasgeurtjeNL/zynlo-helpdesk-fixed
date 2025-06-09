import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Allow access for debugging this specific issue
  // In production, you might want to restrict this further
  console.log('🐛 Debug endpoint accessed')
  
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
      service_role_key: {
        exists: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
        prefix: process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 15) + '...' || 'not set'
      },
      service_key_fallback: {
        exists: !!process.env.SUPABASE_SERVICE_KEY,
        length: process.env.SUPABASE_SERVICE_KEY?.length || 0,
        prefix: process.env.SUPABASE_SERVICE_KEY?.substring(0, 15) + '...' || 'not set'
      },
      effective_key: {
        source: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SUPABASE_SERVICE_ROLE_KEY' : 
                process.env.SUPABASE_SERVICE_KEY ? 'SUPABASE_SERVICE_KEY' : 'NONE_AVAILABLE',
        length: (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)?.length || 0
      }
    }
  }
  
  return NextResponse.json(config)
} 