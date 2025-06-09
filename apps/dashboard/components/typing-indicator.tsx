'use client'

import { useEffect, useState } from 'react'
import { useTypingIndicator } from '@zynlo/supabase'

interface TypingIndicatorProps {
  ticketId: string
  className?: string
}

export function TypingIndicator({ ticketId, className }: TypingIndicatorProps) {
  const { typingUsers } = useTypingIndicator(ticketId)
  const [displayUsers, setDisplayUsers] = useState<string[]>([])

  useEffect(() => {
    const activeTypingUsers = Array.from(typingUsers.values())
      .filter(indicator => {
        const now = new Date()
        return new Date(indicator.expires_at) > now
      })
      .map(indicator => indicator.user_id)

    setDisplayUsers(activeTypingUsers)
  }, [typingUsers])

  if (displayUsers.length === 0) {
    return null
  }

  const getMessage = () => {
    const count = displayUsers.length
    if (count === 1) {
      return '1 persoon is aan het typen...'
    } else if (count === 2) {
      return '2 personen zijn aan het typen...'
    } else {
      return `${count} personen zijn aan het typen...`
    }
  }

  return (
    <div className={`flex items-center space-x-2 text-sm text-gray-500 ${className}`}>
      <div className="flex space-x-1">
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
        <div className="w-1 h-1 bg-gray-400 rounded-full animate-bounce"></div>
      </div>
      <span>{getMessage()}</span>
    </div>
  )
}

// Hook component that manages typing state
interface TypingManagerProps {
  ticketId: string
  children: React.ReactNode
}

export function TypingManager({ ticketId, children }: TypingManagerProps) {
  const { sendTypingIndicator } = useTypingIndicator(ticketId)
  const [isTyping, setIsTyping] = useState(false)
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null)

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true)
      sendTypingIndicator(true)
    }

    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }

    // Set new timeout to stop typing after 3 seconds
    const timeout = setTimeout(() => {
      setIsTyping(false)
      sendTypingIndicator(false)
    }, 3000)

    setTypingTimeout(timeout)
  }

  const handleStopTyping = () => {
    if (isTyping) {
      setIsTyping(false)
      sendTypingIndicator(false)
    }
    if (typingTimeout) {
      clearTimeout(typingTimeout)
    }
  }

  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout)
      }
      if (isTyping) {
        sendTypingIndicator(false)
      }
    }
  }, [])

  return (
    <div onKeyDown={handleTyping} onBlur={handleStopTyping}>
      {children}
    </div>
  )
} 