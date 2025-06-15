import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface EmailRequest {
  ticketNumber: number;
  content: string;
  replyToMessageId?: string;
  agentName?: string;
  agentEmail?: string;
}

interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ success: false, error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body: EmailRequest = await req.json()
    const { ticketNumber, content, replyToMessageId, agentName, agentEmail } = body

    if (!ticketNumber || !content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: ticketNumber, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(id, name, email),
        conversations(id, external_id)
      `)
      .eq('number', ticketNumber)
      .single()

    if (ticketError || !ticket) {
      return new Response(
        JSON.stringify({ success: false, error: 'Ticket not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!ticket.customer?.email) {
      return new Response(
        JSON.stringify({ success: false, error: 'Customer email not found' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use the provided agentEmail (which is the authenticated user's email)
    const fromEmail = agentEmail || 'support@wasgeurtje.nl';
    const fromName = agentName || 'Zynlo Support';
    const toEmail = ticket.customer.email;
    const customerName = ticket.customer.name || 'Klant';
    
    const subject = `Re: ${ticket.subject} [Ticket #${ticketNumber}]`;
    
    const headers: Record<string, string> = {
      'X-Ticket-ID': ticket.id,
      'X-Ticket-Number': ticketNumber.toString(),
    };
    
    if (replyToMessageId) {
      headers['In-Reply-To'] = replyToMessageId;
      headers['References'] = replyToMessageId;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <h2 style="margin: 0 0 10px 0; color: #2563eb;">Zynlo Support</h2>
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Ticket #${ticketNumber}</p>
        </div>
        
        <p>Hallo ${customerName},</p>
        
        <div style="background: #fff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          ${content.split('\n').map(line => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
        </div>
        
        <p>Met vriendelijke groet,<br>
        ${fromName}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="font-size: 12px; color: #6b7280; text-align: center;">
          <p>Dit bericht is verzonden vanuit Zynlo Helpdesk systeem.</p>
          <p>Ticket referentie: #${ticketNumber}</p>
        </div>
      </body>
      </html>
    `;

    const textContent = `Hallo ${customerName},\n\n${content}\n\nMet vriendelijke groet,\n${fromName}\n\n---\nTicket #${ticketNumber}\nDit bericht is verzonden vanuit Zynlo Helpdesk systeem.`;

    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
      text: textContent,
      headers: headers,
      tags: [
        {
          name: 'ticket-id',
          value: ticket.id
        },
        {
          name: 'ticket-number', 
          value: ticketNumber.toString()
        }
      ]
    };

    console.log('Sending email via Resend:', {
      to: toEmail,
      subject: subject,
      from: `${fromName} <${fromEmail}>`
    });

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    });

    const resendResult = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendResult);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Email delivery failed: ${resendResult.message || 'Unknown error'}` 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Email sent successfully:', resendResult);

    const response: EmailResponse = {
      success: true,
      messageId: resendResult.id
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}) 