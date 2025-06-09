import { google } from 'googleapis'
import { supabase, supabaseConfig } from '../utils/supabase'
import axios from 'axios'
import { spamDetector } from '../src/services/spam/simple-spam-detector'

interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: Array<{ name: string; value: string }>
    body?: { data?: string }
    parts?: Array<{
      mimeType: string
      body: { data?: string; attachmentId?: string }
      filename?: string
    }>
  }
  internalDate: string
}

export class GmailSyncService {
  private oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    `${process.env.API_URL}/auth/gmail/callback`
  )

  async syncChannel(channelId: string) {
    try {
      // Check if OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn(`⚠️ Gmail sync skipped for channel ${channelId}: Google OAuth credentials not configured`)
        return { processed: 0, errors: 0, updated: 0 }
      }

      // Log debug info
      console.log('[Gmail Sync] Starting sync for channel:', channelId)
      console.log('[Gmail Sync] Supabase config:', {
        hasCredentials: supabaseConfig.hasCredentials,
        urlExists: !!supabaseConfig.url,
        keyLength: supabaseConfig.serviceKey.length
      })

      // Get channel from database
      const { data: channel, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .eq('type', 'email')
        .eq('provider', 'gmail')
        .single()

      if (error || !channel) {
        throw new Error('Channel not found')
      }

      // Set up OAuth client
      this.oauth2Client.setCredentials({
        access_token: channel.settings.oauth_token,
        refresh_token: channel.settings.refresh_token
      })

      // Initialize Gmail API
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })

      // Get messages from the last sync or last 24 hours
      const after = channel.last_sync 
        ? new Date(channel.last_sync).getTime() / 1000
        : Date.now() / 1000 - 86400 // 24 hours ago

      // Search for messages
      const query = `after:${Math.floor(after)} -from:me`
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      })

      const messages = response.data.messages || []
      console.log(`Found ${messages.length} new messages for channel ${channelId}`)

      // Process each message
      for (const message of messages) {
        await this.processMessage(gmail, message.id!, channel)
      }

      // Update last sync time
      await supabase
        .from('channels')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', channelId)

      return { processed: messages.length }
    } catch (error) {
      console.error(`Error syncing channel ${channelId}:`, error)
      throw error
    }
  }

  private async processMessage(gmail: any, messageId: string, channel: any) {
    try {
      // Get full message
      const response = await gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full'
      })

      const message: GmailMessage = response.data

      // Extract email data
      const headers = message.payload.headers || []
      const from = this.getHeader(headers, 'From')
      const subject = this.getHeader(headers, 'Subject')
      const messageIdHeader = this.getHeader(headers, 'Message-ID')
      const inReplyTo = this.getHeader(headers, 'In-Reply-To')
      const references = this.getHeader(headers, 'References')

      // Parse from email
      const fromMatch = from?.match(/(.*?)<(.+?)>/) || [null, null, from]
      const fromName = fromMatch[1]?.trim().replace(/"/g, '')
      const fromEmail = fromMatch[2] || from

      // Get message body
      const { text, html } = this.extractBody(message.payload)

      // Check for spam before processing
      console.log(`[Gmail Sync] Checking message ${messageId} for spam...`)
      const spamCheck = await spamDetector.checkSpam({
        content: text || '',
        subject: subject || '',
        from: fromEmail || 'unknown@example.com',
        html: html
      })
      
      if (spamCheck.isSpam) {
        console.log(`[Gmail Sync] Message ${messageId} detected as SPAM (score: ${spamCheck.score})`)
      }

      // Get attachments
      const attachments = this.extractAttachments(message.payload)

      // Use the credentials from our config
      const webhookUrl = `${supabaseConfig.url}/functions/v1/process-email`
      
      console.log('[Gmail Sync] Sending to webhook:', {
        url: webhookUrl,
        hasServiceKey: !!supabaseConfig.serviceKey,
        serviceKeyLength: supabaseConfig.serviceKey.length
      })

      // Debug the actual service key value
      console.log('[Gmail Sync] Service key preview:', supabaseConfig.serviceKey.substring(0, 20) + '...')
      
      const requestHeaders = {
        'Authorization': `Bearer ${supabaseConfig.serviceKey}`,
        'Content-Type': 'application/json'
      }
      
      // Debug the headers
      console.log('[Gmail Sync] Headers being sent:', {
        hasAuth: !!requestHeaders.Authorization,
        authPreview: requestHeaders.Authorization.substring(0, 20) + '...'
      })
      
      await axios.post(webhookUrl, {
        from: {
          email: fromEmail,
          name: fromName
        },
        to: channel.email_address,
        subject,
        text,
        html,
        messageId: messageIdHeader,
        inReplyTo,
        references: references?.split(/\s+/),
        attachments,
        // Include spam detection results
        spamDetection: {
          isSpam: spamCheck.isSpam,
          score: spamCheck.score,
          report: spamCheck.report
        }
      }, { headers: requestHeaders })

      console.log(`Processed message ${messageId}: ${subject}${spamCheck.isSpam ? ' [SPAM]' : ''}`)
    } catch (error) {
      console.error(`Error processing message ${messageId}:`, error)
      throw error
    }
  }

  private getHeader(headers: Array<{ name: string; value: string }>, name: string): string | undefined {
    return headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value
  }

  private extractBody(payload: any): { text?: string; html?: string } {
    let text: string | undefined
    let html: string | undefined

    // Check direct body
    if (payload.body?.data) {
      const decoded = Buffer.from(payload.body.data, 'base64').toString('utf-8')
      if (payload.mimeType === 'text/plain') {
        text = decoded
      } else if (payload.mimeType === 'text/html') {
        html = decoded
      }
    }

    // Check parts
    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          text = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          html = Buffer.from(part.body.data, 'base64').toString('utf-8')
        } else if (part.mimeType.startsWith('multipart/') && part.parts) {
          // Recursive check for nested parts
          const nested = this.extractBody(part)
          text = text || nested.text
          html = html || nested.html
        }
      }
    }

    return { text, html }
  }

  private extractAttachments(payload: any): Array<any> {
    const attachments: Array<any> = []

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.filename && part.body?.attachmentId) {
          attachments.push({
            filename: part.filename,
            contentType: part.mimeType,
            size: part.body.size || 0,
            attachmentId: part.body.attachmentId
          })
        }
      }
    }

    return attachments
  }

  // Run sync for all active Gmail channels
  async syncAllChannels() {
    try {
      // Check if OAuth credentials are configured
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        console.warn('⚠️ Gmail sync disabled: Google OAuth credentials not configured')
        return []
      }

      // Get all active Gmail channels
      const { data: channels, error } = await supabase
        .from('channels')
        .select('id')
        .eq('type', 'email')
        .eq('provider', 'gmail')
        .eq('is_active', true)

      if (error) {
        throw error
      }

      console.log(`Starting sync for ${channels?.length || 0} Gmail channels`)

      // Sync each channel
      const results = await Promise.allSettled(
        (channels || []).map(channel => this.syncChannel(channel.id))
      )

      // Log results
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          console.log(`Channel ${channels![index].id} synced: ${result.value.processed} messages`)
        } else {
          console.error(`Channel ${channels![index].id} sync failed:`, result.reason)
        }
      })

      return results
    } catch (error) {
      console.error('Error syncing Gmail channels:', error)
      throw error
    }
  }
}

// Create singleton instance
export const gmailSync = new GmailSyncService() 