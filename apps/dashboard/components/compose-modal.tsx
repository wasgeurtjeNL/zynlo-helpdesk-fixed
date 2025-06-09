'use client'

import { useState, useRef } from 'react'
import { X, Paperclip, Image, Send, Bold, Italic, Underline, List, Link as LinkIcon, Type } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@zynlo/supabase'

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
  const contentRef = useRef<HTMLDivElement>(null)
  const { user } = useUser()

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
        isHtml: true
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
    document.execCommand(command, false, value)
    contentRef.current?.focus()
  }

  if (!isOpen) return null

  const fromAddress = `${user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Support'} <${user?.email || 'support@zynlo.com'}>`

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
          {/* From field */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">Van:</label>
            <div className="flex-1">
              <span className="text-sm text-gray-600">{fromAddress}</span>
            </div>
          </div>

          {/* To field */}
          <div className="flex items-center space-x-3">
            <label className="text-sm font-medium text-gray-700 w-16">Aan:</label>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Email adres"
              autoFocus
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email adres"
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
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Email adres"
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
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Onderwerp"
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Toolbar */}
          <div className="px-6 py-3 border-b border-gray-200 flex items-center space-x-1">
            <button
              onClick={() => applyFormat('bold')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('italic')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('underline')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <button
              onClick={() => applyFormat('insertUnorderedList')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Bullet list"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => applyFormat('insertOrderedList')}
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Numbered list"
            >
              <Type className="h-4 w-4" />
            </button>
            <div className="h-6 w-px bg-gray-300 mx-2" />
            <button
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Attach file"
            >
              <Paperclip className="h-4 w-4" />
            </button>
            <button
              className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              title="Insert image"
            >
              <Image className="h-4 w-4" />
            </button>
          </div>

          {/* Text Editor */}
          <div className="flex-1 px-6 py-4">
            <div
              ref={contentRef}
              contentEditable
              onInput={(e) => setContent((e.target as HTMLDivElement).innerHTML)}
              className="w-full h-full min-h-[300px] p-4 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              style={{ whiteSpace: 'pre-wrap' }}
              dangerouslySetInnerHTML={{ __html: content }}
              data-placeholder="Typ hier uw bericht..."
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