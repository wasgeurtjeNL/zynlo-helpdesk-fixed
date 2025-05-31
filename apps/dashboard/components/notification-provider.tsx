'use client'

import { useEffect, useState, createContext, useContext, ReactNode, useCallback, useRef } from 'react'
import { useRealtimeTickets, type Database } from '@zynlo/supabase'
import { AlertCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQueryClient } from '@tanstack/react-query'

type Ticket = Database['public']['Tables']['tickets']['Row']

interface Notification {
  id: string
  title: string
  message: string
  timestamp: Date
  timeoutId?: NodeJS.Timeout
}

interface NotificationContextType {
  notifications: Notification[]
  removeNotification: (id: string) => void
  pauseNotification: (id: string) => void
  resumeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

interface NotificationProviderProps {
  children: ReactNode
}

const NOTIFICATION_DURATION = 30000 // 30 seconds

export function NotificationProvider({ children }: NotificationProviderProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const queryClient = useQueryClient()

  // Request browser notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission)
      })
    }
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => {
      const notification = prev.find(n => n.id === id)
      if (notification?.timeoutId) {
        clearTimeout(notification.timeoutId)
      }
      return prev.filter(n => n.id !== id)
    })
  }, [])

  const pauseNotification = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => {
      if (n.id === id && n.timeoutId) {
        clearTimeout(n.timeoutId)
        return { ...n, timeoutId: undefined }
      }
      return n
    }))
  }, [])

  const resumeNotification = useCallback((id: string) => {
    const timeoutId = setTimeout(() => {
      removeNotification(id)
    }, 5000) // 5 seconds after mouse leave

    setNotifications(prev => prev.map(n => {
      if (n.id === id) {
        return { ...n, timeoutId }
      }
      return n
    }))
  }, [removeNotification])

  const handleNewTicket = useCallback((ticket: Ticket) => {
    console.log('New ticket received:', ticket)
    
    // Auto-remove timeout
    const timeoutId = setTimeout(() => {
      removeNotification(ticket.id)
    }, NOTIFICATION_DURATION)
    
    const notification: Notification = {
      id: ticket.id,
      title: `Nieuw ticket #${ticket.number}`,
      message: ticket.subject || 'Geen onderwerp',
      timestamp: new Date(),
      timeoutId
    }

    // Add to in-app notifications
    setNotifications(prev => [notification, ...prev])

    // Invalidate queries to refresh ticket lists
    queryClient.invalidateQueries({ queryKey: ['tickets'] })
    queryClient.invalidateQueries({ queryKey: ['inbox-counts'] })

    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        const browserNotification = new Notification(notification.title, {
          body: notification.message,
          icon: '/favicon.ico',
          tag: ticket.id,
          requireInteraction: true // Keeps notification until user interacts
        })

        // Add click handler to focus the window
        browserNotification.onclick = () => {
          window.focus()
          browserNotification.close()
        }
      } catch (error) {
        console.error('Error showing browser notification:', error)
      }
    }
  }, [queryClient, removeNotification])

  // Subscribe to new tickets
  useRealtimeTickets(handleNewTicket)

  return (
    <NotificationContext.Provider value={{ notifications, removeNotification, pauseNotification, resumeNotification }}>
      {children}
      <NotificationToasts />
    </NotificationContext.Provider>
  )
}

function NotificationToasts() {
  const { notifications, removeNotification, pauseNotification, resumeNotification } = useNotifications()

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2 pointer-events-none">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className="pointer-events-auto animate-in slide-in-from-right fade-in duration-300"
          onMouseEnter={() => pauseNotification(notification.id)}
          onMouseLeave={() => resumeNotification(notification.id)}
        >
          <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-4 max-w-sm hover:shadow-xl transition-shadow">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-semibold text-gray-900">
                  {notification.title}
                </h4>
                <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                  {notification.message}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Nu
                </p>
              </div>
              <button
                onClick={() => removeNotification(notification.id)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                title="Sluiten"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 