'use client'

import { useState, useRef } from 'react'
import { useTicketComments, useAddComment, useRealtimeComments, useCommentStats, useMentionSearch, type Comment, type MentionUser } from '@zynlo/supabase'
import { MessageCircle, Send, Lock, User, Clock, Plus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { MentionAutocomplete } from './mention-autocomplete'
import { MentionText } from './mention-text'

interface InternalCommentsProps {
  ticketId: string
  className?: string
}

export function InternalComments({ ticketId, className }: InternalCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const [isExpanded, setIsExpanded] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const { data: comments = [], isLoading } = useTicketComments(ticketId)
  const { data: stats } = useCommentStats(ticketId)
  const addComment = useAddComment()
  useRealtimeComments(ticketId)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await addComment.mutateAsync({
        ticketId,
        content: newComment.trim()
      })
      setNewComment('')
      toast.success('Interne notitie toegevoegd')
    } catch (error) {
      toast.error('Fout bij toevoegen van notitie')
      console.error('Error adding comment:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor(diffInHours * 60)
      return `${diffInMinutes}m geleden`
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}u geleden`
    } else {
      return date.toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'short',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0]?.toUpperCase())
      .slice(0, 2)
      .join('')
  }

  return (
    <div className={cn('bg-white border border-orange-200 rounded-lg', className)}>
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-orange-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-orange-100 rounded-full">
            <Lock className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">Interne notities</h3>
            <p className="text-xs text-gray-500">
              {stats?.total || 0} notitie(s) 
              {stats?.recent ? ` • ${stats.recent} recent` : ''}
            </p>
          </div>
        </div>
        <MessageCircle 
          className={cn(
            "w-5 h-5 text-gray-400 transition-transform",
            isExpanded && "rotate-180"
          )}
        />
      </div>

      {/* Comments Section */}
      {isExpanded && (
        <div className="border-t border-orange-200">
          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500">
                Laden...
              </div>
            ) : comments.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                <Lock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">Nog geen interne notities</p>
                <p className="text-xs text-gray-400">Voeg een notitie toe die alleen zichtbaar is voor agents</p>
              </div>
            ) : (
              <div className="divide-y divide-orange-100">
                {comments.map((comment) => (
                  <div key={comment.id} className="p-4 hover:bg-orange-25 transition-colors">
                    <div className="flex space-x-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                          {getInitials(comment.sender_name)}
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900">
                            {comment.sender_name}
                          </p>
                          <div className="flex items-center space-x-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            <span>{formatDate(comment.created_at)}</span>
                          </div>
                        </div>
                        <MentionText 
                          text={comment.content}
                          className="text-sm text-gray-700"
                          mentionClassName="bg-orange-100 text-orange-800 px-1 py-0.5 rounded font-medium"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Comment Form */}
          <div className="p-4 bg-orange-50 border-t border-orange-200">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="flex items-start space-x-2">
                <div className="flex-shrink-0 pt-1">
                  <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center">
                    <User className="w-3 h-3 text-white" />
                  </div>
                </div>
                <div className="flex-1">
                  <MentionAutocomplete
                    value={newComment}
                    onChange={setNewComment}
                    placeholder="Voeg een interne notitie toe..."
                    className="min-h-[80px] border-orange-200 focus:ring-orange-500 focus:border-orange-500"
                    onMentionSelect={(user) => {
                      toast.success(`${user.full_name || user.email} getagd`)
                    }}
                  />
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-xs text-orange-600 flex items-center space-x-1">
                      <Lock className="w-3 h-3" />
                      <span>Alleen zichtbaar voor agents</span>
                    </p>
                    <button
                      type="submit"
                      disabled={!newComment.trim() || addComment.isPending}
                      className={cn(
                        "flex items-center space-x-1 px-3 py-1 text-xs font-medium rounded-md transition-colors",
                        newComment.trim() && !addComment.isPending
                          ? "bg-orange-600 text-white hover:bg-orange-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      <Send className="w-3 h-3" />
                      <span>{addComment.isPending ? 'Bezig...' : 'Verstuur'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// Compact version for ticket list
export function InternalCommentsIndicator({ ticketId }: { ticketId: string }) {
  const { data: stats } = useCommentStats(ticketId)

  if (!stats?.total) return null

  return (
    <div className="flex items-center space-x-1 text-xs text-orange-600">
      <Lock className="w-3 h-3" />
      <span>{stats.total}</span>
      {stats.recent > 0 && (
        <span className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
      )}
    </div>
  )
} 