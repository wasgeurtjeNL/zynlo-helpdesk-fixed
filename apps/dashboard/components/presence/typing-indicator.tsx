'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { TypingIndicator as TypingIndicatorType } from '@zynlo/supabase'

interface TypingIndicatorProps {
  typingUsers: Map<string, TypingIndicatorType>
  users?: Array<{ id: string; full_name: string; email: string }>
  className?: string
}

export function TypingIndicator({
  typingUsers,
  users = [],
  className
}: TypingIndicatorProps) {
  const [dots, setDots] = useState('.')

  useEffect(() => {
    if (typingUsers.size === 0) return

    const interval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '.'
        return prev + '.'
      })
    }, 500)

    return () => clearInterval(interval)
  }, [typingUsers.size])

  if (typingUsers.size === 0) return null

  const typingUsersList = Array.from(typingUsers.keys())
    .map(userId => users.find(u => u.id === userId))
    .filter(Boolean)

  const displayText = (() => {
    if (typingUsersList.length === 0) return 'Someone is typing'
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0]?.full_name || 'Someone'} is typing`
    }
    if (typingUsersList.length === 2) {
      return `${typingUsersList[0]?.full_name} and ${typingUsersList[1]?.full_name} are typing`
    }
    return `${typingUsersList[0]?.full_name} and ${typingUsersList.length - 1} others are typing`
  })()

  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground', className)}>
      <div className="flex items-center gap-1">
        <span>{displayText}</span>
        <span className="w-4">{dots}</span>
      </div>
      <div className="flex gap-1">
        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]" />
        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]" />
        <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" />
      </div>
    </div>
  )
} 