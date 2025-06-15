// New API route: Initiate Gmail OAuth flow
// Path: /api/auth/gmail/init (GET)
// Returns JSON { url } with the Google consent URL and sets a secure httpOnly cookie for state validation.

import { NextResponse, NextRequest } from 'next/server'
import { google } from 'googleapis'
import { randomUUID } from 'crypto'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${req.nextUrl.port || '3000'}`

  console.log('Gmail OAuth config check:', {
    hasClientId: !!clientId,
    hasClientSecret: !!clientSecret,
    appUrl: appUrl
  })

  if (!clientId || !clientSecret) {
    return NextResponse.json(
      { error: 'Gmail OAuth is not configured on the server. Missing GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET in environment variables.' },
      { status: 500 }
    )
  }

  const redirectUri = `${appUrl}/api/auth/gmail/callback`
  const oAuth2Client = new google.auth.OAuth2({ clientId, clientSecret, redirectUri })

  // Include userId in state (base64) so callback can associate channel with user
  const supabase = createRouteHandlerClient({ cookies })
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const rawState = {
    id: randomUUID(),
    uid: user?.id || null,
  }
  const state = Buffer.from(JSON.stringify(rawState)).toString('base64url')

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://mail.google.com/'],
    state,
  })

  const res = NextResponse.json({ url: authUrl })
  // Store state in secure cookie for 10 minutes
  res.cookies.set('gmail_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 600,
    sameSite: 'lax',
  })
  return res
} 