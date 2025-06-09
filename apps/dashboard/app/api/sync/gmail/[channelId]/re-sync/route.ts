import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { google } from 'googleapis'

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = params
  
  try {
    console.log(`🔄 Gmail re-sync started for channel: ${channelId}`)
    
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
    
    // Get OAuth tokens for this channel
    let tokenData = null
    
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
      if (channel.settings?.oauth_token) {
        tokenData = {
          access_token: channel.settings.oauth_token,
          refresh_token: channel.settings.refresh_token,
          expires_at: channel.settings.token_expiry ? new Date(channel.settings.token_expiry).toISOString() : null,
          token_type: 'Bearer',
          scope: 'https://www.googleapis.com/auth/gmail.readonly'
        }
      }
    }
    
    if (!tokenData?.access_token) {
      throw new Error('Gmail tokens niet gevonden - kanaal opnieuw koppelen')
    }
    
    // Setup Gmail API client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )
    
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : undefined
    })
    
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
    
    // Find all existing tickets created via Gmail sync for this channel
    const { data: existingTickets, error: ticketsError } = await supabase
      .from('tickets')
      .select(`
        id, number, subject, 
        metadata,
        conversations!inner(
          id, external_id,
          messages(id, content, content_type, metadata)
        )
      `)
      .eq('metadata->>created_via', 'gmail_sync')
      .eq('metadata->>channel_id', channelId)
      .eq('conversations.channel', 'email')
    
    if (ticketsError) {
      console.error('Error fetching existing tickets:', ticketsError)
      throw new Error('Fout bij ophalen bestaande tickets')
    }
    
    if (!existingTickets || existingTickets.length === 0) {
      console.log('📭 No existing Gmail tickets found for re-sync')
      return NextResponse.json({
        success: true,
        message: 'Geen bestaande Gmail tickets gevonden',
        result: { processed: 0, updated: 0, errors: 0 }
      })
    }
    
    console.log(`📋 Found ${existingTickets.length} existing Gmail tickets to re-sync`)
    
    let processed = 0
    let updated = 0
    let errors = 0
    
    // Function to recursively extract content from email parts (same as in main sync)
    const extractEmailContent = (payload: any): { content: string, contentType: string } => {
      const decodeContent = (data: string): string => {
        try {
          return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
        } catch (error) {
          console.warn('Failed to decode content:', error);
          return '';
        }
      };

      if (payload.body?.data) {
        const mimeType = payload.mimeType || 'text/plain';
        const content = decodeContent(payload.body.data);
        return { content, contentType: mimeType };
      }

      if (payload.parts && Array.isArray(payload.parts)) {
        let htmlContent = '';
        let textContent = '';
        let foundContentType = 'text/plain';

        for (const part of payload.parts) {
          const partResult = extractEmailContent(part);
          
          if (part.mimeType === 'text/html' && partResult.content) {
            htmlContent = partResult.content;
            foundContentType = 'text/html';
          } else if (part.mimeType === 'text/plain' && partResult.content) {
            textContent = partResult.content;
          }
          
          if (part.parts) {
            const nestedResult = extractEmailContent(part);
            if (part.mimeType?.includes('text/html') || nestedResult.contentType === 'text/html') {
              htmlContent = htmlContent || nestedResult.content;
              foundContentType = 'text/html';
            } else if (nestedResult.content) {
              textContent = textContent || nestedResult.content;
            }
          }
        }

        if (htmlContent) {
          return { content: htmlContent, contentType: 'text/html' };
        } else if (textContent) {
          return { content: textContent, contentType: 'text/plain' };
        }
      }

      return { content: '', contentType: 'text/plain' };
    };
    
    // Process each ticket
    for (const ticket of existingTickets) {
      try {
        processed++
        
        // Get the Gmail message ID from conversation
        const conversation = ticket.conversations[0]
        if (!conversation?.external_id) {
          console.warn(`⚠️ Ticket #${ticket.number}: No Gmail message ID found`)
          continue
        }
        
        const gmailMessageId = conversation.external_id
        console.log(`🔄 Re-syncing ticket #${ticket.number} (Gmail ID: ${gmailMessageId})`)
        
        // Fetch the original email from Gmail
        let fullMessage
        try {
          fullMessage = await gmail.users.messages.get({
            userId: 'me',
            id: gmailMessageId,
            format: 'full'
          })
        } catch (gmailError: any) {
          console.error(`❌ Failed to fetch Gmail message ${gmailMessageId}:`, gmailError?.message)
          if (gmailError?.message?.includes('Not Found')) {
            console.warn(`⚠️ Gmail message ${gmailMessageId} no longer exists, skipping`)
            continue
          }
          errors++
          continue
        }
        
        // Extract content using new comprehensive method
        let emailContent = ''
        let contentType = 'text/plain'
        
        try {
          if (fullMessage.data.payload) {
            const extracted = extractEmailContent(fullMessage.data.payload)
            if (extracted.content) {
              emailContent = extracted.content
              contentType = extracted.contentType
              console.log(`📧 Re-extracted ${contentType} content (${emailContent.length} chars)`)
            }
          }
        } catch (extractError) {
          console.error(`❌ Content extraction failed for ticket #${ticket.number}:`, extractError)
          errors++
          continue
        }
        
        if (!emailContent) {
          console.warn(`⚠️ No content extracted for ticket #${ticket.number}`)
          continue
        }
        
        // Update the message content
        const messages = conversation.messages || []
        if (messages.length === 0) {
          console.warn(`⚠️ Ticket #${ticket.number}: No messages found`)
          continue
        }
        
        const messageToUpdate = messages[0] // Usually the first (and only) message
        const oldContentLength = messageToUpdate.content?.length || 0
        
        // Only update if the new content is significantly longer (indicates improvement)
        if (emailContent.length <= oldContentLength * 1.5) {
          console.log(`📝 Ticket #${ticket.number}: Content not significantly improved (${oldContentLength} → ${emailContent.length} chars), skipping`)
          continue
        }
        
        const { error: updateError } = await supabase
          .from('messages')
          .update({
            content: emailContent,
            content_type: contentType,
            metadata: {
              ...messageToUpdate.metadata,
              re_synced_at: new Date().toISOString(),
              re_sync_reason: 'improved_content_extraction',
              old_content_length: oldContentLength,
              new_content_length: emailContent.length
            }
          })
          .eq('id', messageToUpdate.id)
        
        if (updateError) {
          console.error(`❌ Failed to update message for ticket #${ticket.number}:`, updateError)
          errors++
          continue
        }
        
        console.log(`✅ Updated ticket #${ticket.number}: ${oldContentLength} → ${emailContent.length} chars`)
        updated++
        
      } catch (ticketError) {
        console.error(`❌ Error processing ticket #${ticket.number}:`, ticketError)
        errors++
      }
    }
    
    console.log(`✅ Gmail re-sync completed: ${processed} processed, ${updated} updated, ${errors} errors`)
    
    return NextResponse.json({
      success: true,
      message: `Gmail re-sync voltooid voor ${channel.name}`,
      channelId,
      channelName: channel.name,
      result: {
        processed,
        updated,
        errors,
        status: 'completed'
      },
      timestamp: new Date().toISOString()
    })
    
  } catch (error) {
    console.error('Gmail re-sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Re-sync failed' 
      },
      { status: 500 }
    )
  }
} 