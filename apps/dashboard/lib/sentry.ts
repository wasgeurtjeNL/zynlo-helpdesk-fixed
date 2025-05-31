import * as Sentry from '@sentry/nextjs'

/**
 * Initialize Sentry for error monitoring
 * Call this in your app's root layout or _app.tsx
 */
export function initSentry() {
  const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN
  
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured. Error monitoring disabled.')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    
    // Environment
    environment: process.env.NODE_ENV,
    
    // Release tracking
    release: process.env.NEXT_PUBLIC_APP_VERSION || 'development',
    
    // Integrations
    integrations: [
      new Sentry.BrowserTracing({
        // Set tracingOrigins to control what URLs are traced
        tracingOrigins: [
          'localhost',
          process.env.NEXT_PUBLIC_APP_URL || '',
          /^\//,
        ],
        // Automatic route change tracking in Next.js
        routingInstrumentation: Sentry.nextRouterInstrumentation(),
      }),
      new Sentry.Replay({
        // Mask all text content, but keep media playback
        maskAllText: true,
        blockAllMedia: false,
      }),
    ],
    
    // Filtering
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException
        
        // Don't send network errors in development
        if (
          process.env.NODE_ENV === 'development' &&
          error instanceof Error &&
          error.message.includes('NetworkError')
        ) {
          return null
        }
        
        // Filter out known third-party errors
        if (error instanceof Error) {
          const message = error.message.toLowerCase()
          if (
            message.includes('non-error promise rejection captured') ||
            message.includes('ResizeObserver loop limit exceeded')
          ) {
            return null
          }
        }
      }
      
      return event
    },
    
    // User context
    initialScope: {
      tags: {
        component: 'helpdesk-dashboard',
      },
    },
  })
}

/**
 * Log a custom error to Sentry
 */
export function logError(
  error: Error | string,
  context?: Record<string, any>
) {
  const errorObj = typeof error === 'string' ? new Error(error) : error
  
  Sentry.captureException(errorObj, {
    contexts: {
      custom: context || {},
    },
  })
}

/**
 * Log a message to Sentry
 */
export function logMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: Record<string, any>
) {
  Sentry.captureMessage(message, {
    level,
    contexts: {
      custom: context || {},
    },
  })
}

/**
 * Set user context for error tracking
 */
export function setUserContext(user: {
  id: string
  email?: string
  username?: string
}) {
  Sentry.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  })
}

/**
 * Clear user context (on logout)
 */
export function clearUserContext() {
  Sentry.setUser(null)
}

/**
 * Track a custom event
 */
export function trackEvent(
  eventName: string,
  data?: Record<string, any>
) {
  Sentry.addBreadcrumb({
    message: eventName,
    category: 'custom',
    level: 'info',
    data,
  })
}

/**
 * Measure performance of an operation
 */
export async function measurePerformance<T>(
  operationName: string,
  operation: () => Promise<T>
): Promise<T> {
  const transaction = Sentry.startTransaction({
    op: 'custom',
    name: operationName,
  })
  
  Sentry.getCurrentHub().getScope()?.setSpan(transaction)
  
  try {
    const result = await operation()
    transaction.setStatus('ok')
    return result
  } catch (error) {
    transaction.setStatus('internal_error')
    throw error
  } finally {
    transaction.finish()
  }
}

/**
 * Error boundary component for React
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>
) {
  return Sentry.withErrorBoundary(Component, {
    fallback,
    showDialog: process.env.NODE_ENV === 'production',
  })
} 