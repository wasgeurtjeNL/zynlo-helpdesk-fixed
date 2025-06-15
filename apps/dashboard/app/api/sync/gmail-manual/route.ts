import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 Manual Gmail sync triggered');

    // Initialize Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the Edge Function directly
    const { data, error } = await supabase.functions.invoke('gmail-sync', {
      body: { trigger: 'manual' },
    });

    if (error) {
      console.error('❌ Manual Gmail sync failed:', error);
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    console.log('✅ Manual Gmail sync completed:', data);

    return NextResponse.json({
      success: true,
      message: 'Manual Gmail sync completed',
      result: data,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Manual Gmail sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Manual Gmail sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy browser testing
export async function GET(request: NextRequest) {
  return POST(request);
}
