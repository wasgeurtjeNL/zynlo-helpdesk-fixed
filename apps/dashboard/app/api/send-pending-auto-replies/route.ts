import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  console.log('🔥 AUTO-REPLY API: Sending pending auto-reply emails...');

  try {
    // Create Supabase client with service role
    const supabase = createServerClient();

    // Get all unsent auto-reply messages from recent tickets
    const { data: pendingMessages, error: fetchError } = await supabase
      .from('messages')
      .select(
        `
        id,
        content,
        metadata,
        conversation_id,
        conversations!inner(
          id,
          channel,
          channel_id,
          tickets!inner(
            id,
            number,
            subject,
            customers!inner(
              id,
              name,
              email
            )
          )
        )
      `
      )
      .eq('sender_type', 'system')
      .eq('conversations.channel', 'email')
      .eq('metadata->>auto_reply', 'true')
      .gte('conversations.tickets.number', 478)
      .order('created_at', { ascending: false });

    if (fetchError) {
      console.error('Failed to fetch pending messages:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch pending messages' }, { status: 500 });
    }

    if (!pendingMessages || pendingMessages.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No pending auto-reply emails found',
        sent: 0,
      });
    }

    console.log(`🔥 AUTO-REPLY API: Found ${pendingMessages.length} pending auto-reply emails`);

    const results = [];

    for (const message of pendingMessages) {
      try {
        const conversation = message.conversations;
        const ticket = conversation.tickets;
        const customer = ticket.customers;

        if (!customer.email) {
          console.warn(`Skipping message ${message.id}: No customer email`);
          continue;
        }

        // Get the Gmail channel
        const { data: gmailChannel } = await supabase
          .from('channels')
          .select('id, settings')
          .eq('id', conversation.channel_id)
          .eq('type', 'email')
          .single();

        if (!gmailChannel) {
          console.warn(`Skipping message ${message.id}: No Gmail channel found`);
          continue;
        }

        // Prepare email data
        const subject =
          message.metadata?.processed_subject ||
          `Welkom bij Zynlo Support - Ticket #${ticket.number}`;

        const emailData = {
          to: customer.email,
          subject: subject,
          template: 'auto_reply',
          variables: {
            ticket: {
              number: ticket.number,
              subject: ticket.subject,
            },
            message: {
              content: message.content,
            },
            customer: {
              name: customer.name || 'Klant',
            },
            agent: {
              name: 'Zynlo Support Team',
              email: gmailChannel.settings?.email_address || 'support@zynlo.com',
            },
          },
          conversationId: conversation.id,
          channelId: gmailChannel.id,
        };

        // Call the Edge Function
        const { data: emailResult, error: emailError } = await supabase.functions.invoke(
          'send-email-gmail',
          {
            body: emailData,
          }
        );

        if (emailError) {
          console.error(`Failed to send auto-reply for message ${message.id}:`, emailError);
          results.push({
            messageId: message.id,
            ticketNumber: ticket.number,
            customerEmail: customer.email,
            status: 'FAILED',
            error: emailError.message,
          });
          continue;
        }

        if (!emailResult?.success) {
          console.error(`Email send failed for message ${message.id}:`, emailResult);
          results.push({
            messageId: message.id,
            ticketNumber: ticket.number,
            customerEmail: customer.email,
            status: 'FAILED',
            error: emailResult?.error || 'Unknown error',
          });
          continue;
        }

        console.log(
          `✅ Successfully sent auto-reply for ticket #${ticket.number} to ${customer.email}`
        );

        results.push({
          messageId: message.id,
          ticketNumber: ticket.number,
          customerEmail: customer.email,
          status: 'SUCCESS',
          emailId: emailResult.email_id,
        });
      } catch (messageError) {
        console.error(`Error processing message ${message.id}:`, messageError);
        results.push({
          messageId: message.id,
          status: 'FAILED',
          error: messageError instanceof Error ? messageError.message : 'Unknown error',
        });
      }
    }

    const successCount = results.filter((r) => r.status === 'SUCCESS').length;
    const failureCount = results.filter((r) => r.status === 'FAILED').length;

    console.log(`🎉 AUTO-REPLY API: Sent ${successCount} emails, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Processed ${results.length} auto-reply emails`,
      sent: successCount,
      failed: failureCount,
      results: results,
    });
  } catch (error) {
    console.error('Auto-reply API error:', error);
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
