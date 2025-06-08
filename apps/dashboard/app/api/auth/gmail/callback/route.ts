import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')
  
  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL('/kanalen/email?error=oauth_failed', request.url)
    )
  }
  
  if (!code) {
    console.error('No authorization code received')
    return NextResponse.redirect(
      new URL('/kanalen/email?error=no_code', request.url)
    )
  }
  
  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Setup OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      new URL('/api/auth/gmail/callback', request.url).toString()
    )
    
    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }
    
    // Get user info from Gmail API
    oauth2Client.setCredentials(tokens)
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    
    // Parse state to get channel info
    let channelName = 'Gmail Account'
    let userId = null
    
    if (state) {
      try {
        const stateData = JSON.parse(Buffer.from(state, 'base64').toString())
        channelName = stateData.channelName || channelName
        userId = stateData.userId
      } catch (e) {
        console.warn('Could not parse state data:', e)
      }
    }
    
    // Create channel in database
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .insert({
        name: channelName,
        type: 'email',
        provider: 'gmail',
        settings: {
          email_address: profile.data.emailAddress,
          messages_total: profile.data.messagesTotal,
          threads_total: profile.data.threadsTotal
        },
        is_active: true,
        created_by: userId
      })
      .select()
      .single()
    
    if (channelError) {
      console.error('Channel creation error:', channelError)
      throw new Error('Failed to create channel')
    }
    
    // Store OAuth tokens securely
    const { error: tokenError } = await supabase
      .from('oauth_tokens')
      .upsert({
        channel_id: channel.id,
        provider: 'gmail',
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_at: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : null,
        scope: tokens.scope || 'https://www.googleapis.com/auth/gmail.readonly',
        token_type: tokens.token_type || 'Bearer'
      })
    
    if (tokenError) {
      console.error('Token storage error:', tokenError)
      // Don't fail the whole flow, but log the error
    }
    
    console.log(`✅ Gmail OAuth successful for ${profile.data.emailAddress}`)
    
    // Redirect back to email channels page with success
    return NextResponse.redirect(
      new URL('/kanalen/email?success=gmail_connected', request.url)
    )
    
  } catch (error) {
    console.error('Gmail OAuth callback error:', error)
    
    return NextResponse.redirect(
      new URL('/kanalen/email?error=oauth_callback_failed', request.url)
    )
  }
} 