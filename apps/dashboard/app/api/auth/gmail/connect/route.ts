import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const channelName = searchParams.get('channelName')
  const userId = searchParams.get('userId')
  
  console.log('Gmail OAuth connect requested:', { channelName, userId })
  
  // TODO: Implement Gmail OAuth flow
  // For now, redirect back with a message
  return NextResponse.redirect(
    new URL('/kanalen/email?message=OAuth+nog+niet+geïmplementeerd', request.url)
  )
} 