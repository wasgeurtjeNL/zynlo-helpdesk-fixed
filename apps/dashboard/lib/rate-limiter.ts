/**
 * Simple in-memory rate limiter for development
 * In production, use Redis or Upstash
 */

interface RateLimitEntry {
  count: number
  resetAt: number
}

class InMemoryRateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map()
  
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async check(identifier: string): Promise<{ 
    success: boolean
    remaining: number
    reset: number
  }> {
    const now = Date.now()
    const entry = this.limits.get(identifier)

    // If no entry or window expired, create new entry
    if (!entry || now > entry.resetAt) {
      this.limits.set(identifier, {
        count: 1,
        resetAt: now + this.windowMs
      })
      
      return {
        success: true,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs
      }
    }

    // Check if limit exceeded
    if (entry.count >= this.maxRequests) {
      return {
        success: false,
        remaining: 0,
        reset: entry.resetAt
      }
    }

    // Increment count
    entry.count++
    
    return {
      success: true,
      remaining: this.maxRequests - entry.count,
      reset: entry.resetAt
    }
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now()
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetAt) {
        this.limits.delete(key)
      }
    }
  }
}

// Rate limiter instances
export const loginRateLimiter = new InMemoryRateLimiter(
  5, // 5 attempts
  15 * 60 * 1000 // 15 minutes
)

export const ticketCreationRateLimiter = new InMemoryRateLimiter(
  50, // 50 tickets
  60 * 60 * 1000 // 1 hour
)

export const apiRateLimiter = new InMemoryRateLimiter(
  1000, // 1000 requests
  60 * 60 * 1000 // 1 hour
)

export const unauthenticatedApiRateLimiter = new InMemoryRateLimiter(
  100, // 100 requests
  60 * 60 * 1000 // 1 hour
)

// Cleanup old entries every 5 minutes
if (typeof window === 'undefined') {
  setInterval(() => {
    loginRateLimiter.cleanup()
    ticketCreationRateLimiter.cleanup()
    apiRateLimiter.cleanup()
    unauthenticatedApiRateLimiter.cleanup()
  }, 5 * 60 * 1000)
}

// Helper to get client IP
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback to a default if no IP found
  return 'unknown'
}

// Rate limit response helper
export function rateLimitResponse(reset: number) {
  return new Response(
    JSON.stringify({
      error: 'Too many requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((reset - Date.now()) / 1000)
    }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'X-RateLimit-Limit': '5',
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': String(Math.floor(reset / 1000)),
        'Retry-After': String(Math.ceil((reset - Date.now()) / 1000))
      }
    }
  )
} 