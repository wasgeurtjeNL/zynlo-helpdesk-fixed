/**
 * Gmail OAuth Initialization Route
 * Uses official googleapis library via GmailOAuthService
 */

import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { createGmailOAuthService } from '@/lib/gmail-oauth';

export const runtime = 'nodejs';

export async function GET() {
  try {
    console.log('🚀 Gmail OAuth Init - Starting...');

    // Create Gmail OAuth service with official googleapis library
    const gmailOAuth = createGmailOAuthService();

    // Get current user from Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('❌ User authentication failed:', userError);
      return NextResponse.json({ error: 'User not authenticated' }, { status: 401 });
    }

    // Generate secure state for OAuth flow
    const rawState = {
      id: randomUUID(),
      uid: user.id,
      timestamp: Date.now(),
    };
    const state = Buffer.from(JSON.stringify(rawState)).toString('base64url');

    // Generate authorization URL using official googleapis
    const authUrl = gmailOAuth.generateAuthUrl(state);

    console.log('✅ Gmail OAuth URL generated successfully');
    console.log(
      '🔗 Redirect URI configured:',
      process.env.NEXT_PUBLIC_APP_URL + '/api/auth/gmail/callback'
    );

    // Set secure state cookie
    const response = NextResponse.json({
      url: authUrl,
      state: rawState.id, // For debugging
    });

    response.cookies.set('gmail_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 600, // 10 minutes
      sameSite: 'lax',
    });

    return response;
  } catch (error: unknown) {
    const err = error as Error;
    console.error('❌ Gmail OAuth Init Error:', err);

    // Check if it's a configuration error
    if (err.message.includes('Gmail OAuth credentials not configured')) {
      return NextResponse.json(
        {
          error: 'Gmail OAuth not configured',
          message: 'Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in environment variables',
          setup_required: true,
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to initialize Gmail OAuth',
        message: err.message,
      },
      { status: 500 }
    );
  }
}
