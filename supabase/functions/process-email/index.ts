import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  from: {
    email: string;
    name?: string;
  };
  to: string;
  subject: string;
  text?: string;
  html?: string;
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  attachments?: Array<{
    filename: string;
    contentType: string;
    size: number;
    url?: string;
  }>;
}

// 🎯 NEW: Light HTML cleaning - preserves HTML structure but removes tracking and cleans up
function cleanHtmlContent(htmlContent: string): string {
  if (!htmlContent) return '';

  let cleaned = htmlContent;

  // Remove tracking URLs and pixels (common in newsletters/automated emails)
  cleaned = cleaned
    .replace(/https?:\/\/post\.eu\.spmailfeedback\.com[^\s"'>]*/gi, '') // Remove specific tracking
    .replace(/https?:\/\/[^\s"'>]*track[^\s"'>]*/gi, '') // Remove tracking URLs
    .replace(/https?:\/\/[^\s"'>]*pixel[^\s"'>]*/gi, '') // Remove tracking pixels
    .replace(/<img[^>]*src=["'][^"']*pixel[^"']*["'][^>]*>/gi, '') // Remove pixel images
    .replace(/<img[^>]*src=["'][^"']*track[^"']*["'][^>]*>/gi, '') // Remove tracking images
    .replace(/<img[^>]*width=["']1["'][^>]*height=["']1["'][^>]*>/gi, '') // Remove 1x1 tracking pixels
    .replace(/<img[^>]*height=["']1["'][^>]*width=["']1["'][^>]*>/gi, ''); // Remove 1x1 tracking pixels

  // Clean up excessive whitespace in HTML while preserving structure
  cleaned = cleaned
    .replace(/\s+/g, ' ') // Multiple spaces to single space
    .replace(/>\s+</g, '><') // Remove spaces between HTML tags
    .trim();

  // Remove empty elements that might be left over
  cleaned = cleaned
    .replace(/<p>\s*<\/p>/gi, '') // Empty paragraphs
    .replace(/<div>\s*<\/div>/gi, '') // Empty divs
    .replace(/<span>\s*<\/span>/gi, ''); // Empty spans

  return cleaned;
}

// 🎯 NEW: Clean and format email content while preserving readability
function cleanEmailContent(content: string, isHtml: boolean = false): string {
  if (!content) return '';

  let cleaned = content;

  // If HTML, convert to text but preserve structure better
  if (isHtml) {
    // Preserve line breaks and paragraph structure
    cleaned = cleaned
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<div[^>]*>/gi, '')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/tr>/gi, '\n')
      .replace(/<\/td>/gi, ' ')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }

  // Normalize line endings first
  cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Remove quoted replies (everything after common quote indicators)
  const quotePatterns = [
    /\n\s*Op\s+.+?\s+schreef\s+.+?:/i, // Dutch: "Op [date] schreef [person]:"
    /\n\s*On\s+.+?\s+wrote:/i, // English: "On [date] wrote:"
    /\n\s*Van:\s*.+/i, // Dutch: "Van: [person]"
    /\n\s*From:\s*.+/i, // English: "From: [person]"
    /\n\s*-----+.*?-----+/i, // Separator lines
    /\n\s*_{10,}/i, // Underscore separators
    /\n\s*-{10,}/i, // Dash separators
  ];

  for (const pattern of quotePatterns) {
    const match = cleaned.match(pattern);
    if (match) {
      cleaned = cleaned.substring(0, match.index || 0).trim();
      break;
    }
  }

  // Remove common email signatures and footers
  const signaturePatterns = [
    /\n\s*Met\s+vriendelijke\s+groet[,\s]*/i, // Dutch signature
    /\n\s*Best\s+regards[,\s]*/i, // English signature
    /\n\s*Kind\s+regards[,\s]*/i, // English signature
    /\n\s*Ticket\s+referentie:\s*#\d+/i, // Ticket reference
    /\n\s*Ticket\s+#\d+/i, // Ticket number
  ];

  for (const pattern of signaturePatterns) {
    cleaned = cleaned.replace(pattern, '');
  }

  // Handle quoted lines more carefully
  const lines = cleaned.split('\n');
  const cleanedLines = [];
  let consecutiveQuotes = 0;
  let skippingQuotes = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('>')) {
      consecutiveQuotes++;
      if (consecutiveQuotes <= 2 && !skippingQuotes) {
        // Keep first 2 lines of quoted content for context
        cleanedLines.push(`💬 ${trimmed.substring(1).trim()}`);
      } else if (consecutiveQuotes === 3) {
        cleanedLines.push('💬 ...');
        skippingQuotes = true;
      }
    } else {
      consecutiveQuotes = 0;
      skippingQuotes = false;
      // Keep all non-quoted lines, including empty ones for spacing
      cleanedLines.push(line);
    }
  }

  // Join with proper spacing
  cleaned = cleanedLines.join('\n');

  // Clean up excessive whitespace but preserve intentional spacing
  cleaned = cleaned
    .replace(/\n{4,}/g, '\n\n\n') // Max 3 consecutive newlines
    .replace(/[ \t]+\n/g, '\n') // Remove trailing spaces
    .replace(/\n[ \t]+/g, '\n') // Remove leading spaces on new lines
    .trim();

  // If cleaned content is too short compared to original, use gentler cleaning
  if (cleaned.length < 20 && content.length > 50) {
    console.log('[Content Cleaning] Cleaned content too short, using gentler approach');
    // Just do basic HTML cleanup without removing quotes
    cleaned = content
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/\r\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  return cleaned;
}

// 🎯 NEW: Extract the most relevant part of the email for preview
function extractEmailPreview(content: string, maxLength: number = 200): string {
  if (!content) return '';

  // Remove quoted content for preview
  const lines = content.split('\n');
  const previewLines = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('>') && !trimmed.startsWith('💬') && trimmed.length > 3) {
      previewLines.push(trimmed);
      if (previewLines.join(' ').length > maxLength) break;
    }
  }

  let preview = previewLines.join(' ').substring(0, maxLength);
  if (preview.length === maxLength) {
    preview += '...';
  }

  return preview || content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('🔄 Process Email Edge Function triggered - VERSION 17 WITH HTML PRESERVATION');

    // Parse the email payload
    const payload: EmailPayload = await req.json();

    // Log the webhook for debugging
    await supabase.from('webhook_logs').insert({
      channel: 'email',
      payload,
      headers: Object.fromEntries(req.headers.entries()),
      processed: false,
    });

    // 🎯 NEW: Enhanced content processing with HTML preservation
    const isHtmlContent = !!payload.html;
    let finalContent: string;
    let cleanedTextContent: string;
    let contentType: string;

    if (isHtmlContent && payload.html) {
      // For HTML emails: preserve original HTML as main content
      console.log(`[HTML Email] Processing HTML content, original length: ${payload.html.length}`);
      finalContent = cleanHtmlContent(payload.html); // Light cleaning of HTML (remove tracking, etc.)
      cleanedTextContent = cleanEmailContent(payload.html, true); // Convert to clean text for search/preview
      contentType = 'text/html';
      console.log(
        `[HTML Email] Cleaned HTML: ${finalContent.length} chars, Text version: ${cleanedTextContent.length} chars`
      );
    } else {
      // For text emails: use cleaned text
      const rawTextContent = payload.text || '';
      console.log(
        `[Text Email] Processing text content, original length: ${rawTextContent.length}`
      );
      finalContent = cleanEmailContent(rawTextContent, false);
      cleanedTextContent = finalContent;
      contentType = 'text/plain';
      console.log(`[Text Email] Cleaned: ${finalContent.length} chars`);
    }

    // Create preview from cleaned text (not HTML)
    const contentPreview = extractEmailPreview(cleanedTextContent);
    console.log(`[Content Processing] Content type: ${contentType}, Preview: "${contentPreview}"`);

    // Find the channel this email was sent to
    const { data: channel } = await supabase
      .from('channels')
      .select('*')
      .eq('type', 'email')
      .eq('email_address', payload.to)
      .eq('is_active', true)
      .single();

    if (!channel) {
      throw new Error(`No active email channel found for address: ${payload.to}`);
    }

    // Check if this is a reply to an existing ticket
    let ticketId = null;
    if (payload.inReplyTo || payload.references?.length) {
      // Try to find existing conversation by message ID references
      const { data: existingMessage } = await supabase
        .from('messages')
        .select('conversation_id, conversations(ticket_id)')
        .or(
          `metadata->>'messageId'.eq.${payload.inReplyTo},metadata->>'messageId'.in.(${payload.references?.join(',') || ''})`
        )
        .limit(1)
        .single();

      if (existingMessage?.conversations?.ticket_id) {
        ticketId = existingMessage.conversations.ticket_id;
      }
    }

    // Extract ticket number from subject (e.g., "Re: [Ticket #123] Original subject")
    if (!ticketId && payload.subject) {
      const ticketMatch = payload.subject.match(/\[Ticket #(\d+)\]/i);
      if (ticketMatch) {
        const ticketNumber = parseInt(ticketMatch[1]);
        const { data: ticket } = await supabase
          .from('tickets')
          .select('id')
          .eq('number', ticketNumber)
          .single();

        if (ticket) {
          ticketId = ticket.id;
        }
      }
    }

    // Find or create customer
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', payload.from.email)
      .single();

    let customerId = customer?.id;
    if (!customerId) {
      const { data: newCustomer } = await supabase
        .from('customers')
        .insert({
          email: payload.from.email,
          name: payload.from.name || payload.from.email.split('@')[0],
        })
        .select('id')
        .single();

      customerId = newCustomer?.id;
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
          updated_at: new Date().toISOString(),
          metadata: {
            gmail_message_id: payload.messageId,
            channel_id: channel.id,
            created_via: 'process_email_v17',
          },
        })
        .select('id')
        .single();

      if (ticketError) {
        console.error('Error creating ticket:', ticketError);
        throw new Error(`Failed to create ticket: ${ticketError.message}`);
      }

      ticketId = newTicket.id;

      // Create conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          ticket_id: ticketId,
          channel: 'email',
          external_id: payload.messageId,
          created_at: new Date().toISOString(),
          metadata: {
            message_id: payload.messageId,
          },
        })
        .select('id')
        .single();

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw new Error(`Failed to create conversation: ${convError.message}`);
      }

      // 🎯 ENHANCED: Create initial message with processed content and proper metadata
      const { error: messageError } = await supabase.from('messages').insert({
        conversation_id: newConversation.id,
        content: finalContent, // 🔧 Use processed content (cleaned HTML or text)
        content_type: contentType, // 🔧 Use determined content type
        sender_type: 'customer',
        sender_id: payload.from.email,
        sender_name: payload.from.name,
        is_internal: false,
        metadata: {
          from: payload.from.email,
          from_name: payload.from.name,
          subject: payload.subject,
          messageId: payload.messageId,
          email: true,
          received_at: new Date().toISOString(),
          content_processing: {
            is_html_email: isHtmlContent,
            original_html_length: payload.html?.length || 0,
            original_text_length: payload.text?.length || 0,
            final_content_length: finalContent.length,
            cleaned_text_length: cleanedTextContent.length,
            preview: contentPreview,
          },
          // 🎯 NEW: Save cleaned text version for search/display options
          text_content: cleanedTextContent, // Always available as fallback
          originalHtml: payload.html, // Keep original for reference
          originalText: payload.text, // Keep original for reference
        },
        attachments: payload.attachments || [],
        created_at: new Date().toISOString(),
      });

      if (messageError) {
        console.error('Error creating message:', messageError);
        throw new Error(`Failed to create message: ${messageError.message}`);
      }

      console.log(
        `✅ Created ticket ${ticketId} with ${contentType} content (${finalContent.length} chars) and text fallback (${cleanedTextContent.length} chars)`
      );
    } else {
      // Add message to existing ticket
      const { data: conversation } = await supabase
        .from('conversations')
        .select('id')
        .eq('ticket_id', ticketId)
        .single();

      if (conversation) {
        // 🎯 ENHANCED: Add message with processed content and proper metadata
        await supabase.from('messages').insert({
          conversation_id: conversation.id,
          content: finalContent, // 🔧 Use processed content (cleaned HTML or text)
          content_type: contentType, // 🔧 Use determined content type
          sender_type: 'customer',
          sender_id: payload.from.email,
          sender_name: payload.from.name,
          is_internal: false,
          metadata: {
            from: payload.from.email,
            from_name: payload.from.name,
            subject: payload.subject,
            messageId: payload.messageId,
            email: true,
            received_at: new Date().toISOString(),
            content_processing: {
              is_html_email: isHtmlContent,
              original_html_length: payload.html?.length || 0,
              original_text_length: payload.text?.length || 0,
              final_content_length: finalContent.length,
              cleaned_text_length: cleanedTextContent.length,
              preview: contentPreview,
            },
            // 🎯 NEW: Save cleaned text version for search/display options
            text_content: cleanedTextContent, // Always available as fallback
            originalHtml: payload.html, // Keep original for reference
            originalText: payload.text, // Keep original for reference
          },
          attachments: payload.attachments || [],
        });

        console.log(
          `✅ Added message to existing ticket ${ticketId} with ${contentType} content (${finalContent.length} chars)`
        );

        // Update ticket status if it was closed
        await supabase
          .from('tickets')
          .update({
            status: 'open',
            updated_at: new Date().toISOString(),
          })
          .eq('id', ticketId)
          .in('status', ['closed', 'resolved']);
      }
    }

    // Update channel last sync time
    await supabase
      .from('channels')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', channel.id);

    // Mark webhook as processed
    await supabase
      .from('webhook_logs')
      .update({ processed: true })
      .eq('payload->messageId', payload.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        ticketId,
        message: 'Email processed successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error processing email:', error);

    // Log the error
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase.from('webhook_logs').insert({
      channel: 'email',
      payload: await req.text(),
      error: error.message,
      processed: false,
    });

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
