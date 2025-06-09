'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Bell, Check, CheckCheck, Trash2, Settings, ExternalLink } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useNotifications, useMarkNotificationsAsRead, useRealtimeNotifications, type Notification } from '@zynlo/supabase'

interface NotificationCenterProps {
  className?: string
}

export function NotificationCenter({ className = '' }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useNotifications()
  const markAsRead = useMarkNotificationsAsRead()

  // Enable real-time updates
  useRealtimeNotifications()

  const notifications = data?.notifications || []
  const stats = data?.stats || { total_count: 0, unread_count: 0, unseen_count: 0 }

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMarkAllAsRead = async () => {
    try {
      await markAsRead.mutateAsync({ markAll: true })
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const handleMarkAsRead = async (notificationIds: string[]) => {
    try {
      await markAsRead.mutateAsync({ notificationIds })
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label="Notificaties"
      >
        <Bell className="h-6 w-6" />
        
        {/* Unread Count Badge */}
        {stats.unread_count > 0 && (
          <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 text-white text-xs font-medium rounded-full flex items-center justify-center">
            {stats.unread_count > 9 ? '9+' : stats.unread_count}
          </span>
        )}

        {/* Unseen Indicator (small dot) */}
        {stats.unseen_count > 0 && (
          <span className="absolute top-1 right-1 h-2 w-2 bg-blue-500 rounded-full"></span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">
              Notificaties
              {stats.total_count > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({stats.unread_count} ongelezen)
                </span>
              )}
            </h3>
            
            <div className="flex items-center space-x-2">
              {stats.unread_count > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={markAsRead.isPending}
                  className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  title="Alles markeren als gelezen"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-start space-x-3 animate-pulse">
                    <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">Geen notificaties</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {notifications.slice(0, 10).map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={() => handleMarkAsRead([notification.id])}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <Link
                href="/notifications"
                className="text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center"
                onClick={() => setIsOpen(false)}
              >
                Alle notificaties bekijken
                <ExternalLink className="ml-1 h-3 w-3" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: () => void
}

function NotificationItem({ notification, onMarkAsRead }: NotificationItemProps) {
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'mention':
        return '🏷️'
      case 'assignment':
        return '👤'
      case 'comment':
        return '💬'
      case 'status_change':
        return '🔄'
      default:
        return '📢'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'mention':
        return 'text-indigo-600'
      case 'assignment':
        return 'text-purple-600'
      case 'comment':
        return 'text-blue-600'
      case 'status_change':
        return 'text-green-600'
      default:
        return 'text-gray-600'
    }
  }

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead()
    }
    
    // Navigate to notification target if action_url exists
    if (notification.action_url) {
      window.location.href = notification.action_url
    }
  }

  return (
    <div
      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.is_read ? 'bg-blue-50 border-l-4 border-blue-500' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <span className="text-lg" role="img">
            {getNotificationIcon(notification.type)}
          </span>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <p className={`text-sm font-medium ${getNotificationColor(notification.type)}`}>
              {notification.title}
            </p>
            <div className="flex items-center space-x-2">
              <p className="text-xs text-gray-500">
                {formatDistanceToNow(new Date(notification.created_at), { 
                  addSuffix: true, 
                  locale: nl 
                })}
              </p>
              {!notification.is_read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onMarkAsRead()
                  }}
                  className="text-blue-600 hover:text-blue-800"
                  title="Markeren als gelezen"
                >
                  <Check className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
          
          <p className="text-sm text-gray-700 mb-2">
            {notification.message}
          </p>
          
          {/* Ticket info if available */}
          {notification.tickets && (
            <div className="text-xs text-gray-500">
              Ticket #{notification.tickets.number}: {notification.tickets.subject}
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 