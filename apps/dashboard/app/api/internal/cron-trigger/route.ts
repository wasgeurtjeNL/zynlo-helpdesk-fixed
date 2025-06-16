import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    console.log('🔄 Internal cron trigger check initiated');

    // Initialize Supabase client with service role
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check for recent cron triggers that haven't been processed
    const { data: recentTriggers, error } = await supabase
      .from('system_logs')
      .select('id, created_at, metadata')
      .eq('level', 'info')
      .eq('message', 'Gmail sync triggered via cron job')
      .gte('created_at', new Date(Date.now() - 120000).toISOString()) // Last 2 minutes
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    if (!recentTriggers || recentTriggers.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No recent cron triggers found',
        timestamp: new Date().toISOString(),
      });
    }

    console.log(`Found ${recentTriggers.length} recent cron triggers`);

    // Process the most recent trigger
    const latestTrigger = recentTriggers[0];

    // Call the Gmail sync Edge Function
    const { data: functionResult, error: functionError } = await supabase.functions.invoke(
      'gmail-sync',
      {
        body: {
          trigger: 'internal_cron_handler',
          cron_log_id: latestTrigger.id,
        },
      }
    );

    if (functionError) {
      console.error('❌ Edge Function call failed:', functionError);

      // Log the failure
      await supabase.from('system_logs').insert({
        level: 'error',
        message: 'Internal cron trigger failed to call Edge Function',
        metadata: {
          error: functionError.message,
          cron_log_id: latestTrigger.id,
          function: 'internal_cron_trigger',
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

    console.log('✅ Gmail sync Edge Function called successfully:', functionResult);

    // Log successful trigger
    await supabase.from('system_logs').insert({
      level: 'info',
      message: 'Internal cron trigger successfully called Edge Function',
      metadata: {
        result: functionResult,
        cron_log_id: latestTrigger.id,
        function: 'internal_cron_trigger',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Gmail sync triggered successfully',
      result: functionResult,
      processed_trigger: latestTrigger.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Internal cron trigger failed:', error);

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

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
