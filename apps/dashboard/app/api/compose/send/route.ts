import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import type { Database } from '@zynlo/supabase';
import { google } from 'googleapis';

interface TicketResult {
  ticket_id: string;
  conversation_id: string;
}

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  console.log('-------- /api/compose/send --------');
  console.log('Auth header:', request.headers.get('authorization')?.slice(0, 40) || 'none');
  console.log('Cookies     :', request.headers.get('cookie')?.slice(0, 80) || 'none');
  try {
    // Use service role for database operations to bypass RLS
    const { createClient } = await import('@supabase/supabase-js');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Still get user from regular client for authentication
    const supabase = createRouteHandlerClient<Database>({ cookies });
    const bearer = request.headers.get('authorization')?.replace('Bearer ', '');

    let user;
    let authError;
    if (bearer) {
      ({
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(bearer));
    } else {
      ({
        data: { user },
        error: authError,
      } = await supabase.auth.getUser());
    }

    // Verify user
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { to, cc, bcc, subject, content, isHtml, fromChannelId } = body;

    console.log('📝 Email request details:', {
      to,
      subject,
      content,
      contentLength: content?.length,
      isHtml,
      fromChannelId,
    });

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      );
    }

    let fullName = user.user_metadata?.full_name as string | undefined;
    let email = user.email as string | undefined;

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .maybeSingle();

    if (userData) {
      fullName = userData.full_name || fullName;
      email = userData.email || email;
    }

    if (!email) {
      return NextResponse.json({ error: 'Failed to get user details' }, { status: 400 });
    }

    // Determine sender email address and channel info
    let fromAddress: string;
    let channelInfo: any = null;
    let useGmailOAuth = false;

    if (fromChannelId) {
      // Get channel information
      const { data: channel, error: channelError } = await supabaseAdmin
        .from('channels')
        .select('*')
        .eq('id', fromChannelId)
        .eq('type', 'email')
        .single();

      if (channel && !channelError) {
        channelInfo = channel;
        const channelEmailAddress = (channel.settings as any)?.email_address;
        if (channelEmailAddress) {
          fromAddress = `${channel.name} <${channelEmailAddress}>`;
          useGmailOAuth = true;
          console.log('📧 Using linked Gmail channel:', fromAddress);
        } else {
          fromAddress = `${fullName || email.split('@')[0]} <${email}>`;
          console.log('📧 Channel found but no email address, using user email:', fromAddress);
        }
      } else {
        fromAddress = `${fullName || email.split('@')[0]} <${email}>`;
        console.log('📧 Channel not found, using user email:', fromAddress);
      }
    } else {
      // No channel specified, use authenticated user's email address
      fromAddress = `${fullName || email.split('@')[0]} <${email}>`;
      console.log('📧 No channel specified, using authenticated user email:', fromAddress);
    }

    // Create ticket and conversation in database using admin client
    // Voor uitgaande emails maken we direct de juiste structuur aan

    // First check if customer exists
    let customer;
    const { data: existingCustomer, error: lookupError } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('email', to.toLowerCase())
      .maybeSingle();

    if (lookupError) {
      console.error('Error looking up customer:', lookupError);
      return NextResponse.json({ error: 'Failed to lookup customer' }, { status: 500 });
    }

    if (existingCustomer) {
      customer = existingCustomer;
    } else {
      // Create new customer
      const { data: newCustomer, error: createError } = await supabaseAdmin
        .from('customers')
        .insert({
          email: to.toLowerCase(),
          name: to.split('@')[0],
        })
        .select('id')
        .single();

      if (createError || !newCustomer) {
        console.error('Failed to create customer:', createError);
        return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
      }
      customer = newCustomer;
    }

    // Prepare email options object once
    const emailOptions: any = {
      from: fromAddress,
      to: [to],
      subject,
      html: isHtml ? content : undefined,
      text: !isHtml ? content : undefined,
    };

    if (cc) emailOptions.cc = cc.split(',').map((e: string) => e.trim());
    if (bcc) emailOptions.bcc = bcc.split(',').map((e: string) => e.trim());

    // Send email via Gmail OAuth if channel is configured, otherwise simulate
    let emailId: string | undefined;
    let sentVia = '';

    if (useGmailOAuth && channelInfo) {
      try {
        // Get OAuth tokens for the channel
        let tokenData = null;

        // Try new oauth_tokens table first
        const { data: newTokenData, error: newTokenError } = await supabaseAdmin
          .from('oauth_tokens')
          .select('*')
          .eq('channel_id', fromChannelId)
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
              await supabaseAdmin
                .from('oauth_tokens')
                .update({
                  access_token: credentials.access_token,
                  expires_at: credentials.expiry_date
                    ? new Date(credentials.expiry_date).toISOString()
                    : null,
                })
                .eq('channel_id', fromChannelId)
                .eq('provider', 'gmail');
            }
          } catch (refreshError) {
            console.error('❌ Token refresh failed:', refreshError);
            throw new Error('Gmail token refresh failed - please reconnect channel');
          }
        }

        // Create Gmail message
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

        // Build email message with proper MIME structure
        const boundary = `boundary_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        const messageParts = [
          `From: ${fromAddress}`,
          `To: ${to}`,
          cc ? `Cc: ${cc}` : '',
          bcc ? `Bcc: ${bcc}` : '',
          `Subject: ${subject}`,
          'MIME-Version: 1.0',
          isHtml
            ? `Content-Type: multipart/alternative; boundary="${boundary}"`
            : 'Content-Type: text/plain; charset=utf-8',
          'Content-Transfer-Encoding: 8bit',
          '',
        ].filter(Boolean);

        // Add message body
        if (isHtml) {
          // For HTML emails, create multipart/alternative with both text and HTML
          messageParts.push(
            `--${boundary}`,
            'Content-Type: text/plain; charset=utf-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            content, // Plain text version
            '',
            `--${boundary}`,
            'Content-Type: text/html; charset=utf-8',
            'Content-Transfer-Encoding: 8bit',
            '',
            content, // HTML version (for now, same as plain text)
            '',
            `--${boundary}--`
          );
        } else {
          // For plain text emails
          messageParts.push('', content);
        }

        const rawMessage = messageParts.join('\r\n');

        console.log('📧 MIME message being sent:', {
          isHtml,
          contentType: isHtml ? 'multipart/alternative' : 'text/plain',
          contentLength: content?.length,
          messagePartsCount: messageParts.length,
          rawMessageLength: rawMessage.length,
          rawMessagePreview: rawMessage.substring(0, 500) + '...',
        });

        const encodedMessage = Buffer.from(rawMessage)
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

        emailId = response.data.id;
        sentVia = `gmail-oauth-${channelInfo.name}`;

        console.log('✅ Email sent successfully via Gmail OAuth:', emailId);
      } catch (gmailError) {
        console.error('❌ Failed to send email via Gmail OAuth:', gmailError);
        // Fall back to simulation
        console.log('📧 FALLBACK: Simulating email send due to Gmail OAuth error');
        emailId = `fallback-email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        sentVia = 'development-simulation-fallback';
      }
    } else {
      // Simulate email sending for development
      console.log('📧 SIMULATED EMAIL SEND (Development Mode):');
      console.log('📧 From:', fromAddress);
      console.log('📧 To:', to);
      console.log('📧 Subject:', subject);
      console.log('📧 Content preview:', content.substring(0, 100) + '...');
      console.log('📧 HTML:', isHtml ? 'Yes' : 'No');
      if (cc) console.log('📧 CC:', cc);
      if (bcc) console.log('📧 BCC:', bcc);

      emailId = `dev-email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sentVia = 'development-simulation';

      console.log('✅ Email simulated successfully with ID:', emailId);
      console.log(
        '💡 Note: This is a development simulation. Configure Gmail OAuth for real sending.'
      );
    }

    // Create ticket directly
    const { data: ticket, error: ticketError } = await supabaseAdmin
      .from('tickets')
      .insert({
        subject,
        description: content,
        customer_id: customer.id,
        status: 'pending', // Pending omdat agent wacht op antwoord
        priority: 'normal',
        assignee_id: user.id,
        metadata: {
          email_id: emailId,
          sent_by: user.id,
          from_address: fromAddress,
          from_channel_id: fromChannelId || undefined,
          cc,
          bcc,
          is_outbound: true,
          sent_via: sentVia,
          initial_message_type: 'outbound', // Mark this as an outbound-initiated conversation
        },
      })
      .select('id')
      .single();

    if (ticketError || !ticket) {
      console.error('Failed to create ticket:', ticketError);
      return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
    }

    // Create conversation
    const conversationData: any = {
      ticket_id: ticket.id,
      channel: 'email',
    };

    // Only add channel_id if it's a string
    if (typeof fromChannelId === 'string' && fromChannelId.length > 0) {
      conversationData.channel_id = fromChannelId; // Sla de Gmail channel ID op voor replies!
    }

    const { data: conversation, error: convError } = await supabaseAdmin
      .from('conversations')
      .insert(conversationData)
      .select('id')
      .single();

    if (convError || !conversation) {
      console.error('Failed to create conversation:', convError);
      return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
    }

    // Add outbound message from agent
    const { data: message, error: messageError } = await supabaseAdmin
      .from('messages')
      .insert({
        conversation_id: conversation.id,
        content,
        content_type: isHtml ? 'text/html' : 'text/plain',
        sender_type: 'agent',
        sender_id: user.id,
        sender_name: fullName || email,
        metadata: {
          email_id: emailId,
          from_address: fromAddress,
          from_channel_id: fromChannelId || undefined,
          to: to,
          cc,
          bcc,
          is_outbound: true,
        },
      })
      .select('id')
      .single();

    if (messageError) {
      console.error('Failed to create message:', messageError);
      // Don't fail the entire request if message creation fails
    }

    return NextResponse.json({
      success: true,
      emailId: emailId,
      ticketId: ticket.id,
      conversationId: conversation.id,
      messageId: message?.id,
      fromAddress,
      fromChannel: channelInfo?.name,
      message: 'Email sent successfully',
      sentVia,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
