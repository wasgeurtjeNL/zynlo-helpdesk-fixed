import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const channelName = searchParams.get('channelName') || 'Gmail Account'
  const userId = searchParams.get('userId')
  
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error('Google OAuth credentials not configured')
    return NextResponse.redirect(
      new URL('/kanalen/email?error=oauth_not_configured', request.url)
    )
  }
  
  try {
    // Use exact production URL for callback
    const baseUrl = request.url.includes('localhost') 
      ? 'http://localhost:3000'
      : 'https://zynlo-helpdesk-fixed-dashboard-fjrm.vercel.app'
      
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${baseUrl}/api/auth/gmail/callback`
    )
    
    // Encode state data safely
    const stateData = {
      channelName,
      userId,
      timestamp: Date.now()
    }
    const state = Buffer.from(JSON.stringify(stateData)).toString('base64')
    
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email'
      ],
      prompt: 'consent',
      state: state
    })
    
    console.log(`🔗 Redirecting to Gmail OAuth for channel: ${channelName}`)
    return NextResponse.redirect(authUrl)
    
  } catch (error) {
    console.error('Gmail OAuth connect error:', error)
    return NextResponse.redirect(
      new URL('/kanalen/email?error=oauth_setup_failed', request.url)
    )
  }
} 