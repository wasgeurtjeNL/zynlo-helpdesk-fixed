'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Paperclip, Image, Send, Bold, Italic, Underline, List, Link as LinkIcon, Type, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser, useEmailChannels } from '@zynlo/supabase'

interface ComposeModalProps {
  isOpen: boolean
  onClose: () => void
  onSend?: (data: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    content: string
    isHtml?: boolean
    fromChannelId?: string
  }) => Promise<void>
}

export function ComposeModal({ isOpen, onClose, onSend }: ComposeModalProps) {
  const [to, setTo] = useState('')
  const [cc, setCc] = useState('')
  const [bcc, setBcc] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [selectedChannelId, setSelectedChannelId] = useState<string>('')
  const [showChannelDropdown, setShowChannelDropdown] = useState(false)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const { user } = useUser()
  const { data: emailChannels } = useEmailChannels()

  // Determine currently selected channel; fall back to first channel
  const selectedChannel =
    emailChannels?.find((channel) => channel.id === selectedChannelId) ||
    emailChannels?.[0]

  // If no explicit selection yet but channels exist, set first channel as selected
  useEffect(() => {
    if (emailChannels && emailChannels.length > 0 && !selectedChannelId) {
      setSelectedChannelId(emailChannels[0].id)
    }
  }, [emailChannels, selectedChannelId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (showChannelDropdown && !target.closest('.channel-dropdown')) {
        setShowChannelDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showChannelDropdown])

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !content.trim()) {
      return
    }

    setIsSending(true)
    try {
      await onSend?.({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        content: content.trim(),
        isHtml: false,
        fromChannelId: selectedChannelId
      })
      
      // Reset form
      setTo('')
      setCc('')
      setBcc('')
      setSubject('')
      setContent('')
      setShowCc(false)
      setShowBcc(false)
      onClose()
    } catch (error) {
      console.error('Error sending email:', error)
    } finally {
      setIsSending(false)
    }
  }

  const applyFormat = (command: string, value?: string) => {
    // For textarea, we'll handle formatting differently or disable it
    contentRef.current?.focus()
  }

  if (!isOpen) return null

  const getFromAddress = () => {
    if (selectedChannel?.email_address) {
      return `${selectedChannel.name} <${selectedChannel.email_address}>`
    }
    return `${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Support'} <${user?.email || 'support@wasgeurtje.nl'}>`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Nieuw gesprek</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Email Fields */}
        <div className="px-6 py-4 space-y-3 border-b border-gray-200">
          {/* From field with channel selector */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">Van:</label>
            <div className="flex-1 flex items-center">
              {emailChannels && emailChannels.length > 1 ? (
                <div className="relative channel-dropdown">
                  <button
                    onClick={() => setShowChannelDropdown(!showChannelDropdown)}
                    className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <span>{getFromAddress()}</span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {showChannelDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-80 bg-white border border-gray-300 rounded-md shadow-lg z-10">
                      {emailChannels.map((channel) => (
                        <button
                          key={channel.id}
                          onClick={() => {
                            setSelectedChannelId(channel.id)
                            setShowChannelDropdown(false)
                          }}
                          className={cn(
                            "w-full px-3 py-2 text-left text-sm hover:bg-gray-50 transition-colors",
                            selectedChannelId === channel.id && "bg-blue-50 text-blue-700"
                          )}
                        >
                          {channel.name} &lt;{channel.email_address}&gt;
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-sm text-gray-600">{getFromAddress()}</span>
              )}
            </div>
          </div>

          {/* To field */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">Aan:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ltr-input"
              style={{ direction: 'ltr', textAlign: 'left' }}
              placeholder="Email adres"
              autoFocus
              dir="ltr"
            />
            <div className="flex space-x-2 text-sm">
              <button
                onClick={() => setShowCc(!showCc)}
                className={cn(
                  "text-gray-600 hover:text-gray-800 transition-colors",
                  showCc && "text-blue-600"
                )}
              >
                CC
              </button>
              <button
                onClick={() => setShowBcc(!showBcc)}
                className={cn(
                  "text-gray-600 hover:text-gray-800 transition-colors",
                  showBcc && "text-blue-600"
                )}
              >
                BCC
              </button>
            </div>
          </div>

          {/* CC field */}
          {showCc && (
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 w-16">CC:</label>
              <input
                type="email"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ltr-input"
                style={{ direction: 'ltr', textAlign: 'left' }}
                placeholder="Email adres"
                dir="ltr"
              />
            </div>
          )}

          {/* BCC field */}
          {showBcc && (
            <div className="flex items-center space-x-3">
              <label className="text-sm font-medium text-gray-700 w-16">BCC:</label>
              <input
                type="email"
                value={bcc}
                onChange={(e) => setBcc(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ltr-input"
                style={{ direction: 'ltr', textAlign: 'left' }}
                placeholder="Email adres"
                dir="ltr"
              />
            </div>
          )}

          {/* Subject field */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">Onderwerp:</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ltr-input"
              style={{ direction: 'ltr', textAlign: 'left' }}
              placeholder="Onderwerp"
              dir="ltr"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-center space-x-1">
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Bold (not available in plain text mode)"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Italic (not available in plain text mode)"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Underline (not available in plain text mode)"
            >
              <Underline className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Bullet list (not available in plain text mode)"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Numbered list (not available in plain text mode)"
            >
              <Type className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Attach file (coming soon)"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              disabled
              className="p-2 text-gray-400 cursor-not-allowed rounded transition-colors"
              title="Insert image (coming soon)"
            >
              <Image className="h-4 w-4" />
            </button>
          </div>

          {/* Text Editor */}
          <div className="flex-1 px-6 py-4">
            <textarea
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full h-full min-h-[300px] p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ltr-input"
              style={{ 
                direction: 'ltr',
                textAlign: 'left',
                unicodeBidi: 'normal',
                writingMode: 'horizontal-tb'
              }}
              dir="ltr"
              lang="nl"
              placeholder="Typ hier uw bericht..."
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Met vriendelijke groet,<br />
            {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Support Team'}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
            >
              Annuleren
            </button>
            <button
              onClick={handleSend}
              disabled={isSending || !to.trim() || !subject.trim() || !content.trim()}
              className={cn(
                "flex items-center space-x-2 px-6 py-2 text-sm font-medium rounded-md transition-colors",
                isSending || !to.trim() || !subject.trim() || !content.trim()
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800"
              )}
            >
              <Send className="h-4 w-4" />
              <span>{isSending ? 'Versturen...' : 'Verstuur'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
} 