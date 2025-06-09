import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = params
  
  try {
    console.log(`📧 Gmail sync started for channel: ${channelId}`)
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()
    
    if (channelError || !channel) {
      console.error('Channel lookup error:', channelError)
      throw new Error('Channel niet gevonden')
    }
    
    // Get OAuth tokens for this channel (with fallback to legacy storage)
    let tokenData = null
    let tokenError = null
    
    // Try new oauth_tokens table first
    const { data: newTokenData, error: newTokenError } = await supabase
      .from('oauth_tokens')
      .select('*')
      .eq('channel_id', channelId)
      .eq('provider', 'gmail')
      .single()
    
    if (newTokenData && !newTokenError) {
      tokenData = newTokenData
    } else {
      // Fallback: check legacy storage in channels.settings
      console.log('🔄 Checking legacy token storage...')
      if (channel.settings?.oauth_token) {
        tokenData = {
          access_token: channel.settings.oauth_token,
          refresh_token: channel.settings.refresh_token,
          expires_at: channel.settings.token_expiry ? new Date(channel.settings.token_expiry).toISOString() : null,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/gmail.readonly'
        }
        console.log('📦 Using legacy tokens from channel settings')
      }
    }
    
    if (!tokenData?.access_token) {
      console.error('OAuth tokens not found:', newTokenError)
      throw new Error('Gmail tokens niet gevonden - kanaal opnieuw koppelen')
    }
    
    // Setup Gmail API client with stored tokens
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : undefined
    })
    
    // Check if token needs refresh
    const now = new Date()
    const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null
    
    console.log(`🕐 Token check: expires=${expiresAt?.toISOString()}, now=${now.toISOString()}`)
    
    if (expiresAt && expiresAt <= now) {
      console.log('🔄 Token expired, attempting refresh...')
      
      if (!tokenData.refresh_token) {
        console.error('❌ No refresh token available')
        throw new Error('Geen refresh token - kanaal opnieuw koppelen vereist')
      }
      
      // Check if Google OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.error('❌ Google OAuth credentials not configured')
        throw new Error('OAuth configuratie ontbreekt - contacteer administrator')
      }
      
      try {
        console.log('🔑 Using refresh token to get new access token...')
        const { credentials } = await oauth2Client.refreshAccessToken()
        
        if (!credentials.access_token) {
          throw new Error('No access token received from refresh')
        }
        
        console.log('✅ New access token received')
        
        // Update tokens in both locations for compatibility
        if (newTokenData && !newTokenError) {
          console.log('💾 Updating oauth_tokens table...')
          const { error: updateError } = await supabase
            .from('oauth_tokens')
            .update({
              access_token: credentials.access_token,
              expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('channel_id', channelId)
            .eq('provider', 'gmail')
            
          if (updateError) {
            console.error('Failed to update oauth_tokens:', updateError)
          }
        }
        
        // Also update legacy storage in channel settings
        if (channel.settings?.oauth_token) {
          console.log('💾 Updating channel settings...')
          const updatedSettings = {
            ...channel.settings,
            oauth_token: credentials.access_token,
            token_expiry: credentials.expiry_date || null
          }
          
          const { error: channelUpdateError } = await supabase
            .from('channels')
            .update({ settings: updatedSettings })
            .eq('id', channelId)
            
          if (channelUpdateError) {
            console.error('Failed to update channel settings:', channelUpdateError)
          }
        }
        
        // Update local tokenData object for immediate use
        tokenData.access_token = credentials.access_token
        tokenData.expires_at = credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null
        
        // Update oauth2Client credentials
        oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expiry_date: credentials.expiry_date
        })
          
        console.log('✅ Token refresh completed successfully')
        
      } catch (refreshError: any) {
        console.error('❌ Token refresh failed:', refreshError)
        
        // Check for specific Google API errors
        if (refreshError?.message?.includes('invalid_grant')) {
          throw new Error('Refresh token verlopen - kanaal opnieuw koppelen vereist')
        } else if (refreshError?.message?.includes('invalid_client')) {
          throw new Error('OAuth configuratie ongeldig - contacteer administrator')
        } else {
          console.error('Refresh error details:', {
            message: refreshError?.message,
            code: refreshError?.code,
            status: refreshError?.status
          })
          throw new Error(`Token vernieuwen mislukt: ${refreshError?.message || 'Onbekende fout'}`)
        }
      }
    } else {
      console.log('✅ Token is still valid')
    }
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Get recent emails (last 24 hours for now)
    const oneDayAgo = new Date()
    oneDayAgo.setDate(oneDayAgo.getDate() - 1)
    const query = `after:${Math.floor(oneDayAgo.getTime() / 1000)}`
    
    console.log(`📮 Fetching emails with query: ${query}`)
    
    const messagesResponse = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 50
    })
    
    const messages = messagesResponse.data.messages || []
    console.log(`📨 Found ${messages.length} recent messages`)
    
    let newEmails = 0
    let processedEmails = 0
    let errors = 0
    
    for (const message of messages) {
      try {
        // Get full message details
        const fullMessage = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full'
        })
        
        const headers = fullMessage.data.payload?.headers || []
        const fromHeader = headers.find(h => h.name?.toLowerCase() === 'from')
        const subjectHeader = headers.find(h => h.name?.toLowerCase() === 'subject')
        const dateHeader = headers.find(h => h.name?.toLowerCase() === 'date')
        
        // Basic email info
        const emailInfo = {
          messageId: message.id,
          from: fromHeader?.value || 'Unknown',
          subject: subjectHeader?.value || 'No Subject',
          date: dateHeader?.value || new Date().toISOString(),
          snippet: fullMessage.data.snippet || ''
        }
        
        console.log(`📧 Processing: ${emailInfo.subject} from ${emailInfo.from}`)
        
        // TODO: Convert to ticket/message in database
        // For now, just count and log
        processedEmails++
        
        // Check if this is a new email (simplified check)
        const isNewEmail = !fullMessage.data.labelIds?.includes('INBOX') || 
                          fullMessage.data.labelIds?.includes('UNREAD')
        
        if (isNewEmail) {
          newEmails++
        }
        
      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError)
        errors++
      }
    }
    
    // Update channel sync info
    const { error: updateError } = await supabase
      .from('channels')
      .update({ 
        last_sync: new Date().toISOString(),
        settings: {
          ...channel.settings,
          sync_count: (channel.settings?.sync_count || 0) + 1,
          last_sync_stats: {
            total_found: messages.length,
            processed: processedEmails,
            new_emails: newEmails,
            errors: errors
          }
        }
      })
      .eq('id', channelId)
    
    if (updateError) {
      console.error('Update error:', updateError)
    }
    
    console.log(`✅ Gmail sync completed: ${processedEmails} processed, ${newEmails} new emails`)
    
    return NextResponse.json({ 
      success: true, 
      message: `Gmail sync voltooid voor ${channel.name}`,
      channelId,
      channelName: channel.name,
      result: {
        totalFound: messages.length,
        processed: processedEmails,
        newEmails: newEmails,
        errors: errors,
        status: 'completed'
      },
      lastSync: new Date().toISOString(),
      implementation_status: "live"
    })
    
  } catch (error) {
    console.error('Gmail sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      },
      { status: 500 }
    )
  }
} 