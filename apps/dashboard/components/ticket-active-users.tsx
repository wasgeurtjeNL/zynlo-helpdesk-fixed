'use client'

import { useTicketActiveUsers } from '@zynlo/supabase'
import { PresenceIndicator, UserPresence } from './presence-indicator'
import { Users } from 'lucide-react'

interface ActiveUser {
  user_id: string
  email: string
  full_name: string | null
  status: 'online' | 'away' | 'busy' | 'offline'
  is_typing: boolean
}

interface TicketActiveUsersProps {
  ticketId: string
  className?: string
  maxDisplay?: number
  showNames?: boolean
}

export function TicketActiveUsers({ 
  ticketId, 
  className, 
  maxDisplay = 5,
  showNames = false 
}: TicketActiveUsersProps) {
  const { data: activeUsers, isLoading } = useTicketActiveUsers(ticketId)

  // Type guard to ensure we have the right data
  const users = (activeUsers as ActiveUser[]) || []

  if (isLoading || users.length === 0) {
    return null
  }

  const displayUsers = users.slice(0, maxDisplay)
  const hiddenCount = Math.max(0, users.length - maxDisplay)

  if (showNames) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center space-x-2 text-sm font-medium text-gray-700">
          <Users className="h-4 w-4" />
          <span>Actieve gebruikers ({users.length})</span>
        </div>
        <div className="space-y-1">
          {displayUsers.map((user) => (
            <UserPresence
              key={user.user_id}
              userId={user.user_id}
              status={user.status}
              name={user.full_name || user.email}
              showLabel={true}
            />
          ))}
          {hiddenCount > 0 && (
            <p className="text-xs text-gray-500 ml-5">
              en {hiddenCount} anderen...
            </p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <div className="flex items-center space-x-1">
        <Users className="h-4 w-4 text-gray-500" />
        <span className="text-sm text-gray-600">{users.length}</span>
      </div>
      
      {/* Avatar stack with presence indicators */}
      <div className="flex -space-x-2">
        {displayUsers.map((user) => (
          <div
            key={user.user_id}
            className="relative"
            title={`${user.full_name || user.email} (${user.status})`}
          >
            {/* User avatar placeholder */}
            <div className="w-8 h-8 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center text-sm font-medium text-gray-600">
              {(user.full_name || user.email).charAt(0).toUpperCase()}
            </div>
            
            {/* Presence indicator */}
            <div className="absolute -bottom-1 -right-1">
              <PresenceIndicator 
                status={user.status} 
                size="sm"
                showPulse={user.status === 'online'}
              />
            </div>
            
            {/* Typing indicator */}
            {user.is_typing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border border-white animate-pulse" 
                   title="Aan het typen..." />
            )}
          </div>
        ))}
        
        {hiddenCount > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-xs font-medium text-gray-500">
            +{hiddenCount}
          </div>
        )}
      </div>
    </div>
  )
}

// Compact version for sidebar or toolbar
export function TicketActiveUsersCompact({ ticketId }: { ticketId: string }) {
  const { data: activeUsers } = useTicketActiveUsers(ticketId)
  const users = (activeUsers as ActiveUser[]) || []

  if (users.length === 0) {
    return null
  }

  return (
    <div className="flex items-center space-x-1 text-xs text-gray-500">
      <Users className="h-3 w-3" />
      <span>{users.length}</span>
    </div>
  )
} 