'use client'

import { cn } from '@/lib/utils'

export type PresenceStatus = 'online' | 'away' | 'busy' | 'offline'

interface PresenceIndicatorProps {
  status: PresenceStatus
  className?: string
  size?: 'sm' | 'md' | 'lg'
  showPulse?: boolean
}

const statusConfig = {
  online: {
    color: 'bg-green-500',
    label: 'Online'
  },
  away: {
    color: 'bg-yellow-500',
    label: 'Away'
  },
  busy: {
    color: 'bg-red-500',
    label: 'Busy'
  },
  offline: {
    color: 'bg-gray-400',
    label: 'Offline'
  }
}

const sizeConfig = {
  sm: 'h-2 w-2',
  md: 'h-3 w-3',
  lg: 'h-4 w-4'
}

export function PresenceIndicator({ 
  status, 
  className, 
  size = 'md',
  showPulse = false 
}: PresenceIndicatorProps) {
  const config = statusConfig[status]
  const sizeClass = sizeConfig[size]

  return (
    <div
      className={cn(
        'relative rounded-full',
        config.color,
        sizeClass,
        className
      )}
      title={config.label}
    >
      {showPulse && status === 'online' && (
        <div className={cn(
          'absolute inset-0 rounded-full bg-green-500 animate-ping opacity-75',
          sizeClass
        )} />
      )}
    </div>
  )
}

interface UserPresenceProps {
  userId: string
  status: PresenceStatus
  name?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
}

export function UserPresence({ 
  userId, 
  status, 
  name, 
  size = 'md', 
  showLabel = false 
}: UserPresenceProps) {
  return (
    <div className="flex items-center space-x-2">
      <PresenceIndicator 
        status={status} 
        size={size}
        showPulse={status === 'online'}
      />
      {showLabel && (
        <span className="text-sm text-gray-600">
          {name ? `${name} is ${status}` : `User is ${status}`}
        </span>
      )}
    </div>
  )
} 