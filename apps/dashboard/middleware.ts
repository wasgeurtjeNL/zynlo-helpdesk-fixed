import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // For now, just pass through all requests
  // We'll add authentication checks after confirming everything works
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - test-auth (our test page)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|test-auth).*)',
  ],
} 