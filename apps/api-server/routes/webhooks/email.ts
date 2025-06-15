import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import crypto from 'crypto';
import { threadReconstructor } from '../../src/services/email/thread-reconstructor';
import { attachmentHandler } from '../../src/services/email/attachment-handler';
import { spamDetector } from '../../src/services/spam/simple-spam-detector';

const router = Router();

// Initialize Supabase client
// Use NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY as these are likely in .env.local
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
);

// Email webhook payload schema
const EmailWebhookSchema = z.object({
  messageId: z.string(),
  from: z.object({
    email: z.string().email(),
    name: z.string().optional(),
  }),
  to: z.array(
    z.object({
      email: z.string().email(),
      name: z.string().optional(),
    })
  ),
  cc: z
    .array(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .optional(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z
    .array(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
        url: z.string().optional(),
        content: z.string().optional(),
      })
    )
    .optional(),
  headers: z.record(z.string()).optional(),
  inReplyTo: z.string().optional(),
  references: z.array(z.string()).optional(),
  receivedAt: z.string().datetime().optional(),
});

type EmailWebhookPayload = z.infer<typeof EmailWebhookSchema>;

// Helper function to find or create customer
async function findOrCreateCustomer(email: string, name?: string) {
  // Check if customer exists
  const { data: existingCustomer } = await supabase
    .from('customers')
    .select('id')
    .eq('email', email)
    .single();

  if (existingCustomer) {
    return existingCustomer.id;
  }

  // Create new customer
  const { data: newCustomer, error } = await supabase
    .from('customers')
    .insert({
      email,
      name: name || email.split('@')[0],
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to create customer: ${error.message}`);
  }

  return newCustomer.id;
}

// Helper function to find email channel
async function findEmailChannel() {
  const { data: channel, error } = await supabase
    .from('channels')
    .select('id')
    .eq('type', 'email')
    .eq('is_active', true)
    .single();

  if (error || !channel) {
    throw new Error('No active email channel found');
  }

  return channel.id;
}

// Process email webhook
router.post('/email', async (req: Request, res: Response) => {
  console.log('Email webhook received:', req.body);
  console.log('📧 Email content details:', {
    hasText: !!req.body.text,
    textLength: req.body.text?.length,
    textPreview: req.body.text?.substring(0, 100),
    hasHtml: !!req.body.html,
    htmlLength: req.body.html?.length,
    subject: req.body.subject,
    from: req.body.from,
  });

  try {
    // Log the webhook receipt
    await supabase.from('webhook_logs').insert({
      channel_type: 'email',
      payload: req.body,
      headers: req.headers as any,
    });

    // Validate webhook signature if configured
    const webhookSecret = process.env.EMAIL_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = req.headers['x-webhook-signature'] as string;
      if (!signature) {
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(req.body))
        .digest('hex');

      if (signature !== expectedSignature) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    }

    // Validate payload
    const payload = EmailWebhookSchema.parse(req.body);

    // Check for spam FIRST before creating anything
    console.log('Checking email for spam...');
    const spamCheck = await spamDetector.checkSpam({
      content: payload.text || '',
      subject: payload.subject,
      from: payload.from.email,
      html: payload.html,
    });

    console.log('Spam check result:', spamCheck);

    // Find or create customer
    const customerId = await findOrCreateCustomer(payload.from.email, payload.from.name);

    // Find email channel
    const channelId = await findEmailChannel();

    // Use thread reconstruction to find existing thread
    const existingThread = await threadReconstructor.findExistingThread(
      payload.messageId,
      payload.inReplyTo,
      payload.references,
      payload.subject,
      payload.from.email
    );

    let conversationId: string;
    let ticketRecord: any;

    if (!existingThread) {
      // Create new ticket - mark as spam if detected
      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          subject: payload.subject,
          status: spamCheck.isSpam ? 'closed' : 'new',
          priority: spamCheck.isSpam ? 'low' : 'normal',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          is_spam: spamCheck.isSpam,
          marked_as_spam_at: spamCheck.isSpam ? new Date().toISOString() : null,
          closed_at: spamCheck.isSpam ? new Date().toISOString() : null,
        })
        .select()
        .single();

      if (ticketError) {
        throw new Error(`Failed to create ticket: ${ticketError.message}`);
      }

      console.log(
        `Created ${spamCheck.isSpam ? 'SPAM' : 'new'} ticket #${ticket.number} with ID ${ticket.id}`
      );

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          ticket_id: ticket.id,
          channel: 'email',
          customer_id: customerId,
          metadata: {
            emailThreadId: payload.messageId,
            references: payload.references || [],
          },
        })
        .select()
        .single();

      if (convError) {
        throw new Error(`Failed to create conversation: ${convError.message}`);
      }

      conversationId = conversation.id;
      ticketRecord = ticket;
    } else {
      // Existing thread found
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id, ticket_id')
        .eq('ticket_id', existingThread.ticketId)
        .single();

      if (!conversation) {
        throw new Error('Conversation not found for existing thread');
      }

      conversationId = conversation.id;

      // Get ticket details
      const { data: ticket } = await supabase
        .from('tickets')
        .select('*')
        .eq('id', existingThread.ticketId)
        .single();

      ticketRecord = ticket;

      // Reopen ticket if it was closed (unless it's spam)
      if (ticket?.status === 'closed' && !ticket?.is_spam) {
        await supabase
          .from('tickets')
          .update({
            status: 'open',
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingThread.ticketId);
      }
    }

    // Create message
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        content: payload.html || payload.text || '',
        content_type: payload.html ? 'html' : 'text',
        sender_type: 'customer',
        sender_id: customerId,
        metadata: {
          messageId: payload.messageId,
          from: payload.from,
          to: payload.to,
          cc: payload.cc,
          subject: payload.subject,
          headers: payload.headers,
          inReplyTo: payload.inReplyTo,
          references: payload.references,
          originalText: payload.text,
          originalHtml: payload.html,
        },
        // Don't include attachments here yet, they'll be processed separately
        attachments: [],
      })
      .select()
      .single();

    if (messageError) {
      throw new Error(`Failed to create message: ${messageError.message}`);
    }

    // Log spam detection result
    await spamDetector.logDetection({
      ticketId: ticketRecord.id,
      messageId: message.id,
      emailFrom: payload.from.email,
      subject: payload.subject,
      spamScore: spamCheck.score,
      isSpam: spamCheck.isSpam,
      report: spamCheck.report,
    });

    // Process attachments with the attachment handler
    if (payload.attachments && payload.attachments.length > 0) {
      // Convert webhook attachments to EmailMessage format
      const emailMessage = {
        uid: 0, // Not used for webhook processing
        messageId: payload.messageId,
        date: new Date(payload.receivedAt || new Date().toISOString()),
        from: [{ address: payload.from.email, name: payload.from.name }],
        to: payload.to.map((t) => ({ address: t.email, name: t.name })),
        cc: payload.cc?.map((c) => ({ address: c.email, name: c.name })),
        subject: payload.subject,
        text: payload.text,
        html: payload.html,
        attachments: payload.attachments.map((att) => ({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          content: att.content ? Buffer.from(att.content, 'base64') : undefined,
        })),
        headers: new Map(Object.entries(payload.headers || {})),
      };

      try {
        const uploadedAttachments = await attachmentHandler.processEmailAttachments(
          emailMessage as any,
          ticketRecord.id,
          message.id
        );

        console.log(`Uploaded ${uploadedAttachments.length} attachments for message ${message.id}`);
      } catch (error) {
        console.error('Failed to process attachments:', error);
        // Don't fail the webhook, just log the error
      }
    }

    // Send success response
    res.status(200).json({
      success: true,
      data: {
        ticketId: ticketRecord.id,
        ticketNumber: ticketRecord.number,
        conversationId,
        messageId: message.id,
        spamDetected: spamCheck.isSpam,
        spamScore: spamCheck.score,
      },
    });
    return;
  } catch (error) {
    console.error('Webhook error:', error);

    // Log error to webhook_logs
    await supabase.from('webhook_logs').insert({
      channel_type: 'email',
      payload: req.body,
      headers: req.headers as any,
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    // Always return 200 to prevent webhook retries
    res.status(200).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return;
  }
});

// Health check endpoint
router.get('/email/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
