import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { Database } from '@zynlo/supabase'

// Resend instance may be undefined when key is missing; create lazily
const resendApiKeyEnv = process.env.RESEND_API_KEY
const resend = resendApiKeyEnv ? new Resend(resendApiKeyEnv) : null

interface TicketResult {
  ticket_id: string
  conversation_id: string
}

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies })
    
    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, cc, bcc, subject, content, isHtml, fromChannelId } = body

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      )
    }

    // Get user details
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email, full_name')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'Failed to get user details' },
        { status: 400 }
      )
    }

    // Get channel details if fromChannelId is provided
    let fromAddress = `${userData.full_name || userData.email} <noreply@zynlo.com>`
    let channelData = null

    if (fromChannelId) {
      const { data: channel, error: channelError } = await supabase
        .from('channels')
        .select('id, name, email_address, type')
        .eq('id', fromChannelId)
        .eq('type', 'email')
        .eq('is_active', true)
        .single()

      if (!channelError && channel?.email_address) {
        channelData = channel
        fromAddress = `${channel.name} <${channel.email_address}>`
      }
    }

    // Find or create customer
    let customerId: string | null = null
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id')
      .eq('email', to.toLowerCase())
      .single()

    if (existingCustomer) {
      customerId = existingCustomer.id
    } else {
      // Create new customer
      const { data: newCustomer, error: customerError } = await supabase
        .from('customers')
        .insert({
          email: to.toLowerCase(),
          name: to.split('@')[0], // Use email prefix as fallback name
        })
        .select('id')
        .single()

      if (customerError) {
        console.error('Failed to create customer:', customerError)
      } else {
        customerId = newCustomer.id
      }
    }

    // Prepare email options object once
    const emailOptions: any = {
      from: fromAddress,
      to: [to],
      subject,
      html: isHtml ? content : undefined,
      text: !isHtml ? content : undefined,
    }

    if (cc) emailOptions.cc = cc.split(',').map((e: string) => e.trim())
    if (bcc) emailOptions.bcc = bcc.split(',').map((e: string) => e.trim())

    let emailId: string | undefined

    if (resend) {
      // Use Resend when key is available
      const { data: emailResult, error: emailError } = await resend.emails.send(emailOptions)

      if (emailError) {
        console.error('Failed to send email via Resend:', emailError)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }

      emailId = emailResult?.id
    } else {
      // Fallback to Gmail SMTP (OAuth2)
      try {
        const {
          GMAIL_CLIENT_ID,
          GMAIL_CLIENT_SECRET,
          GMAIL_REFRESH_TOKEN,
          GMAIL_SENDER_EMAIL,
        } = process.env

        if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_SENDER_EMAIL) {
          return NextResponse.json(
            { error: 'Email not configured (no Resend API key or Gmail OAuth credentials)' },
            { status: 500 }
          )
        }

        const { google } = await import('googleapis')
        const { default: nodemailer } = await import('nodemailer')

        const oAuth2Client = new google.auth.OAuth2(GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET)
        oAuth2Client.setCredentials({ refresh_token: GMAIL_REFRESH_TOKEN })

        const { token } = await oAuth2Client.getAccessToken()

        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            type: 'OAuth2',
            user: GMAIL_SENDER_EMAIL,
            clientId: GMAIL_CLIENT_ID,
            clientSecret: GMAIL_CLIENT_SECRET,
            refreshToken: GMAIL_REFRESH_TOKEN,
            accessToken: token as string,
          },
        })

        const sendInfo = await transporter.sendMail({
          ...emailOptions,
        })

        emailId = sendInfo.messageId
      } catch (smtpError) {
        console.error('Failed to send email via Gmail SMTP:', smtpError)
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    }

    // Create ticket and conversation in database
    const { data: ticketResult, error: ticketError } = await supabase
      .rpc('create_ticket_with_message', {
        p_subject: subject,
        p_content: content,
        p_customer_email: to.toLowerCase(),
        p_customer_name: to.split('@')[0],
        p_channel: 'email',
        p_priority: 'normal',
        p_metadata: {
          email_id: emailId,
          sent_by: user.id,
          channel_id: fromChannelId,
          channel_name: channelData?.name,
          from_address: fromAddress,
          cc,
          bcc,
          is_outbound: true
        }
      })

    if (ticketError) {
      console.error('Failed to create ticket:', ticketError)
      // Email was sent successfully, but we couldn't create the ticket
      // Log this for manual handling
    }

    // Type the result correctly
    const typedTicketResult = ticketResult as TicketResult | null

    // Add outbound message to the conversation
    if (typedTicketResult?.ticket_id && typedTicketResult?.conversation_id) {
      await supabase
        .from('messages')
        .insert({
          conversation_id: typedTicketResult.conversation_id,
          content,
          content_type: isHtml ? 'text/html' : 'text/plain',
          sender_type: 'agent',
          sender_id: user.id,
          sender_name: userData.full_name || userData.email,
          metadata: {
            email_id: emailId,
            channel_id: fromChannelId,
            channel_name: channelData?.name,
            from_address: fromAddress,
            cc,
            bcc,
            is_outbound: true
          }
        })
    }

    return NextResponse.json({
      success: true,
      emailId: emailId,
      ticketId: typedTicketResult?.ticket_id,
      fromChannel: channelData?.name,
      fromAddress,
      message: 'Email sent successfully'
    })

  } catch (error) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 