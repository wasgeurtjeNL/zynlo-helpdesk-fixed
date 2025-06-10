'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Send, 
  Paperclip, 
  MoreVertical,
  Clock,
  User,
  Mail,
  Phone,
  Calendar,
  Tag,
  AlertCircle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Hash,
  Star,
  Archive,
  Trash2,
  UserPlus,
  ChevronDown,
  Loader2,
  X,
  Plus,
  CheckSquare,
  Check,
  Reply,
  ReplyAll,
  Forward,
  AtSign,
  Mic,
  Lock,
  Users,
  // New icons for editor toolbar
  Bold,
  Italic,
  Underline,
  Type,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Link,
  Image,
  Code,
  Quote,
  Globe,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MessageContent } from './message-content'
import { 
  useTicket, 
  useSendMessage, 
  useUpdateTicket,
  useDeleteTicket,
  useUsers,
  // useTeams, // Temporarily disabled to prevent team_members table error
  useAuth,
  useTicketLabels,
  useLabels,
  useAssignLabel,
  useRemoveLabel,
  useSendEmailReply,
  useCreateTask,
  type Database,
  // Presence hooks
  usePresence,
  useTypingIndicator,
  useLogActivity,
  // New hooks for drafts, signatures and attachments
  useMessageDraft,
  useSaveMessageDraft,
  useDeleteMessageDraft,
  useUserSignature,
  useUploadAndCreateAttachment,
  useMessageAttachments,
  // Saved replies hooks
  useSavedReplies,
  useIncrementSavedReplyUsage,
  // AI usage hooks
  useCheckAIUsage,
  useRecordAIUsage
} from '@zynlo/supabase'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { useSelectedTicketSafe } from '@/hooks/use-selected-ticket'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { nl } from 'date-fns/locale'
import { showToast } from './toast'
import { createClient } from '@supabase/supabase-js'
import { ActiveUsers } from './presence/active-users'
import { TypingIndicator } from './presence/typing-indicator'

// Animation imports
import { motion, AnimatePresence } from 'framer-motion'

type TicketStatus = Database['public']['Enums']['ticket_status']
type TicketPriority = Database['public']['Enums']['ticket_priority']

type User = Database['public']['Tables']['users']['Row']
type Label = Database['public']['Tables']['labels']['Row']
type Message = Database['public']['Tables']['messages']['Row']
type Customer = Database['public']['Tables']['customers']['Row']

const statusOptions = [
  { value: 'new' as TicketStatus, label: 'Nieuw', icon: AlertCircle, color: 'text-blue-500' },
  { value: 'open' as TicketStatus, label: 'Open', icon: Clock, color: 'text-yellow-500' },
  { value: 'pending' as TicketStatus, label: 'In afwachting', icon: Clock, color: 'text-orange-500' },
  { value: 'resolved' as TicketStatus, label: 'Opgelost', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'closed' as TicketStatus, label: 'Gesloten', icon: XCircle, color: 'text-gray-500' },
]

const priorityOptions = [
  { value: 'low' as TicketPriority, label: 'Laag', color: 'text-gray-500' },
  { value: 'normal' as TicketPriority, label: 'Normaal', color: 'text-blue-500' },
  { value: 'high' as TicketPriority, label: 'Hoog', color: 'text-orange-500' },
  { value: 'urgent' as TicketPriority, label: 'Urgent', color: 'text-red-500' },
]

// Initialize Supabase client
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const CHANNEL_ICONS = {
  email: <Mail className="h-4 w-4" />,
  whatsapp: <Phone className="h-4 w-4" />,
  chat: <MessageSquare className="h-4 w-4" />,
  phone: <Phone className="h-4 w-4" />,
  twitter: <AtSign className="h-4 w-4" />,
  facebook: <MessageSquare className="h-4 w-4" />,
  instagram: <MessageSquare className="h-4 w-4" />,
  voice: <Mic className="h-4 w-4" />,
}

interface TicketDetailProps {
  ticketNumber: number
}

// === COMPONENT: TicketHeader ===
interface TicketHeaderProps {
  ticket: any
  onAssignToMe: () => void
  onAssignToUser: (userId: string) => void
  onScrollToReply: () => void
  isAssigning: boolean
  users?: User[]
}

function TicketHeader({ ticket, onAssignToMe, onAssignToUser, onScrollToReply, isAssigning, users }: TicketHeaderProps) {
  const [showAssignDropdown, setShowAssignDropdown] = useState(false)
  const assignDropdownRef = useRef<HTMLDivElement>(null)
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assignDropdownRef.current && !assignDropdownRef.current.contains(event.target as Node)) {
        setShowAssignDropdown(false)
      }
      }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

    return (
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                {ticket.subject}
              </h1>
              <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                <span>Van: {ticket.customer?.email}</span>
                <span>•</span>
                <span>Aan: info@wasgeurtje.nl</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {/* Only show assign buttons if ticket is not assigned */}
              {!ticket.assignee_id && (
                <>
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={onAssignToMe}
                disabled={isAssigning}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                    <UserPlus className="w-4 h-4" />
                )}
                    Aan mij toewijzen
              </motion.button>
                  
                  <div className="relative" ref={assignDropdownRef}>
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                      onClick={() => setShowAssignDropdown(!showAssignDropdown)}
                  disabled={isAssigning}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Users className="w-4 h-4" />
                      Toewijzen
                </motion.button>
                    
                <AnimatePresence>
                    {showAssignDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto"
                    >
                        <div className="p-2">
                          <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Kies een agent
                          </div>
                          {users?.map((agent) => (
                            <button
                              key={agent.id}
                              onClick={() => {
                              onAssignToUser(agent.id)
                                setShowAssignDropdown(false)
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 rounded-md flex items-center gap-2"
                            >
                              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center text-sm font-medium text-white">
                                {agent.full_name?.charAt(0) || agent.email.charAt(0)}
                              </div>
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {agent.full_name || agent.email}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {agent.email}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                    </motion.div>
                    )}
                </AnimatePresence>
                  </div>
                </>
              )}
              
              {/* Show reply button only if assigned */}
              {ticket.assignee_id && (
                <button
              onClick={onScrollToReply}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                >
                  <Reply className="w-4 h-4" />
                  Reageer
                </button>
              )}
              
              <button 
                onClick={() => {/* TODO: Show note modal */}}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Opmerking
              </button>
            </div>
          </div>
        </div>
  )
}

// === COMPONENT: ConversationThread ===
interface ConversationThreadProps {
  messages: Message[]
  ticket: any
  users?: User[]
  scrollContainerRef?: React.RefObject<HTMLDivElement>
}

function ConversationThread({ messages, ticket, users, scrollContainerRef }: ConversationThreadProps) {
  const formatTime = (date: string | Date | null) => {
    if (!date) return ''
    const d = new Date(date)
    return d.toLocaleTimeString('nl-NL', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatDate = (date: string | Date | null) => {
    if (!date) return ''
    const d = new Date(date)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (d.toDateString() === today.toDateString()) {
      return 'Vandaag'
    } else if (d.toDateString() === yesterday.toDateString()) {
      return 'Gisteren'
    } else {
      return d.toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
      })
    }
  }

  return (
    <div className="flex-1 overflow-y-auto" ref={scrollContainerRef}>
      <div className="px-4 lg:px-6 py-4 space-y-4">
        {messages.map((message, index) => {
              const showDate = index === 0 || 
            formatDate(message.created_at) !== formatDate(messages[index - 1].created_at)

              // Get sender info
              let senderName = 'Onbekend'
              let senderInitial = '?'
              
              if (message.sender_type === 'customer') {
                senderName = ticket.customer?.name || 'Klant'
                senderInitial = senderName.charAt(0).toUpperCase()
              } else if (message.sender_type === 'agent') {
                const agent = users?.find(u => u.id === message.sender_id)
                senderName = agent?.full_name || agent?.email || 'Agent'
                senderInitial = senderName.charAt(0).toUpperCase()
              } else if (message.sender_type === 'system') {
                senderName = 'Systeem'
                senderInitial = 'S'
              }

          const isInternal = message.is_internal || false

              return (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
                  <div className={cn(
                    "flex gap-3",
                    message.sender_type === 'agent' && "flex-row-reverse"
                  )}>
                    <div className="flex-shrink-0">
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold",
                        message.sender_type === 'customer' ? "bg-orange-500" : 
                        message.sender_type === 'system' ? "bg-purple-500" : "bg-teal-500"
                      )}>
                        {senderInitial}
                      </div>
                    </div>
                    <div className={cn(
                      "flex-1",
                      message.sender_type === 'agent' && "flex flex-col items-end"
                    )}>
                      <div className="flex items-baseline gap-2 mb-2">
                        <span className="text-sm font-semibold text-gray-900">
                          {senderName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(message.created_at)} om {formatTime(message.created_at)}
                        </span>
                      </div>
                      <div className={cn(
                        "rounded-lg p-4",
                        message.sender_type === 'customer' 
                          ? "bg-white border border-gray-200" 
                          : message.is_internal
                          ? "bg-yellow-50 border border-yellow-200"
                          : message.sender_type === 'system'
                          ? "bg-purple-50 border border-purple-200"
                          : "bg-teal-50 border border-teal-200"
                      )}>
                        <MessageContent 
                          content={message.content}
                          contentType={message.content_type || undefined}
                          messageId={message.id}
                          attachments={message.attachments || undefined}
                          className="text-sm text-gray-800 leading-relaxed"
                          showControls={message.sender_type === 'customer'}
                          safeMode={false}
                        />
                        {isInternal && (
                          <div className="mt-3 flex items-center gap-1 text-xs text-yellow-700">
                            <Lock className="w-3 h-3" />
                            <span>Interne notitie</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}

// === COMPONENT: EditorToolbar ===
interface EditorToolbarProps {
  onBold: () => void
  onItalic: () => void
  onUnderline: () => void
  onLink: () => void
  onImage: () => void
  onCode: () => void
  onList: () => void
  onOrderedList: () => void
}

function EditorToolbar({ onBold, onItalic, onUnderline, onLink, onImage, onCode, onList, onOrderedList }: EditorToolbarProps) {
  return (
    <div className="flex items-center gap-1 p-2 border-b border-gray-200">
      <button
        onClick={onBold}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Vet"
      >
        <Bold className="w-4 h-4" />
      </button>
      <button
        onClick={onItalic}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Cursief"
      >
        <Italic className="w-4 h-4" />
      </button>
      <button
        onClick={onUnderline}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Onderstreept"
      >
        <Underline className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={onList}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Lijst"
      >
        <List className="w-4 h-4" />
      </button>
      <button
        onClick={onOrderedList}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Genummerde lijst"
      >
        <ListOrdered className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={onLink}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Link toevoegen"
      >
        <Link className="w-4 h-4" />
      </button>
      <button
        onClick={onImage}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Afbeelding toevoegen"
      >
        <Image className="w-4 h-4" />
      </button>
      <div className="w-px h-6 bg-gray-300 mx-1" />
      <button
        onClick={onCode}
        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded transition-colors"
        title="Code editor"
      >
        <Code className="w-4 h-4" />
      </button>
    </div>
  )
}

// === COMPONENT: ReplyPanel ===
interface ReplyPanelProps {
  ticket: any
  onSendMessage: (content: string, isInternal: boolean) => void
  userSignature?: any
  visible: boolean
  onScroll?: (deltaY: number) => void
}

function ReplyPanel({ ticket, onSendMessage, userSignature, visible, onScroll }: ReplyPanelProps) {
  const [newMessage, setNewMessage] = useState('')
  const [isInternalNote, setIsInternalNote] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [attachments, setAttachments] = useState<File[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState('nl')
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false)
  const [showSavedReplies, setShowSavedReplies] = useState(false)
  const [aiSuggestion, setAiSuggestion] = useState('')
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [showAIFeedback, setShowAIFeedback] = useState(false)
  const [aiRating, setAiRating] = useState(0)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const replyPanelRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Get authenticated user
  const { user } = useAuth()
  
  // Draft hooks
  const { data: draft } = useMessageDraft(ticket.id, user?.id || '')
  const saveDraft = useSaveMessageDraft()
  const deleteDraft = useDeleteMessageDraft()
  
  // Attachment hook
  const uploadAttachment = useUploadAndCreateAttachment()
  
  // Saved replies hook
  const { data: savedReplies = [] } = useSavedReplies(user?.id || '', selectedLanguage)
  const incrementUsage = useIncrementSavedReplyUsage()
  
  // AI usage hook
  const { data: aiUsageStatus } = useCheckAIUsage(user?.id)
  
  // AI feedback mutation
  const submitAIFeedback = useMutation({
    mutationFn: async (data: {
      suggestion: string,
      rating: number,
      applied: boolean,
      feedback?: string,
      editedVersion?: string
    }) => {
      if (!user?.id) throw new Error('No user')
      
      const { error } = await supabase
        .from('ai_feedback')
        .insert({
          user_id: user.id,
          ticket_id: ticket.id,
          suggestion: data.suggestion,
          rating: data.rating,
          applied: data.applied,
          feedback_text: data.feedback,
          edited_version: data.editedVersion,
          language: selectedLanguage
        })
      
      if (error) throw error
    },
    onSuccess: () => {
      showToast('success', 'Bedankt voor je feedback!')
      setShowAIFeedback(false)
      setAiRating(0)
    }
  })

  // Languages available
  const languages = [
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ]
  
  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = Math.min(scrollHeight, 400) + 'px'
    }
  }, [newMessage])

  // Load draft when component mounts or ticket changes
  useEffect(() => {
    if (draft && !newMessage) {
      setNewMessage(draft.content)
      setIsInternalNote(draft.is_internal || false)
    }
  }, [draft])

  // Auto-populate signature when component becomes visible and expanded
  useEffect(() => {
    if (visible && isExpanded && userSignature && !newMessage && !draft) {
      const signatureText = userSignature.html_content || 
        `\n\n${userSignature.greeting || 'Met vriendelijke groet,'}\n\n${userSignature.name || ''}\n${userSignature.footer || ''}`
      setNewMessage(signatureText)
    }
  }, [visible, isExpanded, userSignature, draft])

  // Save draft automatically
  useEffect(() => {
    if (!user?.id || !ticket.id) return
    
    const timeoutId = setTimeout(() => {
      if (newMessage && newMessage !== draft?.content) {
        saveDraft.mutate({
          ticketId: ticket.id,
          userId: user.id,
          content: newMessage,
          isInternal: isInternalNote,
          contentType: 'text/html'
        })
      }
    }, 1000) // Save after 1 second of inactivity

    return () => clearTimeout(timeoutId)
  }, [newMessage, isInternalNote, user?.id, ticket.id])

  // Auto-collapse when scrolling up
  useEffect(() => {
    let lastScrollY = window.scrollY
    
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      const isScrollingUp = currentScrollY < lastScrollY
      const isScrollingDown = currentScrollY > lastScrollY
      
      // Auto-collapse when scrolling up without text
      if (isScrollingUp && isExpanded && !newMessage.trim()) {
        setIsExpanded(false)
      }
      
      // Auto-expand when scrolling down and panel is minimized
      if (isScrollingDown && !isExpanded && visible) {
        setIsExpanded(true)
      }
      
      lastScrollY = currentScrollY
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isExpanded, newMessage, visible])

  // Handle scroll events on the reply panel
  useEffect(() => {
    if (!replyPanelRef.current || !onScroll) return

    const handleWheel = (e: WheelEvent) => {
      if (isExpanded) {
        e.preventDefault()
        onScroll(e.deltaY)
        
        // Auto-collapse if scrolling up significantly
        if (e.deltaY < -50 && !newMessage.trim()) {
          setIsExpanded(false)
        }
      }
    }

    const panel = replyPanelRef.current
    panel.addEventListener('wheel', handleWheel, { passive: false })

    return () => {
      panel.removeEventListener('wheel', handleWheel)
    }
  }, [isExpanded, newMessage, onScroll])

  // Also handle wheel events globally to expand when scrolling down
  useEffect(() => {
    const handleGlobalWheel = (e: WheelEvent) => {
      const isScrollingDown = e.deltaY > 0
      
      // Auto-expand when scrolling down and panel is minimized
      if (isScrollingDown && !isExpanded && visible) {
        // Check if we're near the bottom of the page
        const scrollPosition = window.scrollY + window.innerHeight
        const pageHeight = document.documentElement.scrollHeight
        const nearBottom = pageHeight - scrollPosition < 200
        
        if (nearBottom) {
          setIsExpanded(true)
        }
      }
    }
    
    window.addEventListener('wheel', handleGlobalWheel, { passive: true })
    return () => window.removeEventListener('wheel', handleGlobalWheel)
  }, [isExpanded, visible])

  const handleSend = async () => {
    if (!newMessage.trim()) return
    
    // Send the message
    onSendMessage(newMessage, isInternalNote)
    
    // Clear draft
    if (user?.id && ticket.id) {
      deleteDraft.mutate({
        ticketId: ticket.id,
        userId: user.id
      })
    }
    
    // Reset state
    setNewMessage('')
    setIsInternalNote(false)
    setIsExpanded(false)
    setAttachments([])
    setShowSuggestions(false)
    setAiSuggestion('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setAttachments(prev => [...prev, ...files])
  }

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  // Quote functionality
  const handleQuote = () => {
    // Get selected text from the page
    const selection = window.getSelection()
    if (selection && selection.toString()) {
      const quoted = `> ${selection.toString().split('\n').join('\n> ')}\n\n`
      const textarea = textareaRef.current
      if (textarea) {
        const start = textarea.selectionStart
        const beforeText = newMessage.substring(0, start)
        const afterText = newMessage.substring(start)
        setNewMessage(`${beforeText}${quoted}${afterText}`)
        
        // Focus and set cursor position
        setTimeout(() => {
          textarea.focus()
          textarea.selectionStart = textarea.selectionEnd = start + quoted.length
        }, 0)
      }
    }
  }

  // AI Suggestions
  const handleAISuggestion = async () => {
    if (isLoadingAI) return
    
    setIsLoadingAI(true)
    setShowSuggestions(true)
    
    try {
      // Get last customer message
      const customerMessages = ticket.messages?.filter((m: Message) => m.sender_type === 'customer') || []
      const lastCustomerMessage = customerMessages[customerMessages.length - 1]
      
      if (!lastCustomerMessage) {
        showToast('error', 'Geen klantbericht gevonden om op te reageren')
        return
      }

      // Get last 5 messages for context
      const previousMessages = ticket.messages?.slice(-5) || []

      // Get the current session to retrieve auth token
      const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession()
      
      if (sessionError || !session) {
        console.error('Failed to get session:', sessionError)
        showToast('error', 'Je moet ingelogd zijn om AI suggesties te gebruiken')
        setIsLoadingAI(false)
        return
      }

      // Call the AI suggestions API
      const response = await fetch('/api/ai-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${session.access_token}` // Add auth token
        },
        credentials: 'include', // Still include cookies as fallback
        body: JSON.stringify({
          ticketId: ticket.id,
          customerMessage: lastCustomerMessage.content,
          previousMessages: previousMessages.map((m: Message) => ({
            content: m.content,
            sender_type: m.sender_type,
            created_at: m.created_at
          })),
          language: selectedLanguage
        })
      })

      const data = await response.json()
      console.log('AI Suggestions Response:', { status: response.status, data })

      if (!response.ok) {
        if (response.status === 401) {
          showToast('error', `Authenticatie fout: ${data.details || data.error}. Debug: ${JSON.stringify(data.debug)}`)
        } else if (response.status === 429) {
          showToast('error', `AI limiet bereikt: ${data.usage?.requests_used}/${data.usage?.requests_limit} verzoeken gebruikt`)
        } else if (response.status === 500 && data.error === 'OpenAI API key not configured') {
          showToast('error', 'OpenAI API key is niet geconfigureerd. Voeg OPENAI_API_KEY toe aan je .env.local bestand.')
        } else {
          showToast('error', data.error || 'Fout bij het genereren van AI suggesties')
        }
        return
      }

      // Show the suggestions
      if (data.suggestions && data.suggestions.length > 0) {
        // Type assertion to fix linter error
        const setSuggestion = setAiSuggestion as (value: string) => void;
        setSuggestion(data.suggestions[0]);
        // Store all suggestions for cycling through
        (window as any).__aiSuggestions = data.suggestions
        (window as any).__currentSuggestionIndex = 0
      }

      // Show usage info if available
      if (data.usage) {
        console.log('AI Usage:', data.usage)
      }
    } catch (error) {
      console.error('AI suggestion error:', error)
      showToast('error', 'Er is een fout opgetreden bij het genereren van AI suggesties')
    } finally {
      setIsLoadingAI(false)
    }
  }

  const applyAISuggestion = () => {
    if (aiSuggestion) {
      setNewMessage(prev => prev + (prev ? '\n\n' : '') + aiSuggestion)
      // Track that the suggestion was applied
      submitAIFeedback.mutate({
        suggestion: aiSuggestion,
        rating: 5, // Default high rating when applied
        applied: true
      })
      setAiSuggestion('')
      setShowSuggestions(false)
      // Clear stored suggestions
      delete (window as any).__aiSuggestions
      delete (window as any).__currentSuggestionIndex
    }
  }

  const nextAISuggestion = () => {
    const suggestions = (window as any).__aiSuggestions;
    if (!suggestions || suggestions.length === 0) {
      return;
    }
    
    let currentIndex = (window as any).__currentSuggestionIndex || 0;
    currentIndex = (currentIndex + 1) % suggestions.length;
    (window as any).__currentSuggestionIndex = currentIndex;
    setAiSuggestion(suggestions[currentIndex]);
  }

  // Apply saved reply
  const applySavedReply = (reply: any) => {
    setNewMessage(prev => prev + (prev ? '\n\n' : '') + reply.content)
    setShowSavedReplies(false)
    // Increment usage count
    incrementUsage.mutate(reply.id)
  }

  // Editor toolbar handlers (simplified for now)
  const handleBold = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = newMessage.substring(start, end)
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(end)
    
    setNewMessage(`${beforeText}**${selectedText}**${afterText}`)
    
    // Restore cursor position
    setTimeout(() => {
      textarea.selectionStart = start + 2
      textarea.selectionEnd = end + 2
      textarea.focus()
    }, 0)
  }

  const handleItalic = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = newMessage.substring(start, end)
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(end)
    
    setNewMessage(`${beforeText}*${selectedText}*${afterText}`)
    
    setTimeout(() => {
      textarea.selectionStart = start + 1
      textarea.selectionEnd = end + 1
      textarea.focus()
    }, 0)
  }

  const handleUnderline = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = newMessage.substring(start, end)
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(end)
    
    setNewMessage(`${beforeText}<u>${selectedText}</u>${afterText}`)
    
    setTimeout(() => {
      textarea.selectionStart = start + 3
      textarea.selectionEnd = end + 3
      textarea.focus()
    }, 0)
  }

  const handleLink = () => {
    const url = prompt('Enter URL:')
    if (!url) return
    
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = newMessage.substring(start, end) || 'link text'
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(end)
    
    setNewMessage(`${beforeText}[${selectedText}](${url})${afterText}`)
  }

  const handleImage = () => {
    fileInputRef.current?.click()
  }

  const handleCode = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = newMessage.substring(start, end)
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(end)
    
    if (selectedText.includes('\n')) {
      setNewMessage(`${beforeText}\`\`\`\n${selectedText}\n\`\`\`${afterText}`)
    } else {
      setNewMessage(`${beforeText}\`${selectedText}\`${afterText}`)
    }
  }

  const handleList = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(start)
    
    setNewMessage(`${beforeText}\n- ${afterText}`)
  }

  const handleOrderedList = () => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const start = textarea.selectionStart
    const beforeText = newMessage.substring(0, start)
    const afterText = newMessage.substring(start)
    
    setNewMessage(`${beforeText}\n1. ${afterText}`)
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={replyPanelRef}
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          transition={{ duration: 0.3 }}
          className="border-t bg-gray-100"
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.txt"
          />

          {/* Minimized state - compact bar */}
          {!isExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-3"
            >
              <button
                onClick={() => setIsExpanded(true)}
                className="w-full flex items-center justify-between px-4 py-2 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group"
              >
                <span className="text-gray-500 group-hover:text-gray-700 transition-colors">
                  Klik om te reageren...
                </span>
                <div className="flex items-center gap-2">
                  {(newMessage || draft) && (
                    <span className="text-xs text-orange-600 font-medium">
                      Concept opgeslagen
                    </span>
                  )}
                  <Reply className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                </div>
              </button>
            </motion.div>
          )}

          {/* Expanded state - full reply panel */}
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="p-4"
            >
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <EditorToolbar
                  onBold={handleBold}
                  onItalic={handleItalic}
                  onUnderline={handleUnderline}
                  onLink={handleLink}
                  onImage={handleImage}
                  onCode={handleCode}
                  onList={handleList}
                  onOrderedList={handleOrderedList}
                />
                
                {/* AI Suggestion Box */}
                {showSuggestions && (
                  <div className="p-3 bg-purple-50 border-b border-purple-200">
                    {isLoadingAI ? (
                      <div className="flex items-center gap-2 text-purple-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">AI is een suggestie aan het genereren...</span>
                      </div>
                    ) : aiSuggestion ? (
                      <div className="space-y-2">
                        <p className="text-sm text-purple-700">{aiSuggestion}</p>
                        
                        {/* Feedback interface */}
                        {showAIFeedback ? (
                          <div className="space-y-2 pt-2 border-t border-purple-200">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-purple-600">Beoordeel deze suggestie:</span>
                              <div className="flex gap-1">
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <button
                                    key={star}
                                    onClick={() => setAiRating(star)}
                                    className="text-yellow-400 hover:text-yellow-500 transition-colors"
                                  >
                                    {star <= aiRating ? '★' : '☆'}
                                  </button>
                                ))}
                              </div>
                            </div>
                            {aiRating > 0 && (
                              <button
                                onClick={() => {
                                  submitAIFeedback.mutate({
                                    suggestion: aiSuggestion,
                                    rating: aiRating,
                                    applied: false
                                  })
                                }}
                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                              >
                                Verstuur feedback
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={applyAISuggestion}
                              className="px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
                            >
                              Gebruik suggestie
                            </button>
                            <button
                              onClick={nextAISuggestion}
                              className="px-3 py-1 bg-purple-100 text-purple-700 rounded text-sm hover:bg-purple-200"
                            >
                              Volgende suggestie
                            </button>
                            <button
                              onClick={() => setShowAIFeedback(true)}
                              className="px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                            >
                              Geef feedback
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Saved Replies Dropdown */}
                {showSavedReplies && (
                  <div className="p-3 bg-gray-50 border-b border-gray-200">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Opgeslagen antwoorden:</p>
                      {savedReplies.map(reply => (
                        <button
                          key={reply.id}
                          onClick={() => applySavedReply(reply)}
                          className="block w-full text-left p-2 hover:bg-gray-100 rounded text-sm"
                        >
                          <p className="font-medium text-gray-900">{reply.title}</p>
                          <p className="text-gray-600 truncate">{reply.content}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault()
                      handleSend()
                    }
                  }}
                  placeholder="Typ een bericht..."
                  className="w-full p-3 resize-none border-0 focus:outline-none focus:ring-0 text-sm overflow-y-auto"
                  ref={textareaRef}
                  style={{ minHeight: '100px', maxHeight: '400px' }}
                  autoFocus
                />
                
                {/* Attachments preview */}
                {attachments.length > 0 && (
                  <div className="px-3 pb-2 flex flex-wrap gap-2">
                    {attachments.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-sm"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                        <button
                          onClick={() => removeAttachment(index)}
                          className="text-gray-500 hover:text-gray-700"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <div className="flex items-center justify-between p-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsExpanded(false)}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
                      title="Minimaliseren"
                    >
                      <ChevronDown className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Bijlage toevoegen"
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setIsInternalNote(!isInternalNote)}
                      className={cn(
                        "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm",
                        isInternalNote 
                          ? "bg-yellow-100 text-yellow-700 hover:bg-yellow-200" 
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      )}
                      title={isInternalNote ? "Schakel naar klantbericht" : "Schakel naar interne notitie"}
                    >
                      <Lock className="w-4 h-4" />
                      {isInternalNote && <span>Interne notitie</span>}
                    </button>
                    
                    {/* Language Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
                        title="Taal selecteren"
                      >
                        <Globe className="w-5 h-5" />
                        <span className="text-sm hidden sm:inline">
                          {languages.find(l => l.code === selectedLanguage)?.flag}
                        </span>
                      </button>
                      
                      {showLanguageDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute bottom-full left-0 mb-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10"
                        >
                          {languages.map(lang => (
                            <button
                              key={lang.code}
                              onClick={() => {
                                setSelectedLanguage(lang.code)
                                setShowLanguageDropdown(false)
                              }}
                              className={cn(
                                "w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm",
                                selectedLanguage === lang.code && "bg-gray-50"
                              )}
                            >
                              <span>{lang.flag}</span>
                              <span>{lang.name}</span>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                    
                    {/* Quote Button */}
                    <button
                      onClick={handleQuote}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Citaat toevoegen"
                    >
                      <Quote className="w-5 h-5" />
                    </button>
                    
                    {/* Saved Replies */}
                    <button
                      onClick={() => setShowSavedReplies(!showSavedReplies)}
                      className={cn(
                        "p-2 rounded-lg transition-colors",
                        showSavedReplies
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                      )}
                      title="Opgeslagen antwoorden"
                    >
                      <MessageSquare className="w-5 h-5" />
                    </button>
                    
                    {/* AI Suggestions */}
                    <button
                      onClick={handleAISuggestion}
                      disabled={isLoadingAI || (aiUsageStatus && !aiUsageStatus.allowed)}
                      className={cn(
                        "px-3 py-2 rounded-lg transition-colors flex items-center gap-2 text-sm",
                        showSuggestions
                          ? "bg-purple-100 text-purple-700 hover:bg-purple-200"
                          : "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
                        (isLoadingAI || (aiUsageStatus && !aiUsageStatus.allowed)) && "opacity-50 cursor-not-allowed"
                      )}
                      title={aiUsageStatus && !aiUsageStatus.allowed 
                        ? `AI limiet bereikt: ${aiUsageStatus.requests_used}/${aiUsageStatus.requests_limit} verzoeken` 
                        : "AI suggesties"}
                    >
                      {isLoadingAI ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      <span className="hidden sm:inline">
                        AI suggesties
                        {aiUsageStatus && (
                          <span className="text-xs opacity-75 ml-1">
                            ({aiUsageStatus.requests_used}/{aiUsageStatus.requests_limit})
                          </span>
                        )}
                      </span>
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setNewMessage('')
                        setAttachments([])
                        if (user?.id && ticket.id) {
                          deleteDraft.mutate({
                            ticketId: ticket.id,
                            userId: user.id
                          })
                        }
                      }}
                      className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Concept verwijderen"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={!newMessage.trim()}
                      className={cn(
                        "px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2",
                        newMessage.trim() 
                          ? "bg-black text-white hover:bg-gray-800" 
                          : "bg-gray-100 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <Send className="w-4 h-4" />
                      Verstuur
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

// === MAIN COMPONENT: TicketView ===
export function TicketDetail({ ticketNumber }: TicketDetailProps) {
  // Use real auth hook to get authenticated user
  const { user } = useAuth()
  const router = useRouter()
  const queryClient = useQueryClient()
  
  const { setSelectedTicketNumber } = useSelectedTicketSafe()
  const { data: ticket, isLoading, error, refetch: refetchTicket } = useTicket(ticketNumber)
  const { data: users } = useUsers()
  const { data: allLabels } = useLabels()
  const { data: ticketLabels, refetch: refetchTicketLabels } = useTicketLabels(ticket?.id || '')
  const assignLabel = useAssignLabel()
  const removeLabel = useRemoveLabel()
  
  // Use sendMessage hook without AI learning callback
  const sendMessage = useSendMessage()
  
  // Use updateTicket hook without AI learning callback  
  const updateTicket = useUpdateTicket()
  
  const deleteTicket = useDeleteTicket()
  const sendEmailReply = useSendEmailReply()
  const createTask = useCreateTask()
  
  // Presence hooks
  const { updatePresence } = usePresence()
  const { typingUsers, sendTypingIndicator } = useTypingIndicator(ticket?.id)
  const logActivity = useLogActivity()
  
  // State for reply panel visibility
  const [showReplyPanel, setShowReplyPanel] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [isAssigning, setIsAssigning] = useState(false)
  const [ticketData, setTicketData] = useState(ticket)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const conversationScrollRef = useRef<HTMLDivElement>(null)
  
  // Use ticketData instead of ticket for UI rendering
  const effectiveTicket = ticketData || ticket
  
  // Get user signature
  const { data: userSignature } = useUserSignature(user?.id || '')

  // Update local ticket data when ticket prop changes
  useEffect(() => {
    setTicketData(ticket)
  }, [ticket])
  
  // Custom query for ticket tasks
  const { data: ticketTasks } = useQuery({
    queryKey: ['ticket-tasks', ticket?.id],
    queryFn: async () => {
      if (!ticket?.id) return []
      
      try {
        // Simplified query without complex joins
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('ticket_id', ticket.id)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('Error fetching tasks:', error)
          return [] // Return empty array instead of throwing
        }
        
        return data || []
      } catch (err) {
        console.error('Failed to fetch tasks:', err)
        return [] // Return empty array on error
      }
    },
    enabled: !!ticket?.id,
    retry: 1, // Only retry once instead of default 3
    retryDelay: 500, // Wait only 500ms before retry
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  // Update presence when viewing ticket
  useEffect(() => {
    if (effectiveTicket?.id && user) {
      // Update presence to show user is viewing this ticket
      // Temporarily disabled - database tables not yet created
      // updatePresence('online', `/tickets/${effectiveTicket.number}`, effectiveTicket.id)
      
      // Log viewing activity
      // Temporarily disabled - collaboration_activity table doesn't exist
      // logActivity.mutate({
      //   ticketId: effectiveTicket.id,
      //   activityType: 'viewing',
      //   activityData: { ticketNumber: effectiveTicket.number }
      // })
      
      // Cleanup: remove ticket from presence when leaving
      return () => {
        // updatePresence('online', window.location.pathname)
      }
    }
  }, [effectiveTicket?.id, effectiveTicket?.number, user, updatePresence])

  // Add debug log for ticket assignee changes
  useEffect(() => {
    console.log('Effective ticket assignee_id changed:', effectiveTicket?.assignee_id)
  }, [effectiveTicket?.assignee_id])

  // Handle scroll forwarding from reply panel to conversation
  const handleReplyPanelScroll = (deltaY: number) => {
    if (conversationScrollRef.current) {
      conversationScrollRef.current.scrollTop += deltaY
    }
  }

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (error || !effectiveTicket) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Ticket niet gevonden</p>
        </div>
      </div>
    )
  }

  const handleSendMessage = async (content: string, isInternal: boolean) => {
    if (!content.trim() || !user) return

    // Find the conversation ID
    const conversationId = effectiveTicket.conversation?.id
    if (!conversationId) {
      console.error('No conversation found for ticket')
      return
    }

    try {
      if (isInternal) {
        // Internal note - only save to database
        await sendMessage.mutateAsync({
          conversationId,
          content: content,
          isInternal: true,
          senderId: user.id,
          senderType: 'agent',
          ticketId: effectiveTicket.id
        })
      } else {
        // Send actual email via Edge Function
        console.log('Sending email reply via Edge Function...')
        
        // Get user's full name from users list or use email as fallback
        const currentUser = users?.find((u: any) => u.id === user.id)
        const agentName = currentUser?.full_name || user.email?.split('@')[0] || 'Agent'
        const agentEmail = user.email || 'noreply@helpdesk.com'
        
        const emailResponse = await fetch('/api/send-email-reply', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ticketNumber: effectiveTicket.number,
            content: content,
            agentName: agentName,
            agentEmail: agentEmail
          })
        })

        const emailResult = await emailResponse.json()

        if (!emailResult.success) {
          throw new Error(emailResult.error || 'Failed to send email')
        }

        console.log('Email sent successfully:', emailResult.messageId)

        // Save the message to database with email metadata
        await sendMessage.mutateAsync({
          conversationId,
          content: `📧 EMAIL SENT: ${content}`,
          isInternal: false,
          senderId: user.id,
          senderType: 'agent',
          ticketId: effectiveTicket.id
        })
        
        // The ticket status will be automatically updated to 'resolved' by the hook
      }
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage = error instanceof Error ? error.message : 'Er is een onbekende fout opgetreden'
      alert(`Er is een fout opgetreden: ${errorMessage}`)
    }
  }

  const handleAssignToMe = async () => {
    console.log('handleAssignToMe called', { userId: user?.id, ticketId: effectiveTicket?.id })
    console.log('Current ticket assignee_id:', effectiveTicket?.assignee_id)
    
    if (!user?.id || !effectiveTicket) {
      console.error('Missing user or ticket:', { user, effectiveTicket })
      showToast('error', 'Unable to assign ticket - missing user or ticket data')
      return
    }
    
    setIsAssigning(true)
    
    try {
      console.log('Updating ticket with assignee_id:', user.id)
      const result = await updateTicket.mutateAsync({
        ticketId: effectiveTicket.id,
        updates: { assignee_id: user.id }
      })
      console.log('Update ticket result:', result)
      
      // Log assignment activity
      // Temporarily disabled - collaboration_activity table doesn't exist
      // logActivity.mutate({
      //   ticketId: effectiveTicket.id,
      //   activityType: 'assignment',
      //   activityData: { assignedTo: user.id }
      // })
      
      showToast('success', 'Ticket toegewezen aan jou')
      
      // Manually fetch updated ticket data to work around conversation query error
      setTimeout(async () => {
        console.log('Refetching ticket...')
        
        try {
          // First, let's check if the update actually worked in the database
          const { data: checkTicket, error: checkError } = await supabase
            .from('tickets')
            .select('id, assignee_id')
            .eq('id', effectiveTicket.id)
            .single()
          
          console.log('Direct DB check - ticket assignee_id:', checkTicket?.assignee_id, 'error:', checkError)
          
          // Fetch ticket directly, ignoring conversation errors
          const { data: updatedTicket, error: ticketError } = await supabase
            .from('tickets')
            .select(`
              *,
              customer:customer_id(id, name, email, phone),
              assignee:assignee_id(id, email, full_name),
              team:team_id(id, name)
            `)
            .eq('number', ticketNumber)
            .single()
          
          if (!ticketError && updatedTicket) {
            console.log('Got updated ticket:', updatedTicket)
            console.log('Updated assignee_id:', updatedTicket.assignee_id)
            
            // Manually update the ticket data in state
            setTicketData({
              ...effectiveTicket,
              ...updatedTicket,
              conversation: effectiveTicket?.conversation || null,
              messages: effectiveTicket?.messages || []
            })
            
            // Also invalidate and refetch through React Query
            await queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] })
          }
        } catch (err) {
          console.error('Error manually fetching ticket:', err)
        } finally {
          setIsAssigning(false)
        }
      }, 500)
    } catch (error) {
      console.error('Error assigning ticket:', error)
      showToast('error', `Failed to assign ticket: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setIsAssigning(false)
    }
  }

  const handleAssignToUser = async (userId: string) => {
    if (!effectiveTicket) return
    
    setIsAssigning(true)
    
    try {
      await updateTicket.mutateAsync({
        ticketId: effectiveTicket.id,
        updates: { assignee_id: userId }
      })
      
      showToast('success', 'Ticket toegewezen')
      
      // Manually fetch updated ticket data
      setTimeout(async () => {
        try {
          const { data: updatedTicket, error: ticketError } = await supabase
            .from('tickets')
            .select(`
              *,
              customer:customer_id(id, name, email, phone),
              assignee:assignee_id(id, email, full_name),
              team:team_id(id, name)
            `)
            .eq('number', ticketNumber)
            .single()
          
          if (!ticketError && updatedTicket) {
            setTicketData({
              ...effectiveTicket,
              ...updatedTicket,
              conversation: effectiveTicket?.conversation || null,
              messages: effectiveTicket?.messages || []
            })
            
            await queryClient.invalidateQueries({ queryKey: ['ticket', ticketNumber] })
          }
        } catch (err) {
          console.error('Error manually fetching ticket:', err)
        } finally {
          setIsAssigning(false)
        }
      }, 500)
    } catch (error) {
      console.error('Error assigning ticket:', error)
      showToast('error', 'Failed to assign ticket')
      setIsAssigning(false)
    }
  }

  // Sort messages by created_at
  const sortedMessages = [...(effectiveTicket.messages || [])].sort((a, b) => 
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )

  return (
    <div className="h-full flex overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <TicketHeader
          ticket={effectiveTicket}
          onAssignToMe={handleAssignToMe}
          onAssignToUser={handleAssignToUser}
          onScrollToReply={scrollToBottom}
          isAssigning={isAssigning}
          users={users}
        />

        {/* Ticket Info Section */}
        <div className="border-b border-gray-200 px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <span className="font-medium">Onderwerp:</span> {effectiveTicket.subject}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500">
              {effectiveTicket.assignee_id && (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full">
                  Toegewezen aan {effectiveTicket.assignee?.full_name || effectiveTicket.assignee?.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <ConversationThread
          messages={sortedMessages}
          ticket={effectiveTicket}
          users={users}
          scrollContainerRef={conversationScrollRef}
        />
        
        {/* Typing indicator */}
        <div className="px-4 pb-2">
          <TypingIndicator 
            typingUsers={typingUsers} 
            users={users?.map(u => ({
              id: u.id,
              full_name: u.full_name || '',
              email: u.email
            }))} 
            className="px-4" 
          />
          <div ref={messagesEndRef} />
        </div>

        {/* Reply Panel - Only show if ticket is assigned */}
        {effectiveTicket.assignee_id ? (
          <ReplyPanel
            ticket={effectiveTicket}
            onSendMessage={handleSendMessage}
            userSignature={userSignature}
            visible={showReplyPanel}
            onScroll={handleReplyPanelScroll}
          />
        ) : (
          // Show assign buttons at bottom if ticket is not assigned
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-t bg-gray-100 p-4"
          >
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={handleAssignToMe}
                disabled={isAssigning}
                className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAssigning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                <UserPlus className="w-5 h-5" />
                )}
                Aan mij toewijzen
              </button>
              
              <div className="relative">
                <button
                  onClick={() => {/* Show assign dropdown */}}
                  disabled={isAssigning}
                  className="px-6 py-3 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Users className="w-5 h-5" />
                  Toewijzen
                </button>
                      </div>
                          </div>
          </motion.div>
        )}
      </div>

      {/* Sidebar */}
      <div className="w-64 border-l border-gray-200 bg-gray-50 p-3 overflow-y-auto">
        {/* Customer Info */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Klant</h3>
          <div className="bg-white rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center text-white font-medium">
                {effectiveTicket.customer?.name?.charAt(0) || '?'}
              </div>
              <div>
                <p className="font-medium text-gray-900">{effectiveTicket.customer?.name || 'Onbekend'}</p>
                <p className="text-sm text-gray-500">{effectiveTicket.customer?.email}</p>
              </div>
            </div>
            {effectiveTicket.customer?.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="w-4 h-4" />
                <span>{effectiveTicket.customer.phone}</span>
              </div>
            )}
          </div>
        </div>
            </div>
          </div>
  )
} 