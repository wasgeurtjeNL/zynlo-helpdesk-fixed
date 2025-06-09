'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Bell, Activity, Users, MessageSquare, Settings, Plus } from 'lucide-react'
import { ActivityFeed } from './activity-feed'
import { NotificationCenter } from './notification-center'
import { useTicketActivity, useNotifications, useCreateNotification, useUser } from '@zynlo/supabase'

interface ActivityNotificationDemoProps {
  ticketId?: string
  className?: string
}

export function ActivityNotificationDemo({ ticketId, className = '' }: ActivityNotificationDemoProps) {
  const params = useParams()
  const currentTicketId = ticketId || (params?.id as string)
  const [activeTab, setActiveTab] = useState<'activity' | 'notifications'>('activity')
  
  const { user } = useUser()
  const { data: activityData, isLoading: activityLoading } = useTicketActivity(currentTicketId)
  const { data: notificationData, isLoading: notificationLoading } = useNotifications()
  const createNotification = useCreateNotification()

  const activities = activityData?.activities || []
  const notifications = notificationData?.notifications || []
  const stats = notificationData?.stats || { total_count: 0, unread_count: 0, unseen_count: 0 }

  // Demo function to create test notifications
  const handleCreateTestNotification = async () => {
    if (!user) {
      console.error('No user found - cannot create notification')
      return
    }

    try {
      await createNotification.mutateAsync({
        userId: user.id, // Use actual user ID
        type: 'comment',
        title: 'Nieuwe reactie',
        message: `Er is een nieuwe reactie toegevoegd aan ticket #${currentTicketId}`,
        actionUrl: `/tickets/${currentTicketId}`,
        ticketId: currentTicketId
      })
      console.log('Test notification created successfully!')
    } catch (error) {
      console.error('Failed to create test notification:', error)
    }
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Activiteiten & Notificaties
          </h2>
          
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('activity')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'activity'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Activity className="inline h-4 w-4 mr-1" />
              Activiteiten ({activities.length})
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`px-3 py-1 text-sm font-medium rounded-md transition-colors relative ${
                activeTab === 'notifications'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Bell className="inline h-4 w-4 mr-1" />
              Notificaties ({notifications.length})
              {stats.unread_count > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {stats.unread_count}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <NotificationCenter />
          
          {/* Demo Button */}
          <button
            onClick={handleCreateTestNotification}
            disabled={createNotification.isPending}
            className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-1"
          >
            <Plus className="h-4 w-4" />
            <span>Test Notificatie</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'activity' ? (
          <ActivitySection 
            ticketId={currentTicketId} 
            activities={activities}
            isLoading={activityLoading}
          />
        ) : (
          <NotificationSection 
            notifications={notifications}
            stats={stats}
            isLoading={notificationLoading}
          />
        )}
      </div>

      {/* Real-time Status Indicator */}
      <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span>Live updates ingeschakeld</span>
          </div>
          
          <div className="flex items-center space-x-4">
            <span>
              {activities.length} activiteiten
            </span>
            <span>
              {stats.unread_count} ongelezen notificaties
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

interface ActivitySectionProps {
  ticketId: string
  activities: any[]
  isLoading: boolean
}

function ActivitySection({ ticketId, activities, isLoading }: ActivitySectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Activity className="h-5 w-5 text-gray-400" />
          <span className="text-gray-500">Activiteiten laden...</span>
        </div>
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

  return (
    <div className="space-y-6">
      {/* Activity Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{activities.length}</div>
          <div className="text-sm text-blue-800">Totaal Activiteiten</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-600">
            {activities.filter(a => a.action_type === 'commented').length}
          </div>
          <div className="text-sm text-green-800">Reacties</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-600">
            {activities.filter(a => a.action_type === 'status_changed').length}
          </div>
          <div className="text-sm text-purple-800">Status Wijzigingen</div>
        </div>
      </div>

      {/* Activity Feed */}
      <ActivityFeed ticketId={ticketId} />
    </div>
  )
}

interface NotificationSectionProps {
  notifications: any[]
  stats: any
  isLoading: boolean
}

function NotificationSection({ notifications, stats, isLoading }: NotificationSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-2 mb-4">
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="text-gray-500">Notificaties laden...</span>
        </div>
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

  return (
    <div className="space-y-6">
      {/* Notification Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-blue-600">{stats.total_count}</div>
          <div className="text-sm text-blue-800">Totaal</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-600">{stats.unread_count}</div>
          <div className="text-sm text-red-800">Ongelezen</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-orange-600">{stats.unseen_count}</div>
          <div className="text-sm text-orange-800">Nieuw</div>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Recente Notificaties
        </h3>
        
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-500">Geen notificaties</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.id}
                className={`p-4 rounded-lg border ${
                  notification.is_read 
                    ? 'bg-gray-50 border-gray-200' 
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{notification.title}</p>
                    <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    notification.is_read 
                      ? 'bg-gray-100 text-gray-600'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {notification.is_read ? 'Gelezen' : 'Nieuw'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
} 