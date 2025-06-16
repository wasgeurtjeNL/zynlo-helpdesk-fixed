import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  console.log('🔥 API DEBUG: Send email endpoint hit');

  try {
    // Check environment variables first
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing from environment variables');
      return NextResponse.json(
        {
          error: 'Server configuration error: Missing SUPABASE_SERVICE_ROLE_KEY',
          hint: 'Create a .env.local file with the required environment variables',
        },
        { status: 500 }
      );
    }

    console.log('🔥 API DEBUG: Environment check passed');

    const body = await request.json();
    const { ticketNumber, content, agentName, agentEmail, fromChannelId } = body;

    console.log('🔥 API DEBUG: Request body:', {
      ticketNumber,
      content: content?.substring(0, 50) + '...',
      agentName,
      agentEmail,
      fromChannelId,
    });

    if (!ticketNumber || !content || !agentName) {
      return NextResponse.json(
        { error: 'Missing required fields: ticketNumber, content, agentName' },
        { status: 400 }
      );
    }

    // Create Supabase client with service role (bypasses RLS)
    console.log('🔥 API DEBUG: Creating Supabase client with service role...');
    const supabase = createServerClient();
    console.log('🔥 API DEBUG: Supabase client created with service role');

    // Note: We use service role for email sending, so no user session needed
    // The frontend already verified the user is authenticated before calling this API

    // Get ticket information to find customer email
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(
        `
        *,
        customer:customer_id(id, name, email),
        conversation:conversations!inner(id, channel, metadata)
      `
      )
      .eq('number', ticketNumber)
      .single();

    if (ticketError || !ticket) {
      console.error('Ticket fetch error:', ticketError);
      return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });
    }

    // Get customer email from ticket or first message metadata
    let customerEmail = ticket.customer?.email;

    if (!customerEmail) {
      // Try to get email from conversation metadata or first customer message
      const { data: messages } = await supabase
        .from('messages')
        .select('metadata, sender_type')
        .eq('conversation_id', ticket.conversation.id)
        .eq('sender_type', 'customer')
        .order('created_at', { ascending: true })
        .limit(1);

      if (messages?.[0]?.metadata) {
        const metadata = messages[0].metadata as any;
        customerEmail = metadata?.from?.email || metadata?.email;
      }
    }

    if (!customerEmail) {
      return NextResponse.json({ error: 'Customer email not found' }, { status: 400 });
    }

    // Use agent info from request body (already verified by frontend)
    console.log('🔥 API DEBUG: Using agent info from request:', { agentName, agentEmail });

    // Get Gmail channel for sending
    const { data: gmailChannel } = await supabase
      .from('channels')
      .select('id')
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Prepare email data for Edge Function
    const emailData = {
      to: customerEmail,
      subject: `Re: ${ticket.subject} [Ticket #${ticket.number}]`,
      template: 'ticket_reply',
      variables: {
        ticket: {
          number: ticket.number,
          subject: ticket.subject,
        },
        message: {
          content: content,
        },
        agent: {
          name: agentName,
          email: agentEmail,
        },
        customer: {
          name: ticket.customer?.name || customerEmail.split('@')[0],
        },
      },
      conversationId: ticket.conversation.id,
      channelId: gmailChannel?.id,
    };

    // Call our Gmail OAuth Edge Function
    const { data: emailResult, error: emailError } = await supabase.functions.invoke(
      'send-email-gmail',
      {
        body: emailData,
      }
    );

    if (emailError) {
      console.error('Edge function error:', emailError);
      return NextResponse.json(
        {
          error: 'Failed to send email',
          details: emailError.message,
          success: false,
        },
        { status: 500 }
      );
    }

    if (!emailResult?.success) {
      console.error('Email send failed:', emailResult);
      return NextResponse.json(
        {
          error: emailResult?.error || 'Failed to send email',
          details: emailResult?.details,
          success: false,
        },
        { status: 500 }
      );
    }

    console.log('Email sent successfully:', emailResult);

    return NextResponse.json({
      success: true,
      messageId: emailResult.email_id,
      customerEmail: customerEmail,
      agentName: agentName,
    });
  } catch (error) {
    console.error('API route error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
      },
      { status: 500 }
    );
  }
}
