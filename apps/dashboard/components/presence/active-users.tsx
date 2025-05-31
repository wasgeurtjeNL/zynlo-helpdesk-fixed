'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useTicketActiveUsers } from '@zynlo/supabase'
import { PresenceIndicator } from './presence-indicator'
import type { PresenceStatus } from '@zynlo/supabase'

interface ActiveUsersProps {
  ticketId: string
  className?: string
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-6 w-6 text-xs',
  md: 'h-8 w-8 text-sm',
  lg: 'h-10 w-10 text-base'
}

export function ActiveUsers({
  ticketId,
  className,
  maxDisplay = 3,
  size = 'md'
}: ActiveUsersProps) {
  const { data: activeUsers = [], isLoading } = useTicketActiveUsers(ticketId)

  if (isLoading || activeUsers.length === 0) return null

  const displayUsers = activeUsers.slice(0, maxDisplay)
  const remainingCount = Math.max(0, activeUsers.length - maxDisplay)

  return (
    <TooltipProvider>
      <div className={cn('flex items-center', className)}>
        <div className="flex -space-x-2">
          {displayUsers.map((user) => (
            <Tooltip key={user.user_id}>
              <TooltipTrigger asChild>
                <div className="relative">
                  <Avatar className={cn(sizeClasses[size], 'border-2 border-background')}>
                    <AvatarImage src={`/api/avatar/${user.user_id}`} alt={user.full_name || user.email} />
                    <AvatarFallback>
                      {user.full_name
                        ? user.full_name.split(' ').map(n => n[0]).join('').toUpperCase()
                        : user.email[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1">
                    <PresenceIndicator status={user.status as PresenceStatus} size="sm" />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">{user.full_name || user.email}</span>
                  <div className="flex items-center gap-2">
                    <PresenceIndicator status={user.status as PresenceStatus} size="sm" showLabel />
                    {user.is_typing && (
                      <span className="text-xs text-muted-foreground">• Typing...</span>
                    )}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
          {remainingCount > 0 && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    sizeClasses[size],
                    'rounded-full bg-muted flex items-center justify-center border-2 border-background font-medium'
                  )}
                >
                  +{remainingCount}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="flex flex-col gap-1">
                  <span className="font-medium">
                    {remainingCount} more {remainingCount === 1 ? 'user' : 'users'} active
                  </span>
                  {activeUsers.slice(maxDisplay).map((user) => (
                    <div key={user.user_id} className="flex items-center gap-2">
                      <PresenceIndicator status={user.status as PresenceStatus} size="sm" />
                      <span className="text-sm">{user.full_name || user.email}</span>
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    </TooltipProvider>
  )
} 