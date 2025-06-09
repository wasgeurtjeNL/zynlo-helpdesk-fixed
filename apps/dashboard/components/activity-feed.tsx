'use client'

import { useEffect, useState } from 'react'
import { Clock, User, MessageSquare, Settings, CheckCircle, AlertTriangle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { nl } from 'date-fns/locale'
import { useTicketActivity, useRealtimeActivity, type ActivityLog, formatActivityDescription, getActivityIcon } from '@zynlo/supabase'

interface ActivityFeedProps {
  ticketId: string
  className?: string
}

export function ActivityFeed({ ticketId, className = '' }: ActivityFeedProps) {
  const { data, isLoading, error } = useTicketActivity(ticketId)
  const [activities, setActivities] = useState<ActivityLog[]>([])

  // Enable real-time updates
  useRealtimeActivity(ticketId)

  useEffect(() => {
    if (data?.activities) {
      setActivities(data.activities)
    }
  }, [data])

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900">Activiteiten</h3>
        <div className="space-y-3">
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
      </div>
    )
  }

  if (error) {
    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activiteiten</h3>
        <div className="text-center py-8">
          <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Kon activiteiten niet laden</p>
        </div>
      </div>
    )
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={`${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Activiteiten</h3>
        <div className="text-center py-8">
          <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500">Nog geen activiteiten</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Activiteiten ({activities.length})
      </h3>
      
      <div className="space-y-4">
        {activities.map((activity) => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
    </div>
  )
}

interface ActivityItemProps {
  activity: ActivityLog
}

function ActivityItem({ activity }: ActivityItemProps) {
  const getActionIcon = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'status_changed':
        return <Settings className="h-5 w-5 text-blue-500" />
      case 'assigned':
        return <User className="h-5 w-5 text-purple-500" />
      case 'priority_changed':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />
      case 'commented':
        return <MessageSquare className="h-5 w-5 text-blue-500" />
      case 'mentioned':
        return <MessageSquare className="h-5 w-5 text-indigo-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getActionColor = (actionType: string) => {
    switch (actionType) {
      case 'created':
        return 'bg-green-50 border-green-200'
      case 'status_changed':
        return 'bg-blue-50 border-blue-200'
      case 'assigned':
        return 'bg-purple-50 border-purple-200'
      case 'priority_changed':
        return 'bg-orange-50 border-orange-200'
      case 'commented':
        return 'bg-blue-50 border-blue-200'
      case 'mentioned':
        return 'bg-indigo-50 border-indigo-200'
      default:
        return 'bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className={`flex items-start space-x-3 p-3 rounded-lg border ${getActionColor(activity.action_type)}`}>
      <div className="flex-shrink-0 mt-0.5">
        {getActionIcon(activity.action_type)}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <p className="text-sm font-medium text-gray-900">
            {activity.user_name || 'Systeem'}
          </p>
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(new Date(activity.created_at), { 
              addSuffix: true, 
              locale: nl 
            })}
          </p>
        </div>
        
        <p className="text-sm text-gray-700">
          {formatActivityDescription(activity)}
        </p>
        
        {/* Show additional data if available */}
        {activity.action_data && Object.keys(activity.action_data).length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <span className="font-mono bg-gray-100 px-2 py-1 rounded">
              {getActivityIcon(activity.action_type)} {activity.action_type}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

// Hook for manual activity creation
export function useCreateActivityLog() {
  return async (params: {
    ticketId: string
    actionType: string
    description: string
    actionData?: Record<string, any>
  }) => {
    const response = await fetch(`/api/tickets/${params.ticketId}/activity`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actionType: params.actionType,
        description: params.description,
        actionData: params.actionData || {}
      }),
    })
    
    if (!response.ok) {
      throw new Error('Failed to create activity log')
    }
    
    return response.json()
  }
} 