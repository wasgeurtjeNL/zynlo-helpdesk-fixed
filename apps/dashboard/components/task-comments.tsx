'use client'

import { useState } from 'react'
import { Send, MessageSquare, Loader2 } from 'lucide-react'
import { useTaskComments, useAddTaskComment } from '@zynlo/supabase'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'

interface TaskCommentsProps {
  taskId: string
}

export function TaskComments({ taskId }: TaskCommentsProps) {
  const [newComment, setNewComment] = useState('')
  const { data: comments, isLoading } = useTaskComments(taskId)
  const addComment = useAddTaskComment()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!newComment.trim()) return

    try {
      await addComment.mutateAsync({
        taskId,
        content: newComment.trim()
      })
      setNewComment('')
    } catch (error) {
      console.error('Failed to add comment:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900 flex items-center gap-2">
        <MessageSquare className="w-4 h-4" />
        Opmerkingen
        {comments && comments.length > 0 && (
          <span className="text-sm text-gray-500">({comments.length})</span>
        )}
      </h3>

      {/* Comments list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments && comments.length > 0 ? (
          comments.map((comment: any) => (
            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-start justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {comment.user?.full_name || comment.user?.email?.split('@')[0] || 'Onbekend'}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.created_at), {
                    addSuffix: true,
                    locale: nl
                  })}
                </span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">
                {comment.content}
              </p>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">
            Nog geen opmerkingen. Wees de eerste om een opmerking toe te voegen!
          </p>
        )}
      </div>

      {/* Add comment form */}
      <form onSubmit={handleSubmit} className="mt-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Voeg een opmerking toe..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={addComment.isPending}
          />
          <button
            type="submit"
            disabled={addComment.isPending || !newComment.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {addComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span className="sr-only">Verstuur opmerking</span>
          </button>
        </div>
      </form>
    </div>
  )
} 