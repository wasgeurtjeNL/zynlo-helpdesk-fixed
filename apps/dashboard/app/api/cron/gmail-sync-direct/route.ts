import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Direct Gmail sync cron job initiated');

    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Call the Gmail sync Edge Function directly
    const { data: functionResult, error: functionError } = await supabase.functions.invoke(
      'gmail-sync',
      {
        body: {
          trigger: 'vercel_direct_cron',
          timestamp: new Date().toISOString(),
        },
      }
    );

    if (functionError) {
      console.error('❌ Direct Gmail sync failed:', functionError);

      // Log the failure to database
      await supabase.from('system_logs').insert({
        level: 'error',
        message: 'Direct Vercel cron Gmail sync failed',
        metadata: {
          error: functionError.message,
          function: 'vercel_direct_cron',
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json(
        {
          success: false,
          error: functionError.message,
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      );
    }

    console.log('✅ Direct Gmail sync completed:', functionResult);

    // Log successful sync
    await supabase.from('system_logs').insert({
      level: 'info',
      message: 'Direct Vercel cron Gmail sync completed successfully',
      metadata: {
        result: functionResult,
        function: 'vercel_direct_cron',
        timestamp: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Direct Gmail sync completed successfully',
      result: functionResult,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Direct Gmail sync cron job failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
