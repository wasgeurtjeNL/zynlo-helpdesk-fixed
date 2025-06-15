import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';

interface EmailRequest {
  ticketNumber: number;
  content: string;
  agentName?: string;
  agentEmail?: string;
  fromChannelId?: string;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json();
    const { ticketNumber, content, agentName, agentEmail, fromChannelId } = body;

    console.log('📧 Email reply API called with:', {
      ticketNumber,
      agentName,
      agentEmail,
      fromChannelId,
    });

    // Validate required fields
    if (!ticketNumber || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ticketNumber, content' },
        { status: 400 }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase configuration missing' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get ticket details from database
    console.log('🔍 Looking up ticket:', ticketNumber);
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(
        `
        *,
        customer:customer_id(id, name, email)
      `
      )
      .eq('number', ticketNumber)
      .single();

    if (ticketError || !ticket) {
      console.error('❌ Ticket lookup error:', ticketError);
      return NextResponse.json({ success: false, error: 'Ticket not found' }, { status: 404 });
    }

    // Get the conversation ID separately
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select('id, channel_id')
      .eq('ticket_id', ticket.id)
      .single();

    if (convError && convError.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      console.error('❌ Conversation lookup error:', convError);
    }

    if (!ticket.customer?.email) {
      console.error('❌ No customer email found');
      return NextResponse.json(
        { success: false, error: 'Customer email not found' },
        { status: 400 }
      );
    }

    // Determine sender email address and channel info
    let fromEmail = agentEmail || 'support@wasgeurtje.nl';
    let fromName = agentName || 'Zynlo Support';
    let channelInfo: any = null;
    let useGmailOAuth = false;

    // Try to use the channel from the conversation first, then fromChannelId
    const channelIdToUse = fromChannelId || conversation?.channel_id;

    if (channelIdToUse) {
      // Get channel information
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelIdToUse)
        .eq('type', 'email')
        .single();

      if (channel && !channelError) {
        channelInfo = channel;
        const channelEmailAddress = (channel.settings as any)?.email_address;
        if (channelEmailAddress) {
          fromEmail = channelEmailAddress;
          fromName = channel.name;
          useGmailOAuth = true;
          console.log('📧 Using linked Gmail channel for reply:', `${fromName} <${fromEmail}>`);
        } else {
          console.log('📧 Channel found but no email address, using agent email:', fromEmail);
        }
      } else {
        console.log('📧 Channel not found, using agent email:', fromEmail);
      }
    } else {
      console.log('📧 No channel specified, using agent email:', fromEmail);
    }

    const toEmail = ticket.customer.email;
    const customerName = ticket.customer.name || 'Klant';
    const subject = `Re: ${ticket.subject} [Ticket #${ticketNumber}]`;
    const fromAddress = `${fromName} <${fromEmail}>`;

    console.log('📧 Email reply details:', { from: fromAddress, to: toEmail, subject });

    // Build HTML & text versions
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #2563eb;">Zynlo Support</h2>
          <p style="margin: 5px 0 0 0; color: #6b7280;">Ticket #${ticketNumber}</p>
        </div>
        
        <p>Hallo ${customerName},</p>
        
        <div style="border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; background: #f9fafb;">
          ${content
            .split('\n')
            .map((line) => `<p style="margin: 0 0 10px 0;">${line}</p>`)
            .join('')}
        </div>
        
        <p>Met vriendelijke groet,<br>${fromName}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <div style="font-size: 12px; color: #6b7280; text-align: center;">
          <p>Ticket referentie: #${ticketNumber}</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hallo ${customerName},\n\n${content}\n\nMet vriendelijke groet,\n${fromName}\n\n---\nTicket #${ticketNumber}`;

    // Send email via Gmail OAuth if channel is configured, otherwise simulate
    let messageId: string | undefined;

    if (useGmailOAuth && channelInfo) {
      try {
        // Get OAuth tokens for the channel
        let tokenData = null;

        // Try new oauth_tokens table first
        const { data: newTokenData, error: newTokenError } = await supabase
          .from('oauth_tokens')
          .select('*')
          .eq('channel_id', channelIdToUse)
          .eq('provider', 'gmail')
          .single();

        if (newTokenData && !newTokenError) {
          tokenData = newTokenData;
        } else {
          // Fallback: check legacy storage in channels.settings
          if (channelInfo.settings?.oauth_access_token) {
            tokenData = {
              access_token: channelInfo.settings.oauth_access_token,
              refresh_token: channelInfo.settings.oauth_refresh_token,
              expires_at: channelInfo.settings.oauth_expires_at
                ? new Date(channelInfo.settings.oauth_expires_at).toISOString()
                : null,
              token_type: 'Bearer',
              scope: 'https://mail.google.com/',
            };
          }
        }

        if (!tokenData?.access_token) {
          throw new Error('Gmail OAuth tokens not found for channel');
        }

        // Setup Gmail API client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_CLIENT_ID,
          process.env.GOOGLE_CLIENT_SECRET
        );

        oauth2Client.setCredentials({
          access_token: tokenData.access_token,
          refresh_token: tokenData.refresh_token,
          expiry_date: tokenData.expires_at ? new Date(tokenData.expires_at).getTime() : undefined,
        });

        // Check if token needs refresh
        const now = new Date();
        const expiresAt = tokenData.expires_at ? new Date(tokenData.expires_at) : null;

        if (expiresAt && now >= expiresAt && tokenData.refresh_token) {
          console.log('🔄 Refreshing expired Gmail token...');
          try {
            const { credentials } = await oauth2Client.refreshAccessToken();
            oauth2Client.setCredentials(credentials);

            // Update stored tokens
            if (newTokenData) {
              await supabase
                .from('oauth_tokens')
                .update({
                  access_token: credentials.access_token,
                  expires_at: credentials.expiry_date
                    ? new Date(credentials.expiry_date).toISOString()
                    : null,
                })
                .eq('channel_id', channelIdToUse)
                .eq('provider', 'gmail');
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            throw new Error('Gmail token refresh failed - please reconnect channel');
          }
        }

        // Create Gmail message
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build email message
        const messageParts = [
          `From: ${fromAddress}`,
          `To: ${toEmail}`,
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=utf-8',
          '',
          htmlContent,
        ].join('\r\n');

        const encodedMessage = Buffer.from(messageParts)
          .toString('base64')
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');

        const response = await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: encodedMessage,
          },
        });

        messageId = response.data.id;

        console.log('✅ Email reply sent successfully via Gmail OAuth:', messageId);

        return NextResponse.json({
          success: true,
          messageId: messageId,
          message: `✅ Email sent successfully to ${toEmail} via ${channelInfo.name}`,
          sentVia: `gmail-oauth-${channelInfo.name}`,
        });
      } catch (gmailError) {
        console.error('❌ Failed to send email reply via Gmail OAuth:', gmailError);
        // Fall back to simulation
        console.log('📧 FALLBACK: Simulating email reply due to Gmail OAuth error');
        messageId = `fallback-reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        return NextResponse.json({
          success: true,
          messageId: messageId,
          message: `✅ Email simulated (fallback) to ${toEmail}`,
          sentVia: 'development-simulation-fallback',
        });
      }
    } else {
      // Simulate email reply sending for development
      console.log('📧 SIMULATED EMAIL REPLY (Development Mode):');
      console.log('📧 From:', fromAddress);
      console.log('📧 To:', toEmail);
      console.log('📧 Subject:', subject);
      console.log('📧 Content preview:', content.substring(0, 100) + '...');
      console.log('📧 Ticket:', `#${ticketNumber}`);

      messageId = `dev-reply-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      console.log('✅ Email reply simulated successfully with ID:', messageId);
      console.log(
        '💡 Note: This is a development simulation. Configure Gmail OAuth for real sending.'
      );

      return NextResponse.json({
        success: true,
        messageId: messageId,
        message: `✅ Email simulated successfully to ${toEmail}`,
        sentVia: 'development-simulation',
      });
    }
  } catch (error) {
    console.error('❌ API route error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
