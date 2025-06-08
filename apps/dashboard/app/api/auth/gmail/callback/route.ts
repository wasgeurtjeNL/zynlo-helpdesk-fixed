import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const state = searchParams.get('state')
  
  console.log('Gmail OAuth callback received:', { code: !!code, error, state })
  
  if (error) {
    console.error('OAuth error:', error)
    return NextResponse.redirect(
      new URL('/kanalen/email?error=OAuth+gefaald', request.url)
    )
  }
  
  if (code && state) {
    try {
      // Parse the state to get channel info
      const { channelName, userId } = JSON.parse(state)
      console.log('OAuth code received for:', { channelName, userId })
      
      // TODO: Exchange code for tokens and save to database
      // This is where you would:
      // 1. Exchange the code for access/refresh tokens
      // 2. Save the channel with tokens to your database
      // 3. Test the connection
      
      return NextResponse.redirect(
        new URL(`/kanalen/email?success=Gmail+kanaal+'${channelName}'+gekoppeld`, request.url)
      )
    } catch (err) {
      console.error('Error parsing state:', err)
      return NextResponse.redirect(
        new URL('/kanalen/email?error=OAuth+state+ongeldig', request.url)
      )
    }
  }
  
  return NextResponse.redirect(
    new URL('/kanalen/email?error=Geen+geldige+OAuth+data+ontvangen', request.url)
  )
} 