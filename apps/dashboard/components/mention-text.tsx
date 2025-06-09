'use client'

import { highlightMentions } from '@zynlo/supabase'
import { cn } from '@/lib/utils'

interface MentionTextProps {
  text: string
  className?: string
  mentionClassName?: string
}

export function MentionText({ 
  text, 
  className,
  mentionClassName = 'bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium'
}: MentionTextProps) {
  const highlightedText = highlightMentions(text, mentionClassName)

  return (
    <div 
      className={cn('whitespace-pre-wrap', className)}
      dangerouslySetInnerHTML={{ __html: highlightedText }}
    />
  )
}

// Component for inline mention text (single line)
export function InlineMentionText({ 
  text, 
  className,
  mentionClassName = 'bg-blue-100 text-blue-800 px-1 py-0.5 rounded font-medium'
}: MentionTextProps) {
  const highlightedText = highlightMentions(text, mentionClassName)

  return (
    <span 
      className={cn('whitespace-nowrap', className)}
      dangerouslySetInnerHTML={{ __html: highlightedText }}
    />
  )
} 