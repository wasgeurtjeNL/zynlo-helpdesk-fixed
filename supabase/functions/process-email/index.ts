import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailPayload {
  from: {
    email: string
    name?: string
  }
  to: string
  subject: string
  text?: string
  html?: string
  messageId: string
  inReplyTo?: string
  references?: string[]
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    url?: string
  }>
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse the email payload
    const payload: EmailPayload = await req.json()
    
    // Log the webhook for debugging
    await supabase.from('webhook_logs').insert({
      channel: 'email',
      payload,
      headers: Object.fromEntries(req.headers.entries()),
      processed: false
    })

    // Find the channel this email was sent to
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('type', 'email')
      .eq('email_address', payload.to)
      .eq('is_active', true)
      .single()

    if (!channel) {
      throw new Error(`No active email channel found for address: ${payload.to}`)
    }

    // Check if this is a reply to an existing ticket
    let ticketId = null
    if (payload.inReplyTo || payload.references?.length) {
      // Try to find existing conversation by message ID references
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('conversation_id, conversations(ticket_id)')
        .or(`metadata->>'messageId'.eq.${payload.inReplyTo},metadata->>'messageId'.in.(${payload.references?.join(',') || ''})`)
        .limit(1)
        .single()

      if (existingMessage?.conversations?.ticket_id) {
        ticketId = existingMessage.conversations.ticket_id
      }
    }

    // Extract ticket number from subject (e.g., "Re: [Ticket #123] Original subject")
    if (!ticketId && payload.subject) {
      const ticketMatch = payload.subject.match(/\[Ticket #(\d+)\]/i)
      if (ticketMatch) {
        const ticketNumber = parseInt(ticketMatch[1])
        const { data: ticket } = await supabase
          .from('tickets')
          .select('id')
          .eq('number', ticketNumber)
          .single()
        
        if (ticket) {
          ticketId = ticket.id
        }
      }
    }

    // Find or create customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', payload.from.email)
      .single()

    let customerId = customer?.id
    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          email: payload.from.email,
          name: payload.from.name || payload.from.email.split('@')[0]
        })
        .select('id')
        .single()
      
      customerId = newCustomer?.id
    }

    // If this is a new ticket, create it
    if (!ticketId) {
      // Create ticket directly instead of using stored procedure
      const { data: newTicket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          subject: payload.subject,
          customer_id: customerId,
          status: 'new',
          priority: 'normal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (ticketError) {
        console.error('Error creating ticket:', ticketError)
        throw new Error(`Failed to create ticket: ${ticketError.message}`)
      }

      ticketId = newTicket.id

      // Create conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          ticket_id: ticketId,
          channel: 'email',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()

      if (convError) {
        console.error('Error creating conversation:', convError)
        throw new Error(`Failed to create conversation: ${convError.message}`)
      }

      // Create initial message
      const { error: messageError } = await supabase
        .from('messages')
        .insert({
          conversation_id: newConversation.id,
          content: payload.html || payload.text || '',  // Prefer HTML over text
          content_type: payload.html ? 'text/html' : 'text/plain',  // Set content type
          sender_type: 'customer',
          sender_id: payload.from.email,
          metadata: {
            messageId: payload.messageId,
            email: true,
            originalHtml: payload.html,
            originalText: payload.text  // Also store original text
          },
          attachments: payload.attachments || [],
          created_at: new Date().toISOString()
        })

      if (messageError) {
        console.error('Error creating message:', messageError)
        throw new Error(`Failed to create message: ${messageError.message}`)
      }
    } else {
      // Add message to existing ticket
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticketId)
        .single()

      if (conversation) {
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          content: payload.html || payload.text || '',  // Prefer HTML over text
          content_type: payload.html ? 'text/html' : 'text/plain',  // Set content type
          sender_type: 'customer',
          sender_id: payload.from.email,
          sender_name: payload.from.name,
          metadata: {
            messageId: payload.messageId,
            email: true,
            originalHtml: payload.html,
            originalText: payload.text  // Also store original text
          },
          attachments: payload.attachments || []
        })

        // Update ticket status if it was closed
        await supabase
          .from('tickets')
          .update({ 
            status: 'open',
            updated_at: new Date().toISOString()
          })
          .eq('id', ticketId)
          .in('status', ['closed', 'resolved'])
      }
    }

    // Update channel last sync time
    await supabase
      .from('channels')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', channel.id)

    // Mark webhook as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('payload->messageId', payload.messageId)

    return new Response(
      JSON.stringify({ 
        success: true, 
        ticketId,
        message: 'Email processed successfully' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error processing email:', error)
    
    // Log the error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    await supabase.from('webhook_logs').insert({
      channel: 'email',
      payload: await req.text(),
      error: error.message,
      processed: false
    })

    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 