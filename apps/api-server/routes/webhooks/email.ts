import express from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { SimpleSpamDetector } from '../../src/services/spam/simple-spam-detector';

const router = express.Router();

// Enhanced email payload schema with better validation
const EmailWebhookSchema = z
  .object({
    // Core email fields
    subject: z.string().min(1, 'Subject is required'),
    from: z.object({
      email: z.string().email('Valid email required'),
      name: z.string().optional(),
    }),
    to: z
      .array(
        z.object({
          email: z.string().email(),
          name: z.string().optional(),
        })
      )
      .min(1, 'At least one recipient required'),

    // Content fields - at least one must be present
    text: z.string().optional(),
    html: z.string().optional(),

    // Optional fields
    cc: z
      .array(
        z.object({
          email: z.string().email(),
          name: z.string().optional(),
        })
      )
      .optional(),
    bcc: z
      .array(
        z.object({
          email: z.string().email(),
          name: z.string().optional(),
        })
      )
      .optional(),

    // Metadata
    messageId: z.string().optional(),
    inReplyTo: z.string().optional(),
    references: z.string().optional(),
    date: z.string().optional(),
    headers: z.record(z.string()).optional(),
    attachments: z
      .array(
        z.object({
          filename: z.string(),
          contentType: z.string(),
          size: z.number(),
          content: z.string().optional(), // base64 encoded
        })
      )
      .optional(),
  })
  .refine((data) => data.text || data.html, {
    message: 'Either text or html content must be provided',
  });

type EmailPayload = z.infer<typeof EmailWebhookSchema>;

/**
 * Extract and clean email content for display
 */
function processEmailContent(payload: EmailPayload): {
  content: string;
  contentType: string;
  cleanedText: string;
} {
  const hasHtml = payload.html && payload.html.trim().length > 0;
  const hasText = payload.text && payload.text.trim().length > 0;

  if (hasHtml) {
    // Use HTML as primary content, create cleaned text version
    const cleanedText = cleanEmailContent(payload.html!, true);
    return {
      content: payload.html!,
      contentType: 'text/html',
      cleanedText: cleanedText,
    };
  } else if (hasText) {
    // Use text as primary content
    const cleanedText = cleanEmailContent(payload.text!, false);
    return {
      content: cleanedText,
      contentType: 'text/plain',
      cleanedText: cleanedText,
    };
  } else {
    // Fallback - should not happen due to schema validation
    return {
      content: 'No content available',
      contentType: 'text/plain',
      cleanedText: 'No content available',
    };
  }
}

/**
 * Clean email content while preserving structure
 */
function cleanEmailContent(content: string, isHtml: boolean): string {
  if (!content || content.trim().length === 0) return '';

  let cleaned = content;

  if (isHtml) {
    // For HTML: convert to text while preserving structure
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]*>/g, '') // Remove all HTML tags
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove quoted replies (common patterns)
  const quotePatterns = [
    /\n\s*Op\s+.+?\s+schreef\s+.+?:/i, // Dutch
    /\n\s*On\s+.+?\s+wrote:/i, // English
    /\n\s*Van:\s*.+/i, // Dutch "From:"
    /\n\s*From:\s*.+/i, // English "From:"
    /\n\s*-----+.*?-----+/i, // Separator lines
  ];

  for (const pattern of quotePatterns) {
    const match = cleaned.match(pattern);
    if (match && match.index) {
      cleaned = cleaned.substring(0, match.index).trim();
      break;
    }
  }

  // Clean up excessive whitespace
  cleaned = cleaned
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces
    .replace(/\n[ \t]+/g, '\n') // Remove leading spaces
    .trim();

  return cleaned;
}

/**
 * Find or create customer based on email
 */
async function findOrCreateCustomer(supabase: any, email: string, name?: string) {
  console.log(`[Customer] Looking for customer with email: ${email}`);

  // Try to find existing customer
  const { data: existingCustomer, error: findError } = await supabase
    .from('customers')
    .select('*')
    .eq('email', email)
    .single();

  if (findError && findError.code !== 'PGRST116') {
    console.error('[Customer] Error finding customer:', findError);
    throw new Error(`Database error: ${findError.message}`);
  }

  if (existingCustomer) {
    console.log(`[Customer] Found existing customer: ${existingCustomer.id}`);
    return existingCustomer;
  }

  // Create new customer
  console.log(`[Customer] Creating new customer for: ${email}`);
  const { data: newCustomer, error: createError } = await supabase
    .from('customers')
    .insert({
      email: email,
      name: name || null,
      external_id: email, // Use email as external_id for email customers
    })
    .select()
    .single();

  if (createError) {
    console.error('[Customer] Error creating customer:', createError);
    throw new Error(`Failed to create customer: ${createError.message}`);
  }

  console.log(`[Customer] Created new customer: ${newCustomer.id}`);
  return newCustomer;
}

/**
 * Find existing ticket or create new one
 */
async function findOrCreateTicket(
  supabase: any,
  payload: EmailPayload,
  customer: any,
  processedContent: any
) {
  const subject = payload.subject.trim();
  console.log(`[Ticket] Processing ticket for subject: ${subject}`);

  // Check if this is a reply (has inReplyTo or references)
  if (payload.inReplyTo || payload.references) {
    console.log('[Ticket] This appears to be a reply, looking for existing ticket');

    // Try to find existing ticket by message references
    const { data: existingTicket, error: findError } = await supabase
      .from('tickets')
      .select('*, conversations!inner(*)')
      .eq('customer_id', customer.id)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!findError && existingTicket) {
      console.log(`[Ticket] Found existing open ticket: #${existingTicket.number}`);
      return existingTicket;
    }
  }

  // Check for spam before creating ticket
  const isSpam = simpleSpamDetector(processedContent.cleanedText, payload.from.email);
  if (isSpam) {
    console.log('[Spam] Email detected as spam, marking accordingly');
  }

  // Create new ticket
  console.log('[Ticket] Creating new ticket');
  const { data: newTicket, error: createError } = await supabase
    .from('tickets')
    .insert({
      subject: subject,
      customer_id: customer.id,
      status: 'new',
      priority: 'normal',
      is_spam: isSpam,
      version: 1,
    })
    .select()
    .single();

  if (createError) {
    console.error('[Ticket] Error creating ticket:', createError);
    throw new Error(`Failed to create ticket: ${createError.message}`);
  }

  console.log(`[Ticket] Created new ticket: #${newTicket.number} (${newTicket.id})`);
  return newTicket;
}

/**
 * Create or find conversation for ticket
 */
async function findOrCreateConversation(supabase: any, ticket: any) {
  console.log(`[Conversation] Looking for conversation for ticket: ${ticket.id}`);

  // Try to find existing conversation
  const { data: existingConversation, error: findError } = await supabase
    .from('conversations')
    .select('*')
    .eq('ticket_id', ticket.id)
    .single();

  if (!findError && existingConversation) {
    console.log(`[Conversation] Found existing conversation: ${existingConversation.id}`);
    return existingConversation;
  }

  // Create new conversation
  console.log('[Conversation] Creating new conversation');
  const { data: newConversation, error: createError } = await supabase
    .from('conversations')
    .insert({
      ticket_id: ticket.id,
      channel: 'email',
      external_id: `email-${ticket.id}`,
      metadata: {
        channel_type: 'email',
        created_via: 'webhook',
      },
    })
    .select()
    .single();

  if (createError) {
    console.error('[Conversation] Error creating conversation:', createError);
    throw new Error(`Failed to create conversation: ${createError.message}`);
  }

  console.log(`[Conversation] Created new conversation: ${newConversation.id}`);
  return newConversation;
}

/**
 * Create message in conversation
 */
async function createMessage(
  supabase: any,
  conversation: any,
  payload: EmailPayload,
  processedContent: any
) {
  console.log(`[Message] Creating message for conversation: ${conversation.id}`);

  const messageData = {
    conversation_id: conversation.id,
    content: processedContent.content,
    content_type: processedContent.contentType,
    sender_type: 'customer',
    sender_id: payload.from.email,
    is_internal: false,
    metadata: {
      from: payload.from,
      to: payload.to,
      cc: payload.cc || [],
      bcc: payload.bcc || [],
      subject: payload.subject,
      messageId: payload.messageId,
      inReplyTo: payload.inReplyTo,
      references: payload.references,
      headers: payload.headers || {},
      originalHtml: payload.html, // Store original HTML for fallback
      cleanedText: processedContent.cleanedText,
      hasAttachments: (payload.attachments?.length || 0) > 0,
    },
  };

  const { data: message, error: createError } = await supabase
    .from('messages')
    .insert(messageData)
    .select()
    .single();

  if (createError) {
    console.error('[Message] Error creating message:', createError);
    throw new Error(`Failed to create message: ${createError.message}`);
  }

  console.log(
    `[Message] Created message: ${message.id} (${processedContent.content.length} chars)`
  );
  return message;
}

/**
 * Main email webhook handler
 */
router.post('/email', async (req, res) => {
  const startTime = Date.now();
  console.log('\n🔄 EMAIL WEBHOOK TRIGGERED - Enhanced Version');
  console.log('Timestamp:', new Date().toISOString());

  try {
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Log incoming webhook for debugging
    await supabase.from('webhook_logs').insert({
      channel: 'email',
      payload: req.body,
      headers: req.headers,
      processed: false,
    });

    // Validate payload
    console.log('[Validation] Validating email payload...');
    const payload = EmailWebhookSchema.parse(req.body);
    console.log(`[Validation] ✅ Valid payload from: ${payload.from.email}`);
    console.log(`[Validation] Subject: ${payload.subject}`);
    console.log(`[Validation] Has HTML: ${!!payload.html}`);
    console.log(`[Validation] Has Text: ${!!payload.text}`);

    // Process email content
    console.log('[Content] Processing email content...');
    const processedContent = processEmailContent(payload);
    console.log(`[Content] ✅ Content processed (${processedContent.contentType})`);
    console.log(`[Content] Content length: ${processedContent.content.length} chars`);
    console.log(`[Content] Cleaned text length: ${processedContent.cleanedText.length} chars`);

    // Find or create customer
    const customer = await findOrCreateCustomer(supabase, payload.from.email, payload.from.name);

    // Find or create ticket
    const ticket = await findOrCreateTicket(supabase, payload, customer, processedContent);

    // Find or create conversation
    const conversation = await findOrCreateConversation(supabase, ticket);

    // Create message
    const message = await createMessage(supabase, conversation, payload, processedContent);

    // Update webhook log as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('channel', 'email')
      .eq('created_at', new Date().toISOString().split('T')[0]); // Today's logs

    const processingTime = Date.now() - startTime;
    console.log(`\n✅ EMAIL PROCESSED SUCCESSFULLY`);
    console.log(`Processing time: ${processingTime}ms`);
    console.log(`Ticket: #${ticket.number}`);
    console.log(`Customer: ${customer.email}`);
    console.log(`Message: ${message.id}`);

    res.status(200).json({
      success: true,
      data: {
        ticketNumber: ticket.number,
        ticketId: ticket.id,
        customerId: customer.id,
        conversationId: conversation.id,
        messageId: message.id,
        processingTime: processingTime,
      },
    });
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error('\n❌ EMAIL WEBHOOK ERROR');
    console.error('Processing time:', processingTime + 'ms');
    console.error('Error:', error);

    // Log error but don't crash
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', error.errors);
      res.status(400).json({
        success: false,
        error: 'Invalid payload',
        details: error.errors,
      });
    } else {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
});

export default router;
