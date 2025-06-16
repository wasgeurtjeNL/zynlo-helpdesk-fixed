import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface EmailRequest {
  to: string;
  subject: string;
  template: string;
  variables: {
    ticket: {
      number: number;
      subject: string;
    };
    message: {
      content: string;
    };
    agent: {
      name: string;
      email: string;
    };
    customer: {
      name: string;
    };
  };
  conversationId: string;
  channelId?: string;
}

interface EmailResponse {
  success: boolean;
  email_id?: string;
  error?: string;
  service?: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: EmailRequest = await req.json();
    const { to, subject, variables, conversationId, channelId } = body;

    console.log('📧 Gmail Edge Function called with:', {
      to,
      subject,
      conversationId,
      channelId,
    });

    if (!to || !subject || !variables?.message?.content) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: to, subject, content' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Gmail channel with OAuth tokens
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('id, settings')
      .eq('type', 'email')
      .eq('provider', 'gmail')
      .eq('is_active', true)
      .single();

    if (channelError || !channel) {
      console.error('❌ No active Gmail channel found:', channelError);
      return new Response(
        JSON.stringify({ success: false, error: 'No active Gmail channel configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const settings = channel.settings as any;
    if (!settings?.oauth_access_token) {
      console.error('❌ No OAuth tokens found for Gmail channel');
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Gmail channel not authenticated. Please re-connect Gmail account.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build email content
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
          <p style="margin: 0; color: #6b7280; font-size: 14px;">Ticket #${variables.ticket.number}</p>
        </div>
        
        <p>Hallo ${variables.customer.name},</p>
        
        <div style="background: #fff; border-left: 4px solid #2563eb; padding: 20px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          ${variables.message.content
            .split('\n')
            .map((line) => `<p style="margin: 0 0 10px 0;">${line}</p>`)
            .join('')}
        </div>
        
        <p>Met vriendelijke groet,<br>
        ${variables.agent.name}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <div style="font-size: 12px; color: #6b7280; text-align: center;">
          <p>Dit bericht is verzonden vanuit Zynlo Helpdesk systeem.</p>
          <p>Ticket referentie: #${variables.ticket.number}</p>
        </div>
      </body>
      </html>
    `;

    // Prepare Gmail API call
    const emailMessage = {
      raw: btoa(
        `To: ${to}\r\n` +
          `From: ${variables.agent.name} <${settings.email_address}>\r\n` +
          `Subject: ${subject}\r\n` +
          `Content-Type: text/html; charset=utf-8\r\n` +
          `\r\n` +
          htmlContent
      )
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, ''),
    };

    console.log('📤 Sending email via Gmail API...');

    // Send email via Gmail API
    const gmailResponse = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${settings.oauth_access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailMessage),
      }
    );

    const gmailResult = await gmailResponse.json();

    if (!gmailResponse.ok) {
      console.error('❌ Gmail API error:', gmailResult);

      // If token expired, try to refresh
      if (gmailResult.error?.code === 401 && settings.oauth_refresh_token) {
        console.log('🔄 Attempting to refresh OAuth token...');

        const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
        const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

        if (clientId && clientSecret) {
          const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
              grant_type: 'refresh_token',
              refresh_token: settings.oauth_refresh_token,
              client_id: clientId,
              client_secret: clientSecret,
            }),
          });

          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();

            // Update channel with new token
            await supabase
              .from('channels')
              .update({
                settings: {
                  ...settings,
                  oauth_access_token: refreshResult.access_token,
                },
              })
              .eq('id', channel.id);

            console.log('✅ Token refreshed, retrying email send...');

            // Retry email send with new token
            const retryResponse = await fetch(
              'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${refreshResult.access_token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(emailMessage),
              }
            );

            const retryResult = await retryResponse.json();

            if (retryResponse.ok) {
              console.log('✅ Email sent successfully after token refresh:', retryResult.id);

              const response: EmailResponse = {
                success: true,
                email_id: retryResult.id,
                service: 'gmail',
              };

              return new Response(JSON.stringify(response), {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              });
            }
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: `Gmail API error: ${gmailResult.error?.message || 'Unknown error'}`,
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('✅ Email sent successfully via Gmail:', gmailResult.id);

    const response: EmailResponse = {
      success: true,
      email_id: gmailResult.id,
      service: 'gmail',
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Edge function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Internal server error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
