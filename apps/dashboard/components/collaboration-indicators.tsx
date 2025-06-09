'use client'

import { useState, useEffect } from 'react'
import { 
  useTypingIndicators, 
  useRealtimeTypingIndicators,
  type TypingIndicator 
} from '@zynlo/supabase'
import { AlertTriangle, RefreshCw, X, Users, Edit3, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface TypingIndicatorsProps {
  ticketId: string
  currentUserId?: string
  className?: string
}

export function TypingIndicators({ 
  ticketId, 
  currentUserId, 
  className 
}: TypingIndicatorsProps) {
  const { data: typingUsers = [] } = useTypingIndicators(ticketId)
  useRealtimeTypingIndicators(ticketId)

  // Filter out current user
  const otherTypingUsers = typingUsers.filter(user => user.user_id !== currentUserId)

  if (otherTypingUsers.length === 0) return null

  const formatTypingMessage = (users: TypingIndicator[]) => {
    if (users.length === 1) {
      return `${users[0].user_name} is aan het typen...`
    } else if (users.length === 2) {
      return `${users[0].user_name} en ${users[1].user_name} zijn aan het typen...`
    } else {
      return `${users[0].user_name} en ${users.length - 1} anderen zijn aan het typen...`
    }
  }

  return (
    <div className={cn(
      'flex items-center space-x-2 p-2 bg-blue-50 border border-blue-200 rounded-md text-sm',
      className
    )}>
      <div className="flex items-center space-x-1">
        <Edit3 className="w-4 h-4 text-blue-600" />
        <div className="flex space-x-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse"
              style={{ 
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1s'
              }}
            />
          ))}
        </div>
      </div>
      <span className="text-blue-700">
        {formatTypingMessage(otherTypingUsers)}
      </span>
    </div>
  )
}

interface CollisionWarningProps {
  isVisible: boolean
  conflictDetails: {
    currentVersion: number
    expectedVersion: number
    lastUpdated?: string
    updatedBy?: string
  }
  onRetry: () => void
  onCancel: () => void
  onRefresh: () => void
  className?: string
}

export function CollisionWarning({
  isVisible,
  conflictDetails,
  onRetry,
  onCancel,
  onRefresh,
  className
}: CollisionWarningProps) {
  const [isRetrying, setIsRetrying] = useState(false)

  const handleRetry = async () => {
    setIsRetrying(true)
    try {
      await onRetry()
      toast.success('Wijzigingen succesvol opgeslagen')
    } catch (error) {
      toast.error('Fout bij opslaan van wijzigingen')
    } finally {
      setIsRetrying(false)
    }
  }

  const handleRefresh = () => {
    onRefresh()
    toast.info('Pagina ververst met laatste wijzigingen')
  }

  if (!isVisible) return null

  return (
    <div className={cn(
      'fixed inset-x-4 top-4 z-50 mx-auto max-w-2xl',
      'bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg',
      'animate-in slide-in-from-top duration-300',
      className
    )}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-yellow-800">
              Conflict gedetecteerd
            </h3>
            <div className="mt-1 text-sm text-yellow-700">
              <p>
                Dit ticket is gewijzigd door een andere agent terwijl je aan het bewerken was.
              </p>
              {conflictDetails.updatedBy && (
                <p className="mt-1">
                  <span className="font-medium">Laatst gewijzigd door:</span> {conflictDetails.updatedBy}
                </p>
              )}
              <div className="mt-2 text-xs">
                <span className="font-medium">Jouw versie:</span> {conflictDetails.expectedVersion} → 
                <span className="font-medium ml-2">Huidige versie:</span> {conflictDetails.currentVersion}
              </div>
            </div>
          </div>

          <button
            onClick={onCancel}
            className="flex-shrink-0 p-1 text-yellow-400 hover:text-yellow-600 rounded-md hover:bg-yellow-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions */}
        <div className="mt-4 flex items-center space-x-3">
          <button
            onClick={handleRefresh}
            className="flex items-center space-x-2 px-3 py-2 text-sm bg-white border border-yellow-300 text-yellow-700 rounded-md hover:bg-yellow-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Verversen</span>
          </button>

          <button
            onClick={handleRetry}
            disabled={isRetrying}
            className={cn(
              'flex items-center space-x-2 px-3 py-2 text-sm bg-yellow-600 text-white rounded-md transition-colors',
              isRetrying 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-yellow-700'
            )}
          >
            {isRetrying ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Users className="w-4 h-4" />
            )}
            <span>{isRetrying ? 'Bezig...' : 'Opnieuw proberen'}</span>
          </button>

          <button
            onClick={onCancel}
            className="text-sm text-yellow-600 hover:text-yellow-800 transition-colors"
          >
            Annuleren
          </button>
        </div>

        {/* Help text */}
        <div className="mt-3 text-xs text-yellow-600 bg-yellow-100 rounded p-2">
          <p><span className="font-medium">Tip:</span> Klik op "Verversen" om de laatste wijzigingen te laden, of "Opnieuw proberen" om je wijzigingen te behouden.</p>
        </div>
      </div>
    </div>
  )
}

// Combined collaboration awareness component
interface CollaborationAwarenessProps {
  ticketId: string
  currentUserId?: string
  showTypingIndicators?: boolean
  className?: string
}

export function CollaborationAwareness({ 
  ticketId, 
  currentUserId,
  showTypingIndicators = true,
  className 
}: CollaborationAwarenessProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {showTypingIndicators && (
        <TypingIndicators 
          ticketId={ticketId} 
          currentUserId={currentUserId}
        />
      )}
    </div>
  )
}

// Hook for managing typing indicators with input elements
export function useTypingAwareness(ticketId: string, debounceMs = 2000) {
  const [isTyping, setIsTyping] = useState(false)
  const typingTimeoutRef = useRef<NodeJS.Timeout>()

  const startTyping = useCallback(async () => {
    if (!isTyping) {
      setIsTyping(true)
      try {
        await fetch('/api/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, isTyping: true })
        })
      } catch (error) {
        console.error('Error setting typing indicator:', error)
      }
    }

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to clear typing indicator
    typingTimeoutRef.current = setTimeout(async () => {
      setIsTyping(false)
      try {
        await fetch('/api/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, isTyping: false })
        })
      } catch (error) {
        console.error('Error clearing typing indicator:', error)
      }
    }, debounceMs)
  }, [ticketId, isTyping, debounceMs])

  const stopTyping = useCallback(async () => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (isTyping) {
      setIsTyping(false)
      try {
        await fetch('/api/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, isTyping: false })
        })
      } catch (error) {
        console.error('Error clearing typing indicator:', error)
      }
    }
  }, [ticketId, isTyping])

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTyping) {
        fetch('/api/typing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticketId, isTyping: false })
        }).catch(console.error)
      }
    }
  }, [ticketId, isTyping])

  return {
    startTyping,
    stopTyping,
    isTyping
  }
} 