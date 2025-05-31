import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

interface EmailRequest {
  ticketNumber: number
  content: string
  agentName?: string
  agentEmail?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: EmailRequest = await request.json()
    const { ticketNumber, content, agentName, agentEmail } = body
    
    console.log('📧 Email API called with:', { ticketNumber, agentName, agentEmail })
    
    // Validate required fields
    if (!ticketNumber || !content) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: ticketNumber, content' },
        { status: 400 }
      )
    }

    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Supabase configuration missing' },
        { status: 500 }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get ticket details from database
    console.log('🔍 Looking up ticket:', ticketNumber)
    const { data: ticket, error: ticketError } = await supabase
      .from('tickets')
      .select(`
        *,
        customer:customer_id(id, name, email)
      `)
      .eq('number', ticketNumber)
      .single()

    if (ticketError || !ticket) {
      console.error('❌ Ticket lookup error:', ticketError)
      return NextResponse.json(
        { success: false, error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (!ticket.customer?.email) {
      console.error('❌ No customer email found')
      return NextResponse.json(
        { success: false, error: 'Customer email not found' },
        { status: 400 }
      )
    }

    // Prepare email data
    const fromEmail = agentEmail || 'support@wasgeurtje.nl'
    const fromName = agentName || 'Zynlo Support'
    const toEmail = ticket.customer.email
    const customerName = ticket.customer.name || 'Klant'
    const subject = `Re: ${ticket.subject} [Ticket #${ticketNumber}]`

    console.log('📧 Email details:', { from: fromEmail, to: toEmail, subject })

    // Check if Resend API key is configured
    const resendApiKey = process.env.RESEND_API_KEY
    
    if (!resendApiKey) {
      console.log('⚠️ RESEND_API_KEY not configured, returning mock success')
      
      // Return mock success for testing
      return NextResponse.json({
        success: true,
        messageId: `mock-${Date.now()}`,
        message: '✅ MOCK EMAIL: Email would be sent to ' + toEmail,
        mockData: {
          from: `${fromName} <${fromEmail}>`,
          to: toEmail,
          subject: subject,
          content: content
        }
      })
    }

    // Prepare HTML email content
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
          ${content.split('\n').map(line => `<p style="margin: 0 0 10px 0;">${line}</p>`).join('')}
        </div>
        
        <p>Met vriendelijke groet,<br>${fromName}</p>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <div style="font-size: 12px; color: #6b7280; text-align: center;">
          <p>Ticket referentie: #${ticketNumber}</p>
        </div>
      </body>
      </html>
    `

    const textContent = `Hallo ${customerName},\n\n${content}\n\nMet vriendelijke groet,\n${fromName}\n\n---\nTicket #${ticketNumber}`

    // Send email via Resend API
    console.log('📤 Sending email via Resend API...')

    const emailPayload = {
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: subject,
      html: htmlContent,
      text: textContent,
      headers: {
        'X-Ticket-ID': ticket.id,
        'X-Ticket-Number': ticketNumber.toString(),
      },
      tags: [
        { name: 'ticket-id', value: ticket.id },
        { name: 'ticket-number', value: ticketNumber.toString() }
      ]
    }

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailPayload),
    })

    const resendResult = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', resendResult)
      return NextResponse.json({
        success: false,
        error: `Email delivery failed: ${resendResult.message || 'Unknown error'}`
      }, { status: 500 })
    }

    console.log('✅ Email sent successfully via Resend:', resendResult.id)

    return NextResponse.json({
      success: true,
      messageId: resendResult.id,
      message: `✅ Email sent successfully to ${toEmail}`
    })

  } catch (error) {
    console.error('❌ API route error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
} 