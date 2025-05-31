'use client'

import { useState } from 'react'
import { 
  Mail, 
  MessageSquare, 
  Phone, 
  Globe,
  Settings,
  ToggleLeft,
  ToggleRight,
  Plus,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Code
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type Channel = Database['public']['Tables']['channels']['Row']
type ChannelType = Database['public']['Enums']['channel_type']

interface ChannelSettings {
  description?: string
  email?: string
  phone?: string
  webhook_url?: string
  [key: string]: any
}

const channelIcons: Record<ChannelType | string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  chat: MessageSquare,
  phone: Phone,
  api: Code,
  web: Globe,
}

const channelLabels: Record<ChannelType | string, string> = {
  email: 'E-mail',
  whatsapp: 'WhatsApp',
  chat: 'Live Chat',
  phone: 'Telefoon',
  api: 'API',
  web: 'Website',
}

interface ChannelsListProps {
  searchQuery?: string
  filterType?: string
}

export function ChannelsList({ searchQuery = '', filterType = 'all' }: ChannelsListProps) {
  const queryClient = useQueryClient()
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null)

  const { data: channels, isLoading } = useQuery({
    queryKey: ['channels', searchQuery, filterType],
    queryFn: async () => {
      let query = supabase.from('channels').select('*')
      
      // Apply search filter
      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`)
      }
      
      // Apply type filter
      if (filterType !== 'all' && filterType in channelLabels) {
        query = query.eq('type', filterType as ChannelType)
      }
      
      const { data, error } = await query.order('created_at', { ascending: true })

      if (error) throw error
      return data as Channel[]
    },
  })

  const toggleChannel = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('channels')
        .update({ is_active })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['channels'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  // Filter channels if they exist
  const filteredChannels = channels || []

  // Group channels by type
  const groupedChannels = filteredChannels.reduce((acc, channel) => {
    const type = channel.type as ChannelType
    if (!acc[type]) acc[type] = []
    acc[type].push(channel)
    return acc
  }, {} as Record<ChannelType, Channel[]>)

  // Show empty state if no channels
  if (filteredChannels.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center">
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <MessageSquare className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {searchQuery || filterType !== 'all' 
            ? 'Geen kanalen gevonden' 
            : 'Nog geen kanalen geconfigureerd'}
        </h3>
        <p className="text-gray-500 mb-6">
          {searchQuery || filterType !== 'all'
            ? 'Probeer je zoekopdracht aan te passen'
            : 'Begin met het toevoegen van je eerste communicatiekanaal'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Quick stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Totaal kanalen</div>
          <div className="text-2xl font-semibold text-gray-900">{filteredChannels.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Actieve kanalen</div>
          <div className="text-2xl font-semibold text-green-600">
            {filteredChannels.filter(c => c.is_active).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Inactieve kanalen</div>
          <div className="text-2xl font-semibold text-gray-400">
            {filteredChannels.filter(c => !c.is_active).length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-sm text-gray-600">Kanaal types</div>
          <div className="text-2xl font-semibold text-gray-900">
            {Object.keys(groupedChannels).length}
          </div>
        </div>
      </div>

      {Object.entries(groupedChannels).map(([type, channelList]) => {
        const Icon = channelIcons[type] || Globe
        const label = channelLabels[type] || type

        return (
          <div key={type} className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <Icon className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-medium text-gray-900">{label}</h2>
                <span className="text-sm text-gray-500">
                  ({channelList.filter(c => c.is_active).length} actief)
                </span>
              </div>
            </div>
            <div className="divide-y divide-gray-200">
              {channelList.map((channel) => {
                const settings = (channel.settings || {}) as ChannelSettings
                
                return (
                  <div
                    key={channel.id}
                    className="px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="text-sm font-medium text-gray-900">
                            {channel.name}
                          </h3>
                          {channel.is_active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              <CheckCircle className="w-3 h-3" />
                              Actief
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                              <XCircle className="w-3 h-3" />
                              Inactief
                            </span>
                          )}
                        </div>
                        {settings.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {settings.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          {settings.email && (
                            <span>E-mail: {settings.email}</span>
                          )}
                          {settings.phone && (
                            <span>Telefoon: {settings.phone}</span>
                          )}
                          {settings.webhook_url && (
                            <span className="flex items-center gap-1">
                              <ExternalLink className="w-3 h-3" />
                              Webhook geconfigureerd
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => toggleChannel.mutate({ 
                            id: channel.id, 
                            is_active: !channel.is_active 
                          })}
                          disabled={toggleChannel.isPending}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                        >
                          {channel.is_active ? (
                            <ToggleRight className="w-5 h-5 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={() => setSelectedChannel(channel)}
                          className="p-2 hover:bg-gray-100 rounded transition-colors"
                        >
                          <Settings className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* Add Channel Button */}
      <button className="w-full bg-white rounded-lg shadow border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors">
        <div className="px-6 py-8 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus className="w-6 h-6 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Nieuw kanaal toevoegen</span>
          <span className="text-xs text-gray-500">Verbind een nieuw communicatiekanaal</span>
        </div>
      </button>
    </div>
  )
} 