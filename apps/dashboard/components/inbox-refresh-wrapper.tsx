'use client'

import { useEffect, useState } from 'react'
import { Bell, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useInboxRefresh, useRealtimeInbox } from '@/hooks/use-inbox-refresh'
import { cn } from '@/lib/utils'

interface InboxRefreshWrapperProps {
  children: React.ReactNode
  enableRealtime?: boolean
  refreshInterval?: number
}

export function InboxRefreshWrapper({
  children,
  enableRealtime = true,
  refreshInterval = 30000 // 30 seconds
}: InboxRefreshWrapperProps) {
  const [showNewTicketBadge, setShowNewTicketBadge] = useState(false)
  
  // Use polling-based refresh
  const { refresh, isRefreshing } = useInboxRefresh({
    interval: refreshInterval,
    onNewTickets: (count) => {
      toast.success(`${count} nieuwe ticket${count > 1 ? 's' : ''} ontvangen`, {
        icon: <Bell className="w-4 h-4" />,
        action: {
          label: 'Bekijken',
          onClick: () => {
            setShowNewTicketBadge(false)
            // Navigate to new tickets
            window.location.href = '/inbox/nieuw'
          }
        }
      })
      setShowNewTicketBadge(true)
    }
  })

  // Use realtime updates if enabled
  if (enableRealtime) {
    useRealtimeInbox()
  }

  // Auto-hide badge after 10 seconds
  useEffect(() => {
    if (showNewTicketBadge) {
      const timer = setTimeout(() => {
        setShowNewTicketBadge(false)
      }, 10000)
      
      return () => clearTimeout(timer)
    }
    return undefined
  }, [showNewTicketBadge])

  return (
    <div className="relative h-full">
      {/* Refresh button */}
      <div className="absolute top-4 right-4 z-10 flex items-center gap-2">
        {showNewTicketBadge && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500 text-white rounded-full text-sm animate-pulse">
            <Bell className="w-4 h-4" />
            <span>Nieuwe tickets</span>
          </div>
        )}
        
        <button
          onClick={refresh}
          disabled={isRefreshing}
          className={cn(
            "p-2 rounded-lg hover:bg-gray-100 transition-colors",
            "disabled:opacity-50 disabled:cursor-not-allowed",
            isRefreshing && "animate-spin"
          )}
          title="Ververs inbox"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Render children */}
      {children}
    </div>
  )
} 