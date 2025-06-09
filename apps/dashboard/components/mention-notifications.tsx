'use client'

import { useState } from 'react'
import { useUnreadMentions, useMentionStats, useMarkMentionsAsRead } from '@zynlo/supabase'
import { AtSign, Bell, Eye, X, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { toast } from 'sonner'

interface MentionNotificationsProps {
  className?: string
}

export function MentionNotifications({ className }: MentionNotificationsProps) {
  const [isOpen, setIsOpen] = useState(false)
  
  const { data: unreadMentions = [] } = useUnreadMentions()
  const { data: stats } = useMentionStats()
  const markAsRead = useMarkMentionsAsRead()

  const handleMarkAllAsRead = async () => {
    try {
      await markAsRead.mutateAsync()
      toast.success('Alle mentions gemarkeerd als gelezen')
      setIsOpen(false)
    } catch (error) {
      toast.error('Fout bij markeren als gelezen')
    }
  }

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await markAsRead.mutateAsync([messageId])
    } catch (error) {
      toast.error('Fout bij markeren als gelezen')
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
        month: 'short'
      })
    }
  }

  return (
    <div className={cn('relative', className)}>
      {/* Mention Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'relative p-2 rounded-lg transition-colors',
          isOpen 
            ? 'bg-blue-100 text-blue-700' 
            : 'text-gray-600 hover:bg-gray-100'
        )}
      >
        <AtSign className="w-5 h-5" />
        
        {/* Unread count badge */}
        {stats && stats.unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {stats.unread > 99 ? '99+' : stats.unread}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown content */}
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <AtSign className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-medium text-gray-900">Mentions</h3>
                {stats && stats.unread > 0 && (
                  <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                    {stats.unread} ongelezen
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-1">
                {stats && stats.unread > 0 && (
                  <button
                    onClick={handleMarkAllAsRead}
                    disabled={markAsRead.isPending}
                    className="p-1 text-gray-400 hover:text-gray-600 rounded"
                    title="Alles markeren als gelezen"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="max-h-96 overflow-y-auto">
              {unreadMentions.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <AtSign className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">Geen ongelezen mentions</p>
                  <p className="text-xs text-gray-400">Je bent up-to-date!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {unreadMentions.map((mention: any) => (
                    <div key={mention.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <AtSign className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {mention.messages.sender_name}
                            </p>
                            <span className="text-xs text-gray-500">
                              {formatDate(mention.created_at)}
                            </span>
                          </div>
                          
                          <p className="text-xs text-gray-600 mb-2">
                            Je bent getagd in ticket #{mention.messages.conversations.tickets.number}
                          </p>
                          
                          <p className="text-sm text-gray-800 line-clamp-2 mb-2">
                            {mention.messages.content}
                          </p>
                          
                          <div className="flex items-center justify-between">
                            <Link
                              href={`/tickets/${mention.messages.conversations.ticket_id}`}
                              onClick={() => {
                                handleMarkAsRead(mention.message_id)
                                setIsOpen(false)
                              }}
                              className="text-xs text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                            >
                              <span>Naar ticket</span>
                              <ExternalLink className="w-3 h-3" />
                            </Link>
                            
                            <button
                              onClick={() => handleMarkAsRead(mention.message_id)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Markeer als gelezen
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Compact version for sidebar
export function MentionBadge() {
  const { data: stats } = useMentionStats()

  if (!stats || stats.unread === 0) return null

  return (
    <div className="flex items-center space-x-1 text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full">
      <AtSign className="w-3 h-3" />
      <span>{stats.unread}</span>
    </div>
  )
} 