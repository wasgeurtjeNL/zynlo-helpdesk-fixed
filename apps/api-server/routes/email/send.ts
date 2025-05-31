/// <reference path="../../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { emailService, EmailSendOptions } from '../../src/services/email';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const router = Router();

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Send email request schema
const SendEmailSchema = z.object({
  channelId: z.string().uuid().optional(),
  ticketId: z.string().uuid().optional(),
  from: z.object({
    address: z.string().email(),
    name: z.string().optional(),
  }).optional(),
  to: z.array(z.object({
    address: z.string().email(),
    name: z.string().optional(),
  })),
  cc: z.array(z.object({
    address: z.string().email(),
    name: z.string().optional(),
  })).optional(),
  bcc: z.array(z.object({
    address: z.string().email(),
    name: z.string().optional(),
  })).optional(),
  subject: z.string(),
  text: z.string().optional(),
  html: z.string().optional(),
  attachments: z.array(z.object({
    filename: z.string(),
    content: z.string().optional(), // Base64 encoded
    path: z.string().optional(),
    contentType: z.string().optional(),
  })).optional(),
  replyTo: z.object({
    messageId: z.string(),
  }).optional(),
});

type SendEmailRequest = z.infer<typeof SendEmailSchema>;

/**
 * Send an email through a channel
 */
router.post('/send', async (req: Request, res: Response): Promise<Response | void> => {
  try {
    // Validate request
    const data = SendEmailSchema.parse(req.body);
    
    let channelId = data.channelId;
    let fromAddress = data.from;

    // If no channel ID provided, find channel by ticket or from address
    if (!channelId) {
      if (data.ticketId) {
        // Get channel from ticket
        const { data: ticket, error } = await supabase
          .from('tickets')
          .select('channel_id')
          .eq('id', data.ticketId)
          .single();

        if (error || !ticket) {
          return res.status(404).json({ error: 'Ticket not found' });
        }

        channelId = ticket.channel_id;
      } else if (data.from) {
        // Find channel by email address
        const { data: channels, error } = await supabase
          .from('channels')
          .select('id, settings')
          .eq('type', 'email')
          .eq('is_active', true);

        if (error || !channels) {
          return res.status(404).json({ error: 'No email channels found' });
        }

        // Find channel with matching email address
        const channel = channels.find(ch => 
          (ch.settings as any)?.email_address === data.from!.address
        );

        if (!channel) {
          return res.status(404).json({ 
            error: `No channel found for email address ${data.from.address}` 
          });
        }

        channelId = channel.id;
      } else {
        return res.status(400).json({ 
          error: 'Either channelId, ticketId, or from address must be provided' 
        });
      }
    }

    // Get channel details for from address
    if (!fromAddress) {
      const { data: channel, error } = await supabase
        .from('channels')
        .select('settings')
        .eq('id', channelId!)
        .single();

      if (error || !channel) {
        return res.status(404).json({ error: 'Channel not found' });
      }

      const emailAddress = (channel.settings as any)?.email_address;
      if (!emailAddress) {
        return res.status(400).json({ error: 'Channel has no email address configured' });
      }

      fromAddress = {
        address: emailAddress,
        name: (channel.settings as any)?.display_name || undefined,
      };
    }

    // Handle reply
    let inReplyTo: string | undefined;
    let references: string[] | undefined;
    let subject = data.subject;

    if (data.replyTo) {
      // Get original message details
      const { data: message, error } = await supabase
        .from('messages')
        .select('metadata')
        .eq('id', data.replyTo.messageId)
        .single();

      if (!error && message) {
        const metadata = message.metadata as any;
        inReplyTo = metadata?.messageId;
        references = metadata?.references || [];
        if (inReplyTo && references) {
          references.push(inReplyTo);
        }

        // Add Re: to subject if not present
        if (!subject.toLowerCase().startsWith('re:')) {
          subject = `Re: ${subject}`;
        }
      }
    }

    // Process attachments (convert base64 to Buffer)
    const attachments = data.attachments?.map(att => ({
      filename: att.filename,
      content: att.content ? Buffer.from(att.content, 'base64') : undefined,
      path: att.path,
      contentType: att.contentType,
    }));

    // Build email options
    const emailOptions: EmailSendOptions = {
      from: fromAddress,
      to: data.to,
      cc: data.cc,
      bcc: data.bcc,
      subject,
      text: data.text,
      html: data.html,
      attachments,
      inReplyTo,
      references,
    };

    // Send email
    if (!channelId) {
      return res.status(500).json({ error: 'Channel ID is required' });
    }
    
    const result = await emailService.sendEmail(channelId, emailOptions);

    // Create message record in database if this is a ticket reply
    if (data.ticketId && data.replyTo) {
      const { data: originalMessage } = await supabase
        .from('messages')
        .select('conversation_id')
        .eq('id', data.replyTo.messageId)
        .single();

      if (originalMessage) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: originalMessage.conversation_id,
            content: data.html || data.text || '',
            content_type: data.html ? 'html' : 'text',
            sender_type: 'agent',
            sender_id: req.user?.id || 'system', // Assuming auth middleware sets req.user
            metadata: {
              messageId: result.messageId,
              to: data.to,
              cc: data.cc,
              subject,
              inReplyTo,
              references,
            },
          });
      }
    }

    return res.json({
      success: true,
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
    });
  } catch (error) {
    console.error('Send email error:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid request', 
        details: error.errors 
      });
    }

    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    });
  }
});

/**
 * Send a test email
 */
router.post('/test/:channelId', async (req: Request, res: Response): Promise<Response> => {
  try {
    const { channelId } = req.params;
    
    // Get channel details
    const { data: channel, error } = await supabase
      .from('channels')
      .select('settings')
      .eq('id', channelId)
      .single();

    if (error || !channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const emailAddress = (channel.settings as any)?.email_address;
    if (!emailAddress) {
      return res.status(400).json({ error: 'Channel has no email address configured' });
    }

    // Send test email
    const result = await emailService.sendEmail(channelId, {
      from: {
        address: emailAddress,
        name: 'Test Sender',
      },
      to: [{
        address: emailAddress,
        name: 'Test Recipient',
      }],
      subject: 'Test Email from Zynlo Helpdesk',
      text: 'This is a test email to verify your email configuration is working correctly.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Test Email</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p>If you receive this email, your SMTP settings are properly configured!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Sent from Zynlo Helpdesk at ${new Date().toLocaleString()}
          </p>
        </div>
      `,
    });

    return res.json({
      success: true,
      message: 'Test email sent successfully',
      messageId: result.messageId,
    });
  } catch (error) {
    console.error('Test email error:', error);
    return res.status(500).json({ 
      error: error instanceof Error ? error.message : 'Failed to send test email' 
    });
  }
});

export default router; 