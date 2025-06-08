import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const channelName = searchParams.get('channelName')
  const userId = searchParams.get('userId')
  
  console.log('Gmail OAuth connect requested:', { channelName, userId })
  
  // For production, you need to set this up with real Google OAuth
  const clientId = process.env.GOOGLE_CLIENT_ID
  const redirectUri = `${request.nextUrl.origin}/api/auth/gmail/callback`
  
  if (!clientId) {
    console.error('GOOGLE_CLIENT_ID not configured')
    return NextResponse.redirect(
      new URL('/kanalen/email?error=Google+OAuth+niet+geconfigureerd', request.url)
    )
  }
  
  // Build Google OAuth URL
  const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  googleAuthUrl.searchParams.set('client_id', clientId)
  googleAuthUrl.searchParams.set('redirect_uri', redirectUri)
  googleAuthUrl.searchParams.set('response_type', 'code')
  googleAuthUrl.searchParams.set('scope', 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.send')
  googleAuthUrl.searchParams.set('access_type', 'offline')
  googleAuthUrl.searchParams.set('prompt', 'consent')
  
  // Store channel info in state parameter (you might want to use a more secure method)
  const state = JSON.stringify({ channelName, userId })
  googleAuthUrl.searchParams.set('state', state)
  
  console.log('Redirecting to Google OAuth:', googleAuthUrl.toString())
  console.log('Callback URL will be:', redirectUri)
  
  return NextResponse.redirect(googleAuthUrl.toString())
} 