import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailSettings {
  imap_host: string
  imap_port: number
  imap_username: string
  imap_password: string
  imap_encryption: 'none' | 'ssl' | 'tls'
}

interface EmailMessage {
  messageId: string
  from: {
    email: string
    name?: string
  }
  to: Array<{
    email: string
    name?: string
  }>
  cc?: Array<{
    email: string
    name?: string
  }>
  subject: string
  text?: string
  html?: string
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    content?: string
  }>
  headers?: Record<string, string>
  inReplyTo?: string
  references?: string[]
  receivedAt: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get email channel settings
    const { data: emailChannel, error: channelError } = await supabaseClient
      .from('channels')
      .select('id, settings')
      .eq('type', 'email')
      .eq('is_active', true)
      .single()

    if (channelError || !emailChannel) {
      throw new Error('No active email channel found')
    }

    const settings = emailChannel.settings as EmailSettings
    if (!settings.imap_host || !settings.imap_username || !settings.imap_password) {
      throw new Error('Email channel not properly configured')
    }

    // Get last processed message ID to avoid duplicates
    const { data: lastLog } = await supabaseClient
      .from('system_logs')
      .select('metadata')
      .eq('message', 'email_fetch_completed')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const lastMessageId = lastLog?.metadata?.lastMessageId

    // In a real implementation, you would:
    // 1. Connect to IMAP server using settings
    // 2. Fetch new messages since lastMessageId
    // 3. Parse each message
    // 4. Send to webhook endpoint

    // For now, let's simulate the process
    const mockEmails: EmailMessage[] = [
      {
        messageId: `${Date.now()}-mock@example.com`,
        from: {
          email: 'customer@example.com',
          name: 'Test Customer'
        },
        to: [{
          email: settings.imap_username,
          name: 'Support'
        }],
        subject: 'Help with my order',
        text: 'I need help with my recent order. Can someone assist me?',
        html: '<p>I need help with my recent order. Can someone assist me?</p>',
        receivedAt: new Date().toISOString()
      }
    ]

    // Get webhook URL from environment or use local development URL
    const webhookUrl = Deno.env.get('EMAIL_WEBHOOK_URL') || 'http://localhost:3001/webhooks/email'
    
    // Process each email
    const results = []
    for (const email of mockEmails) {
      try {
        // Send to webhook
        const webhookResponse = await fetch(webhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-signature': generateWebhookSignature(email),
          },
          body: JSON.stringify(email),
        })

        const result = await webhookResponse.json()
        results.push({
          messageId: email.messageId,
          success: result.success,
          ticketId: result.data?.ticketId,
          error: result.error
        })

      } catch (error) {
        console.error('Failed to process email:', error)
        results.push({
          messageId: email.messageId,
          success: false,
          error: error.message
        })
      }
    }

    // Log completion
    await supabaseClient.from('system_logs').insert({
      level: 'info',
      message: 'email_fetch_completed',
      metadata: {
        processedCount: results.length,
        successCount: results.filter(r => r.success).length,
        lastMessageId: mockEmails[mockEmails.length - 1]?.messageId,
        results
      }
    })

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Email parser error:', error)
    
    // Log error
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    await supabaseClient.from('system_logs').insert({
      level: 'error',
      message: 'email_fetch_failed',
      metadata: {
        error: error.message,
        stack: error.stack
      }
    })

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

function generateWebhookSignature(payload: any): string {
  // In production, use HMAC with webhook secret
  const secret = Deno.env.get('EMAIL_WEBHOOK_SECRET') || 'dev-secret'
  // Simple signature for development
  return 'dev-signature'
} 