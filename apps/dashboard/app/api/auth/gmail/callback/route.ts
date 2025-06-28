// Gmail OAuth callback
// Path: /api/auth/gmail/callback (GET)
// Exchanges code for tokens, retrieves user email, stores refresh token in Supabase channels.

import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  // CSRF check
  const cookieState = request.cookies.get('gmail_oauth_state')?.value;
  if (!state || !cookieState || state !== cookieState) {
    return new NextResponse('State mismatch', { status: 400 });
  }

  if (!code) {
    return new NextResponse('Missing code', { status: 400 });
  }

  const clientId = process.env.GMAIL_CLIENT_ID!;
  const clientSecret = process.env.GMAIL_CLIENT_SECRET!;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL!;

  const redirectUri = `${appUrl}/api/auth/gmail/callback`;
  const oAuth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri });

  try {
    const { tokens } = await oAuth2Client.getToken(code);
    if (!tokens.refresh_token) {
      return new NextResponse('No refresh token received', { status: 400 });
    }

    oAuth2Client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });
    const profile = await gmail.users.getProfile({ userId: 'me' });
    const emailAddress = profile.data.emailAddress;

    // Decode state to get userId
    let createdBy: string | null = null;
    try {
      const decoded = JSON.parse(Buffer.from(state, 'base64url').toString());
      createdBy = decoded.uid || null;
    } catch {}

    // Save into Supabase channels table
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const channelId = randomUUID();
    await supabase.from('channels').insert({
      id: channelId,
      name: 'Gmail',
      type: 'email',
      provider: 'gmail',
      is_active: true,
      email_address: emailAddress,
      settings: {
        email_address: emailAddress,
        oauth_refresh_token: tokens.refresh_token,
        oauth_access_token: tokens.access_token,
        oauth_expires_at: tokens.expiry_date,
      },
      created_by: createdBy,
    });

    // Store OAuth tokens in separate table for easy refresh handling
    const { error: tokenUpsertError } = await supabase
      // @ts-ignore  // oauth_tokens not in generated types yet
      .from('oauth_tokens')
      .upsert({
        channel_id: channelId,
        provider: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || 'https://mail.google.com/',
        token_type: tokens.token_type || 'Bearer',
      });

    if (tokenUpsertError) {
      console.error('[Gmail-callback] oauth_tokens upsert error', tokenUpsertError);
      // Niet blokkeren; kanaal is al gemaakt. Popup sluit gewoon.
    }

    const html = `<!DOCTYPE html><html><body><script>window.close();window.opener.postMessage({success:true, channelId:'${channelId}'}, '*');</script><p>Succes! U kunt dit venster sluiten.</p></body></html>`;
    const res = new NextResponse(html, { headers: { 'Content-Type': 'text/html' } });
    res.cookies.delete('gmail_oauth_state');
    return res;
  } catch (err) {
    console.error('Gmail OAuth error', err);
    return new NextResponse('OAuth error', { status: 500 });
  }
}
