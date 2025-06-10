'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Mail, Plus, Settings, Trash2, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/lib/ui'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, useUser } from '@zynlo/supabase'
import { toast } from 'sonner'

export default function EmailChannelsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const { user } = useUser()
  const [isAddingChannel, setIsAddingChannel] = useState(false)
  const [channelName, setChannelName] = useState('')

  // Handle OAuth success/error messages
  useEffect(() => {
    const success = searchParams.get('success')
    const error = searchParams.get('error')
    
    if (success === 'gmail_connected') {
      toast.success('Gmail account succesvol gekoppeld!', {
        description: 'Je Gmail account is nu actief en kan emails ontvangen.',
        duration: 5000
      })
      // Refresh the channels data
      queryClient.invalidateQueries({ queryKey: ['email-channels'] })
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('success')
      window.history.replaceState({}, '', url.toString())
    } else if (error) {
      let errorMessage = 'Er is een fout opgetreden bij het koppelen van je Gmail account.'
      if (error === 'oauth_failed') errorMessage = 'OAuth autorisatie mislukt.'
      if (error === 'no_code') errorMessage = 'Geen autorisatiecode ontvangen van Google.'
      if (error === 'oauth_callback_failed') errorMessage = 'OAuth callback verwerking mislukt.'
      
      toast.error('Gmail koppeling mislukt', {
        description: errorMessage,
        duration: 7000
      })
      // Clean up URL
      const url = new URL(window.location.href)
      url.searchParams.delete('error')
      window.history.replaceState({}, '', url.toString())
    }
  }, [searchParams, queryClient])

  // Fetch email channels
  const { data: channels, isLoading, error } = useQuery({
    queryKey: ['email-channels'],
    queryFn: async () => {
      console.log('🔍 Fetching email channels...')
      console.log('🔑 Current user:', user?.id)
      
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('type', 'email')
        .order('created_at', { ascending: false })

      console.log('📊 Query result:', { data, error })
      console.log('📈 Channels found:', data?.length || 0)
      
      if (error) {
        console.error('❌ Database error:', error)
        throw error
      }
      return data || []
    }
  })

  // Toggle channel active status
  const toggleChannel = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase
        .from('channels')
        .update({ is_active: isActive })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-channels'] })
    }
  })

  // Delete channel
  const deleteChannel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-channels'] })
    }
  })

  // Initiate Gmail OAuth flow
  const connectGmail = async () => {
    if (!channelName.trim()) {
      alert('Vul eerst een naam in voor dit email kanaal')
      return
    }

    // Use dashboard OAuth route (now works with environment variables)
    const params = new URLSearchParams({
      channelName: channelName,
      userId: user?.id || ''
    })
    
    // Use dashboard route which now has proper credentials
    window.location.href = `/api/auth/gmail/connect?${params.toString()}`
  }

  const syncEmails = async (channelId: string) => {
    try {
      // Always use relative API routes (same origin)
      const response = await fetch(`/api/sync/gmail/${channelId}`, {
          method: 'POST',
      })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result.error || 'Onbekende fout')
      }
      
      // Show appropriate message based on implementation status
      if (result.implementation_status === 'mock') {
        toast.success(result.message, {
          description: result.note,
          duration: 5000,
        })
      } else {
        // Live Gmail integration
        const stats = result.result
        toast.success(result.message, {
          description: `${stats?.newEmails || 0} nieuwe emails, ${stats?.processed || 0} verwerkt van ${stats?.totalFound || 0} gevonden`,
          duration: 4000,
        })
      }
      
      // Refresh the channels list to show updated sync time
      queryClient.invalidateQueries({ queryKey: ['email-channels'] })
      
    } catch (err: any) {
      console.error('Email sync failed:', err)
      toast.error('Email sync mislukt', {
        description: err.message || 'Kon geen verbinding maken met de server.',
      })
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Email kanalen laden...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/kanalen')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar kanalen
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Email Kanalen</h1>
            <p className="mt-1 text-sm text-gray-500">
              Koppel email accounts om tickets te ontvangen via email
            </p>
          </div>
          <Button
            onClick={() => setIsAddingChannel(true)}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Email toevoegen
          </Button>
        </div>
      </div>

      {/* Add channel options */}
      {isAddingChannel && (
        <div className="mb-6 p-6 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Email kanaal toevoegen</h3>
          
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Kanaal naam
            </label>
            <input
              type="text"
              value={channelName}
              onChange={(e) => setChannelName(e.target.value)}
              placeholder="Bijv. Support Email, Sales Inbox"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button
              onClick={connectGmail}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-red-100 rounded">
                  <Mail className="h-5 w-5 text-red-600" />
                </div>
                <h4 className="font-medium">Gmail</h4>
              </div>
              <p className="text-sm text-gray-600">
                Koppel je Gmail account met OAuth 2.0
              </p>
            </button>

            <button
              onClick={() => alert('Outlook integratie komt binnenkort')}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 rounded">
                  <Mail className="h-5 w-5 text-blue-600" />
                </div>
                <h4 className="font-medium">Outlook</h4>
              </div>
              <p className="text-sm text-gray-600">
                Koppel je Outlook/Office 365 account
              </p>
              <p className="text-xs text-gray-500 mt-1">Komt binnenkort</p>
            </button>

            <button
              onClick={() => alert('IMAP/SMTP configuratie komt binnenkort')}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors text-left opacity-50 cursor-not-allowed"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 rounded">
                  <Mail className="h-5 w-5 text-gray-600" />
                </div>
                <h4 className="font-medium">Andere (IMAP/SMTP)</h4>
              </div>
              <p className="text-sm text-gray-600">
                Configureer met IMAP/SMTP settings
              </p>
              <p className="text-xs text-gray-500 mt-1">Komt binnenkort</p>
            </button>
          </div>
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddingChannel(false)
                setChannelName('')
              }}
            >
              Annuleren
            </Button>
          </div>
        </div>
      )}

      {/* Email channels list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">
            Geconfigureerde email accounts ({channels?.length || 0})
          </h2>
        </div>

        {/* Debug informatie */}
        <div className="px-4 py-2 bg-yellow-50 border-b border-yellow-200 text-xs">
          <strong>🔍 Debug Info:</strong> User ID: {user?.id || 'Geen user'} | 
          Channels gevonden: {channels?.length || 0} | 
          Loading: {isLoading ? 'Ja' : 'Nee'} | 
          Error: {error ? 'Ja' : 'Nee'}
          {error && <div className="text-red-600 mt-1">Error details: {JSON.stringify(error)}</div>}
        </div>

        {channels && channels.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {channels.map((channel) => (
              <div key={channel.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      channel.is_active ? 'bg-green-100' : 'bg-gray-100'
                    }`}>
                      <Mail className={`h-5 w-5 ${
                        channel.is_active ? 'text-green-600' : 'text-gray-600'
                      }`} />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {channel.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {(channel.settings as any)?.email_address || 'Geen email adres'}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className={`text-xs flex items-center gap-1 ${
                          channel.is_active ? 'text-green-600' : 'text-gray-500'
                        }`}>
                          {channel.is_active ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <XCircle className="h-3 w-3" />
                          )}
                          {channel.is_active ? 'Actief' : 'Inactief'}
                        </span>
                        {channel.last_sync && (
                          <span className="text-xs text-gray-500">
                            Laatste sync: {new Date(channel.last_sync).toLocaleString('nl-NL')}
                          </span>
                        )}
                        {(channel.settings as any)?.sync_count && (
                          <span className="text-xs text-gray-400">
                            • {(channel.settings as any).sync_count} syncs
                          </span>
                        )}
                        {(channel.settings as any)?.last_sync_stats && (
                          <span className="text-xs text-green-600">
                            • {(channel.settings as any).last_sync_stats.new_emails} nieuwe emails
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => syncEmails(channel.id)}
                      title="Sync emails nu"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/kanalen/email/${channel.id}`)}
                    >
                      <Settings className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={channel.is_active ? 'outline' : 'default'}
                      onClick={() => toggleChannel.mutate({ 
                        id: channel.id, 
                        isActive: !channel.is_active 
                      })}
                    >
                      {channel.is_active ? 'Deactiveren' : 'Activeren'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (confirm('Weet je zeker dat je dit email kanaal wilt verwijderen?')) {
                          deleteChannel.mutate(channel.id)
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nog geen email accounts gekoppeld</p>
            <p className="text-sm mt-1">Voeg je eerste email account toe om tickets via email te ontvangen</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Hoe werkt email integratie?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Koppel je email account via OAuth (veilig, geen wachtwoord nodig)</li>
          <li>• Emails naar het gekoppelde adres worden automatisch tickets</li>
          <li>• Antwoorden op tickets worden als email verstuurd</li>
          <li>• Email threads worden automatisch gekoppeld aan bestaande tickets</li>
        </ul>
      </div>
    </div>
  )
} 