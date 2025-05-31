import { Router, Request, Response } from 'express'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const router = Router()

// Initialize Supabase client
// Use NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as these are likely in .env.local
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
)

interface WhatsAppMessage {
  messaging_product: string
  metadata: {
    display_phone_number: string
    phone_number_id: string
  }
  contacts?: Array<{
    profile: {
      name: string
    }
    wa_id: string
  }>
  messages?: Array<{
    id: string
    from: string
    timestamp: string
    type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location'
    text?: {
      body: string
    }
    image?: {
      id: string
      mime_type: string
      sha256: string
    }
    document?: {
      id: string
      mime_type: string
      sha256: string
      filename: string
    }
    audio?: {
      id: string
      mime_type: string
      sha256: string
    }
    video?: {
      id: string
      mime_type: string
      sha256: string
    }
    location?: {
      latitude: number
      longitude: number
      name?: string
      address?: string
    }
  }>
  statuses?: Array<{
    id: string
    status: 'sent' | 'delivered' | 'read' | 'failed'
    timestamp: string
    recipient_id: string
  }>
}

// Webhook verification (GET request from WhatsApp)
router.get('/:project_id', async (req: Request, res: Response) => {
  const projectId = req.params.project_id
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']

  try {
    // Fetch the verify token from channel settings
    const { data: channel } = await supabase
      .from('channels')
      .select('settings')
      .eq('type', 'whatsapp')
      .single()

    const settings = channel?.settings as any
    
    if (mode === 'subscribe' && token === settings?.webhook_verify_token) {
      console.log('WhatsApp webhook verified successfully')
      res.status(200).send(challenge)
    } else {
      console.error('WhatsApp webhook verification failed')
      res.sendStatus(403)
    }
  } catch (error) {
    console.error('Error verifying WhatsApp webhook:', error)
    res.sendStatus(403)
  }
})

// Process incoming WhatsApp messages (POST request)
router.post('/:project_id', async (req: Request, res: Response) => {
  const projectId = req.params.project_id
  
  // Always respond 200 OK immediately to avoid WhatsApp retries
  res.sendStatus(200)
  
  try {
    // Log the webhook payload
    await supabase
      .from('webhook_logs')
      .insert({
        project_id: projectId,
        channel: 'whatsapp',
        payload: req.body,
        headers: req.headers,
        created_at: new Date().toISOString()
      })

    const { entry } = req.body
    if (!entry || !entry[0]?.changes) {
      console.log('No changes in WhatsApp webhook')
      return
    }

    for (const change of entry[0].changes) {
      if (change.field !== 'messages') continue
      
      const value = change.value as WhatsAppMessage
      
      // Process incoming messages
      if (value.messages && value.messages.length > 0) {
        for (const message of value.messages) {
          await processIncomingMessage(projectId, value, message)
        }
      }
      
      // Process status updates
      if (value.statuses && value.statuses.length > 0) {
        for (const status of value.statuses) {
          await processStatusUpdate(projectId, status)
        }
      }
    }
  } catch (error) {
    console.error('Error processing WhatsApp webhook:', error)
    // Don't throw - we already sent 200 OK
  }
})

async function processIncomingMessage(
  projectId: string,
  payload: WhatsAppMessage,
  message: NonNullable<WhatsAppMessage['messages']>[0]
) {
  try {
    const customerPhone = message.from
    const customerName = payload.contacts?.[0]?.profile?.name || `WhatsApp User (${customerPhone})`
    
    // Find or create customer
    let { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('phone', customerPhone)
      .eq('project_id', projectId)
      .single()
    
    if (!customer) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          project_id: projectId,
          name: customerName,
          phone: customerPhone,
          channel_type: 'whatsapp',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      customer = newCustomer
    }
    
    if (!customer) {
      throw new Error('Failed to find or create customer')
    }
    
    // Find existing conversation or create new one
    let { data: conversation } = await supabase
      .from('conversations')
      .select('id, ticket_id')
      .eq('project_id', projectId)
      .eq('channel', 'whatsapp')
      .eq('external_id', customerPhone)
      .single()
    
    if (!conversation) {
      // Create new ticket
      const { data: ticket } = await supabase
        .from('tickets')
        .insert({
          project_id: projectId,
          subject: `WhatsApp: ${customerName}`,
          status: 'new',
          priority: 'normal',
          customer_id: customer.id,
          channel: 'whatsapp',
          created_at: new Date().toISOString()
        })
        .select('id')
        .single()
      
      if (!ticket) {
        throw new Error('Failed to create ticket')
      }
      
      // Create conversation
      const { data: newConversation } = await supabase
        .from('conversations')
        .insert({
          project_id: projectId,
          ticket_id: ticket.id,
          channel: 'whatsapp',
          external_id: customerPhone,
          metadata: {
            phone_number_id: payload.metadata.phone_number_id,
            display_phone_number: payload.metadata.display_phone_number
          },
          created_at: new Date().toISOString()
        })
        .select('id, ticket_id')
        .single()
      
      conversation = newConversation
    }
    
    if (!conversation) {
      throw new Error('Failed to find or create conversation')
    }
    
    // Prepare message content based on message type
    let content = ''
    let attachments = []
    
    switch (message.type) {
      case 'text':
        content = message.text?.body || ''
        break
      case 'image':
        content = '[Afbeelding ontvangen]'
        if (message.image) {
          attachments.push({
            type: 'image',
            id: message.image.id,
            mime_type: message.image.mime_type
          })
        }
        break
      case 'document':
        content = `[Document ontvangen: ${message.document?.filename || 'document'}]`
        if (message.document) {
          attachments.push({
            type: 'document',
            id: message.document.id,
            mime_type: message.document.mime_type,
            filename: message.document.filename
          })
        }
        break
      case 'audio':
        content = '[Audio bericht ontvangen]'
        if (message.audio) {
          attachments.push({
            type: 'audio',
            id: message.audio.id,
            mime_type: message.audio.mime_type
          })
        }
        break
      case 'video':
        content = '[Video ontvangen]'
        if (message.video) {
          attachments.push({
            type: 'video',
            id: message.video.id,
            mime_type: message.video.mime_type
          })
        }
        break
      case 'location':
        if (message.location) {
          content = `[Locatie gedeeld: ${message.location.name || 'Unnamed location'} - ${message.location.address || `${message.location.latitude}, ${message.location.longitude}`}]`
          attachments.push({
            type: 'location',
            data: message.location
          })
        }
        break
    }
    
    // Create message
    await supabase
      .from('messages')
      .insert({
        project_id: projectId,
        conversation_id: conversation.id,
        content,
        sender_type: 'customer',
        sender_id: customer.id.toString(),
        external_id: message.id,
        attachments: attachments.length > 0 ? attachments : null,
        created_at: new Date(parseInt(message.timestamp) * 1000).toISOString()
      })
    
    // Update ticket status if it's new
    await supabase
      .from('tickets')
      .update({
        status: 'open',
        updated_at: new Date().toISOString()
      })
      .eq('id', conversation.ticket_id)
      .eq('status', 'new')
    
    // Create a notification for agents
    await supabase
      .from('notifications')
      .insert({
        project_id: projectId,
        type: 'new_message',
        title: 'Nieuw WhatsApp bericht',
        message: `${customerName}: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}`,
        data: {
          ticket_id: conversation.ticket_id,
          conversation_id: conversation.id,
          channel: 'whatsapp'
        },
        created_at: new Date().toISOString()
      })
    
    console.log(`Processed WhatsApp message from ${customerPhone}`)
  } catch (error) {
    console.error('Error processing WhatsApp message:', error)
    throw error
  }
}

async function processStatusUpdate(
  projectId: string,
  status: NonNullable<WhatsAppMessage['statuses']>[0]
) {
  try {
    // Update message status in database
    await supabase
      .from('messages')
      .update({
        metadata: {
          whatsapp_status: status.status,
          status_timestamp: status.timestamp
        }
      })
      .eq('external_id', status.id)
      .eq('project_id', projectId)
    
    console.log(`Updated WhatsApp message status: ${status.id} -> ${status.status}`)
  } catch (error) {
    console.error('Error processing WhatsApp status update:', error)
  }
}

export default router 