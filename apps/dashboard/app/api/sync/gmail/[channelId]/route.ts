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
        
        // Convert email to ticket/conversation/message in database
        try {
          // Extract email address from 'from' header (format: "Name <email@domain.com>" or "email@domain.com")
          const emailMatch = emailInfo.from.match(/<([^>]+)>/) || emailInfo.from.match(/([^\s<>]+@[^\s<>]+)/);
          const customerEmail = emailMatch ? emailMatch[1] || emailMatch[0] : emailInfo.from;
          const customerName = emailInfo.from.replace(/<[^>]+>/, '').trim() || customerEmail;

          console.log(`👤 Customer: ${customerName} (${customerEmail})`);

          // 1. Find or create customer
          let customer = null;
          const { data: existingCustomer } = await supabase
            .from('customers')
            .select('*')
            .eq('email', customerEmail)
            .single();

          if (existingCustomer) {
            customer = existingCustomer;
            console.log(`✅ Found existing customer: ${customer.id}`);
          } else {
            const { data: newCustomer, error: customerError } = await supabase
              .from('customers')
              .insert({
                email: customerEmail,
                name: customerName,
                metadata: {
                  created_via: 'gmail_sync',
                  channel_id: channelId
                }
              })
              .select()
              .single();

            if (customerError) {
              console.error('❌ Failed to create customer:', customerError);
              throw customerError;
            }
            
            customer = newCustomer;
            console.log(`➕ Created new customer: ${customer.id}`);
          }

          // 2. Check if ticket already exists for this email (based on gmail message ID)
          const { data: existingTicket } = await supabase
            .from('tickets')
            .select(`
              id, number, subject, status,
              conversations!inner(
                id, external_id, metadata
              )
            `)
            .eq('conversations.external_id', emailInfo.messageId)
            .eq('conversations.channel', 'email')
            .single();

          if (existingTicket) {
            console.log(`🎫 Email already processed as ticket #${existingTicket.number}`);
            processedEmails++;
            continue; // Skip to next email
          }

          // 3. Create new ticket
          const { data: newTicket, error: ticketError } = await supabase
            .from('tickets')
            .insert({
              subject: emailInfo.subject || 'No Subject',
              description: emailInfo.snippet || '',
              status: 'new',
              priority: 'normal',
              customer_id: customer.id,
              metadata: {
                created_via: 'gmail_sync',
                channel_id: channelId,
                gmail_message_id: emailInfo.messageId,
                original_date: emailInfo.date
              }
            })
            .select()
            .single();

          if (ticketError) {
            console.error('❌ Failed to create ticket:', ticketError);
            throw ticketError;
          }

          console.log(`🎫 Created ticket #${newTicket.number}: ${newTicket.subject}`);

          // 4. Create conversation
          const { data: conversation, error: conversationError } = await supabase
            .from('conversations')
            .insert({
              ticket_id: newTicket.id,
              channel: 'email',
              external_id: emailInfo.messageId,
              metadata: {
                gmail_thread_id: fullMessage.data.threadId,
                labels: fullMessage.data.labelIds || [],
                channel_id: channelId
              }
            })
            .select()
            .single();

          if (conversationError) {
            console.error('❌ Failed to create conversation:', conversationError);
            throw conversationError;
          }

          console.log(`💬 Created conversation: ${conversation.id}`);

          // 5. Get email content (basic text extraction)
          let emailContent = emailInfo.snippet || '';
          
          // Try to extract better content from email body
          if (fullMessage.data.payload?.body?.data) {
            try {
              const decodedContent = Buffer.from(fullMessage.data.payload.body.data, 'base64').toString('utf-8');
              emailContent = decodedContent.substring(0, 10000); // Limit content length
            } catch (decodeError) {
              console.warn('Failed to decode email body, using snippet');
            }
          }

          // 6. Create message
          const { data: message, error: messageError } = await supabase
            .from('messages')
            .insert({
              conversation_id: conversation.id,
              content: emailContent,
              sender_type: 'customer',
              sender_id: customer.id,
              sender_name: customerName,
              content_type: 'text/html',
              metadata: {
                gmail_message_id: emailInfo.messageId,
                original_date: emailInfo.date,
                from: emailInfo.from,
                to: headers.find(h => h.name?.toLowerCase() === 'to')?.value,
                cc: headers.find(h => h.name?.toLowerCase() === 'cc')?.value,
                message_size: fullMessage.data.sizeEstimate || 0
              }
            })
            .select()
            .single();

          if (messageError) {
            console.error('❌ Failed to create message:', messageError);
            throw messageError;
          }

          console.log(`📨 Created message: ${message.id}`);
          console.log(`✅ Successfully converted email to ticket #${newTicket.number}`);

          newEmails++;
          processedEmails++;

        } catch (conversionError) {
          console.error(`❌ Failed to convert email ${emailInfo.messageId}:`, conversionError);
          errors++;
          processedEmails++; // Count as processed even if failed
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