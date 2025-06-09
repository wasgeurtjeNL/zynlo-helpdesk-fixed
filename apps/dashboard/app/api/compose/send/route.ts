import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import type { Database } from '@zynlo/supabase'

const resend = new Resend(process.env.RESEND_API_KEY)

interface TicketResult {
  ticket_id: string
  conversation_id: string
}

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
    const { to, cc, bcc, subject, content, isHtml } = body

    if (!to || !subject || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, content' },
        { status: 400 }
      )
    }

    // Get user details for from address
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

    // Send email via Resend
    const emailOptions: any = {
      from: `${userData.full_name || userData.email} <noreply@zynlo.com>`,
      to: [to],
      subject,
      html: isHtml ? content : undefined,
      text: !isHtml ? content : undefined,
    }

    if (cc) {
      emailOptions.cc = cc.split(',').map((email: string) => email.trim())
    }
    if (bcc) {
      emailOptions.bcc = bcc.split(',').map((email: string) => email.trim())
    }

    const { data: emailResult, error: emailError } = await resend.emails.send(emailOptions)

    if (emailError) {
      console.error('Failed to send email:', emailError)
      return NextResponse.json(
        { error: 'Failed to send email' },
        { status: 500 }
      )
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
          email_id: emailResult?.id,
          sent_by: user.id,
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
            email_id: emailResult?.id,
            cc,
            bcc,
            is_outbound: true
          }
        })
    }

    return NextResponse.json({
      success: true,
      emailId: emailResult?.id,
      ticketId: typedTicketResult?.ticket_id,
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