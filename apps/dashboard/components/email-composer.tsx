'use client'

import { useState, useCallback, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Color } from '@tiptap/extension-color'
import TextStyle from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import { Button } from '@/lib/ui'
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Table as TableIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Send,
  Paperclip,
  Save,
  X,
  Users,
  Eye,
  EyeOff,
  Clock,
  Trash2
} from 'lucide-react'

interface EmailRecipient {
  email: string
  name?: string
}

interface EmailComposerProps {
  // For replies/forwards
  inReplyTo?: {
    messageId: string
    subject: string
    from: EmailRecipient
    date: Date
    content: string
    references?: string[]
  }
  mode?: 'compose' | 'reply' | 'reply-all' | 'forward'
  
  // Recipients
  defaultTo?: EmailRecipient[]
  defaultCc?: EmailRecipient[]
  defaultBcc?: EmailRecipient[]
  defaultSubject?: string
  
  // Callbacks
  onSend: (email: EmailData) => Promise<void>
  onSaveDraft?: (draft: EmailDraft) => Promise<void>
  onCancel?: () => void
  
  // Settings
  signature?: string
  channelId?: string
  fromAddress?: EmailRecipient
}

export interface EmailData {
  to: EmailRecipient[]
  cc: EmailRecipient[]
  bcc: EmailRecipient[]
  subject: string
  html: string
  text: string
  attachments: File[]
  inReplyTo?: string
  references?: string[]
  scheduledAt?: Date
}

export interface EmailDraft extends EmailData {
  id?: string
  savedAt: Date
}

export function EmailComposer({
  inReplyTo,
  mode = 'compose',
  defaultTo = [],
  defaultCc = [],
  defaultBcc = [],
  defaultSubject = '',
  onSend,
  onSaveDraft,
  onCancel,
  signature,
  channelId,
  fromAddress
}: EmailComposerProps) {
  // Recipients state
  const [to, setTo] = useState<EmailRecipient[]>(defaultTo)
  const [cc, setCc] = useState<EmailRecipient[]>(defaultCc)
  const [bcc, setBcc] = useState<EmailRecipient[]>(defaultBcc)
  const [showCc, setShowCc] = useState(defaultCc.length > 0)
  const [showBcc, setShowBcc] = useState(defaultBcc.length > 0)
  
  // Email state
  const [subject, setSubject] = useState(defaultSubject)
  const [attachments, setAttachments] = useState<File[]>([])
  const [sending, setSending] = useState(false)
  const [savingDraft, setSavingDraft] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Schedule state
  const [showSchedule, setShowSchedule] = useState(false)
  const [scheduledAt, setScheduledAt] = useState<Date | null>(null)

  // Initialize subject for replies/forwards
  useEffect(() => {
    if (inReplyTo && mode !== 'compose') {
      let prefix = ''
      if (mode === 'reply' || mode === 'reply-all') {
        prefix = 'Re: '
      } else if (mode === 'forward') {
        prefix = 'Fwd: '
      }
      
      // Only add prefix if not already present
      const cleanSubject = inReplyTo.subject.replace(/^(Re:|Fwd:|Fw:)\s*/i, '').trim()
      setSubject(prefix + cleanSubject)
      
      // Set recipients for reply modes
      if (mode === 'reply') {
        setTo([inReplyTo.from])
      } else if (mode === 'reply-all') {
        // TODO: Include all original recipients except self
        setTo([inReplyTo.from])
      }
    }
  }, [inReplyTo, mode])

  // Initialize TipTap editor
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3]
        }
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer'
        }
      }),
      Image,
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
      Color,
      TextStyle,
      FontFamily
    ],
    content: '',
    onUpdate: ({ editor }) => {
      // Auto-save draft after changes
      if (onSaveDraft) {
        saveDraftDebounced()
      }
    }
  })

  // Initialize editor content
  useEffect(() => {
    if (!editor) return
    
    let content = ''
    
    // Add quoted content for replies/forwards
    if (inReplyTo && mode !== 'compose') {
      if (mode === 'forward') {
        content = `<br><br>
        <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
          <p>---------- Forwarded message ----------</p>
          <p>From: ${inReplyTo.from.name || inReplyTo.from.email}</p>
          <p>Date: ${inReplyTo.date.toLocaleString()}</p>
          <p>Subject: ${inReplyTo.subject}</p>
          <br>
          ${inReplyTo.content}
        </div>`
      } else {
        // Reply mode - quote original message
        content = `<br><br>
        <div style="border-left: 2px solid #ccc; padding-left: 10px; margin-left: 10px;">
          <p>On ${inReplyTo.date.toLocaleString()}, ${inReplyTo.from.name || inReplyTo.from.email} wrote:</p>
          ${inReplyTo.content}
        </div>`
      }
    }
    
    // Add signature if available
    if (signature) {
      content = `<br><br>${signature}${content}`
    }
    
    editor.commands.setContent(content)
  }, [editor, inReplyTo, mode, signature])

  // Auto-save draft functionality
  const saveDraftDebounced = useCallback(
    debounce(async () => {
      if (!onSaveDraft || !editor) return
      
      setSavingDraft(true)
      try {
        const draft: EmailDraft = {
          to,
          cc,
          bcc,
          subject,
          html: editor.getHTML(),
          text: editor.getText(),
          attachments,
          inReplyTo: inReplyTo?.messageId,
          references: inReplyTo?.references,
          scheduledAt: scheduledAt || undefined,
          savedAt: new Date()
        }
        
        await onSaveDraft(draft)
        setLastSaved(new Date())
      } catch (error) {
        console.error('Failed to save draft:', error)
      } finally {
        setSavingDraft(false)
      }
    }, 2000),
    [to, cc, bcc, subject, attachments, scheduledAt, editor, onSaveDraft]
  )

  // Handle file attachments
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Handle sending
  const handleSend = async () => {
    if (!editor || to.length === 0 || !subject.trim()) {
      alert('Please fill in required fields')
      return
    }
    
    setSending(true)
    try {
      const emailData: EmailData = {
        to,
        cc,
        bcc,
        subject,
        html: editor.getHTML(),
        text: editor.getText(),
        attachments,
        inReplyTo: inReplyTo?.messageId,
        references: inReplyTo?.references,
        scheduledAt: scheduledAt || undefined
      }
      
      await onSend(emailData)
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send email')
    } finally {
      setSending(false)
    }
  }

  // Toolbar button component
  const ToolbarButton = ({ 
    onClick, 
    active = false, 
    disabled = false,
    children,
    title 
  }: {
    onClick: () => void
    active?: boolean
    disabled?: boolean
    children: React.ReactNode
    title: string
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`p-2 rounded transition-colors ${
        active 
          ? 'bg-blue-100 text-blue-600' 
          : 'hover:bg-gray-100 text-gray-700'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  )

  if (!editor) return null

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-sm border">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">
          {mode === 'compose' && 'New Email'}
          {mode === 'reply' && 'Reply'}
          {mode === 'reply-all' && 'Reply All'}
          {mode === 'forward' && 'Forward'}
        </h2>
        <div className="flex items-center gap-2">
          {lastSaved && (
            <span className="text-sm text-gray-500">
              Saved {lastSaved.toLocaleTimeString()}
            </span>
          )}
          {savingDraft && (
            <span className="text-sm text-gray-500">Saving...</span>
          )}
          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Recipients */}
      <div className="p-4 space-y-2 border-b">
        {/* From */}
        {fromAddress && (
          <div className="flex items-center gap-2">
            <label className="w-16 text-sm text-gray-600">From:</label>
            <div className="flex-1 text-sm">
              {fromAddress.name ? `${fromAddress.name} <${fromAddress.email}>` : fromAddress.email}
            </div>
          </div>
        )}

        {/* To */}
        <div className="flex items-center gap-2">
          <label className="w-16 text-sm text-gray-600">To:</label>
          <RecipientInput
            recipients={to}
            onChange={setTo}
            placeholder="Add recipients..."
          />
          <div className="flex gap-1">
            <button
              onClick={() => setShowCc(!showCc)}
              className={`text-sm px-2 py-1 rounded ${showCc ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            >
              Cc
            </button>
            <button
              onClick={() => setShowBcc(!showBcc)}
              className={`text-sm px-2 py-1 rounded ${showBcc ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            >
              Bcc
            </button>
          </div>
        </div>

        {/* CC */}
        {showCc && (
          <div className="flex items-center gap-2">
            <label className="w-16 text-sm text-gray-600">Cc:</label>
            <RecipientInput
              recipients={cc}
              onChange={setCc}
              placeholder="Add CC recipients..."
            />
          </div>
        )}

        {/* BCC */}
        {showBcc && (
          <div className="flex items-center gap-2">
            <label className="w-16 text-sm text-gray-600">Bcc:</label>
            <RecipientInput
              recipients={bcc}
              onChange={setBcc}
              placeholder="Add BCC recipients..."
            />
          </div>
        )}

        {/* Subject */}
        <div className="flex items-center gap-2">
          <label className="w-16 text-sm text-gray-600">Subject:</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="flex-1 px-3 py-1.5 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Email subject..."
          />
        </div>
      </div>

      {/* Editor Toolbar */}
      <div className="flex items-center gap-1 p-2 border-b flex-wrap">
        <div className="flex items-center gap-1 pr-2 border-r">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBold().run()}
            active={editor.isActive('bold')}
            title="Bold"
          >
            <Bold className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleItalic().run()}
            active={editor.isActive('italic')}
            title="Italic"
          >
            <Italic className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            active={editor.isActive('underline')}
            title="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 px-2 border-r">
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            active={editor.isActive('bulletList')}
            title="Bullet List"
          >
            <List className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            active={editor.isActive('orderedList')}
            title="Numbered List"
          >
            <ListOrdered className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            active={editor.isActive('blockquote')}
            title="Quote"
          >
            <Quote className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 px-2 border-r">
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            active={editor.isActive({ textAlign: 'left' })}
            title="Align Left"
          >
            <AlignLeft className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            active={editor.isActive({ textAlign: 'center' })}
            title="Align Center"
          >
            <AlignCenter className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            active={editor.isActive({ textAlign: 'right' })}
            title="Align Right"
          >
            <AlignRight className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 px-2">
          <ToolbarButton
            onClick={() => {
              const url = window.prompt('URL:')
              if (url) {
                editor.chain().focus().setLink({ href: url }).run()
              }
            }}
            active={editor.isActive('link')}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => {
              const url = window.prompt('Image URL:')
              if (url) {
                editor.chain().focus().setImage({ src: url }).run()
              }
            }}
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3 }).run()}
            title="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </ToolbarButton>
        </div>

        <div className="flex items-center gap-1 px-2 ml-auto">
          <ToolbarButton
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="Undo"
          >
            <Undo className="h-4 w-4" />
          </ToolbarButton>
          <ToolbarButton
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="Redo"
          >
            <Redo className="h-4 w-4" />
          </ToolbarButton>
        </div>
      </div>

      {/* Editor Content */}
      <div className="flex-1 overflow-auto">
        <EditorContent 
          editor={editor} 
          className="prose prose-sm max-w-none p-4 focus:outline-none min-h-[300px]"
        />
      </div>

      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="p-4 border-t bg-gray-50">
          <div className="text-sm font-medium text-gray-700 mb-2">
            Attachments ({attachments.length})
          </div>
          <div className="space-y-1">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                <div className="flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">{file.name}</span>
                  <span className="text-xs text-gray-500">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                </div>
                <button
                  onClick={() => removeAttachment(index)}
                  className="text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer Actions */}
      <div className="flex items-center justify-between p-4 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button variant="outline" size="sm" as="span">
              <Paperclip className="h-4 w-4 mr-2" />
              Attach
            </Button>
          </label>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSchedule(!showSchedule)}
          >
            <Clock className="h-4 w-4 mr-2" />
            Schedule
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {onSaveDraft && (
            <Button
              variant="outline"
              onClick={() => saveDraftDebounced()}
              disabled={savingDraft}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Draft
            </Button>
          )}
          
          <Button
            onClick={handleSend}
            disabled={sending || to.length === 0 || !subject.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            {scheduledAt ? 'Schedule Send' : 'Send'}
          </Button>
        </div>
      </div>

      {/* Schedule Modal */}
      {showSchedule && (
        <div className="absolute bottom-20 right-4 p-4 bg-white rounded-lg shadow-lg border">
          <div className="text-sm font-medium mb-2">Schedule Email</div>
          <input
            type="datetime-local"
            value={scheduledAt ? scheduledAt.toISOString().slice(0, 16) : ''}
            onChange={(e) => setScheduledAt(e.target.value ? new Date(e.target.value) : null)}
            className="px-3 py-2 border rounded-md"
          />
          <div className="mt-2 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setScheduledAt(null)
                setShowSchedule(false)
              }}
            >
              Clear
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSchedule(false)}
            >
              Done
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

// Recipient Input Component
function RecipientInput({
  recipients,
  onChange,
  placeholder
}: {
  recipients: EmailRecipient[]
  onChange: (recipients: EmailRecipient[]) => void
  placeholder: string
}) {
  const [input, setInput] = useState('')

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addRecipient()
    } else if (e.key === 'Backspace' && input === '' && recipients.length > 0) {
      // Remove last recipient
      onChange(recipients.slice(0, -1))
    }
  }

  const addRecipient = () => {
    const email = input.trim()
    if (email && isValidEmail(email)) {
      onChange([...recipients, { email }])
      setInput('')
    }
  }

  const removeRecipient = (index: number) => {
    onChange(recipients.filter((_, i) => i !== index))
  }

  return (
    <div className="flex-1 flex flex-wrap items-center gap-1 px-3 py-1.5 border rounded-md focus-within:ring-2 focus-within:ring-blue-500">
      {recipients.map((recipient, index) => (
        <span
          key={index}
          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm"
        >
          {recipient.name || recipient.email}
          <button
            onClick={() => removeRecipient(index)}
            className="hover:text-blue-900"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}
      <input
        type="email"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addRecipient}
        placeholder={recipients.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[200px] outline-none text-sm"
      />
    </div>
  )
}

// Utility functions
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
} 