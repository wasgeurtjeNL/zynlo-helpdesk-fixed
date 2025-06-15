import { NextRequest, NextResponse } from 'next/server';
import { gmailSync } from '../../../../lib/gmail-sync';

// This API route can be called by Vercel Cron Jobs or external cron services
export async function POST(request: NextRequest) {
  console.log('🔄 Gmail sync API route triggered');

  try {
    // Verify authorization (optional)
    const authHeader = request.headers.get('authorization');
    const expectedAuth = process.env.CRON_SECRET;

    if (expectedAuth && authHeader !== `Bearer ${expectedAuth}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Run Gmail sync
    const result = await gmailSync.syncAllChannels();

    console.log('✅ Gmail sync completed:', result);

    return NextResponse.json({
      success: true,
      message: 'Gmail sync completed',
      result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Gmail sync failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gmail sync failed',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}
