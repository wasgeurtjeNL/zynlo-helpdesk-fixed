'use client'

import { useState, useRef, useCallback } from 'react'
import { useMentionSearch, type MentionUser } from '@zynlo/supabase'
import { User, AtSign } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MentionAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onMentionSelect?: (user: MentionUser, mentionText: string) => void
  className?: string
  placeholder?: string
  disabled?: boolean
}

export function MentionAutocomplete({
  value,
  onChange,
  onMentionSelect,
  className,
  placeholder,
  disabled
}: MentionAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState({ start: 0, end: 0 })
  const [selectedIndex, setSelectedIndex] = useState(0)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Search for users when there's a mention query
  const { data: users = [] } = useMentionSearch(mentionQuery, mentionQuery.length >= 1)

  // Create mention suggestions
  const suggestions = users.map(user => ({
    user,
    mentionText: `@${user.username}`
  }))

  // Handle cursor position changes
  const handleSelectionChange = useCallback(() => {
    if (!textareaRef.current) return
    
    const cursorPos = textareaRef.current.selectionStart || 0
    const textBeforeCursor = value.substring(0, cursorPos)
    const mentionMatch = textBeforeCursor.match(/@(\w*)$/)

    if (mentionMatch) {
      const query = mentionMatch[1]
      const start = cursorPos - mentionMatch[0].length
      
      setMentionQuery(query)
      setMentionPosition({ start, end: cursorPos })
      setShowSuggestions(true)
      setSelectedIndex(0)
    } else {
      setShowSuggestions(false)
      setMentionQuery('')
    }
  }, [value])

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    onChange(newValue)
    setTimeout(handleSelectionChange, 0)
  }

  // Handle key navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showSuggestions || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case 'Tab':
        e.preventDefault()
        if (suggestions[selectedIndex]) {
          selectMention(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setShowSuggestions(false)
        break
    }
  }

  // Select a mention
  const selectMention = (suggestion: { user: MentionUser; mentionText: string }) => {
    const beforeMention = value.substring(0, mentionPosition.start)
    const afterMention = value.substring(mentionPosition.end)
    const newValue = beforeMention + suggestion.mentionText + ' ' + afterMention

    onChange(newValue)
    setShowSuggestions(false)
    setMentionQuery('')

    // Set cursor position after the mention
    const newCursorPos = mentionPosition.start + suggestion.mentionText.length + 1
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos)
        textareaRef.current.focus()
      }
    }, 0)

    onMentionSelect?.(suggestion.user, suggestion.mentionText)
  }

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onSelect={handleSelectionChange}
        onClick={handleSelectionChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 text-sm border border-gray-300 rounded-md resize-none',
          'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'placeholder:text-gray-400',
          className
        )}
        dir="ltr"
      />

      {/* Mention suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion.user.id}
              onClick={() => selectMention(suggestion)}
              className={cn(
                'flex items-center space-x-3 px-3 py-2 cursor-pointer transition-colors',
                index === selectedIndex 
                  ? 'bg-blue-50 text-blue-900' 
                  : 'hover:bg-gray-50'
              )}
            >
              {/* Avatar */}
              <div className="flex-shrink-0">
                {suggestion.user.avatar_url ? (
                  <img
                    src={suggestion.user.avatar_url}
                    alt={suggestion.user.full_name || suggestion.user.email}
                    className="w-8 h-8 rounded-full"
                  />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>

              {/* User info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {suggestion.user.full_name || suggestion.user.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {suggestion.mentionText}
                </p>
              </div>

              {/* Mention icon */}
              <AtSign className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Hook for easy integration with existing textareas
export function useMentionAutocomplete(
  initialValue = '',
  onMentionSelect?: (user: MentionUser, mentionText: string) => void
) {
  const [value, setValue] = useState(initialValue)

  const MentionTextarea = useCallback(
    ({ className, placeholder, disabled, ...props }: any) => (
      <MentionAutocomplete
        value={value}
        onChange={setValue}
        onMentionSelect={onMentionSelect}
        className={className}
        placeholder={placeholder}
        disabled={disabled}
        {...props}
      />
    ),
    [value, onMentionSelect]
  )

  return {
    value,
    setValue,
    MentionTextarea
  }
} 