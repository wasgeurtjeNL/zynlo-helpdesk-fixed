'use client'

import { useTypingIndicators, useRealtimeTypingIndicators } from '@zynlo/supabase'
import { Edit3 } from 'lucide-react'
import { cn } from '@/lib/utils'

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

  const formatMessage = () => {
    if (otherTypingUsers.length === 1) {
      return `${otherTypingUsers[0].user_name} is aan het typen...`
    } else if (otherTypingUsers.length === 2) {
      return `${otherTypingUsers[0].user_name} en ${otherTypingUsers[1].user_name} zijn aan het typen...`
    } else {
      return `${otherTypingUsers[0].user_name} en ${otherTypingUsers.length - 1} anderen zijn aan het typen...`
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
        {formatMessage()}
      </span>
    </div>
  )
} 