'use client'

import { useState } from 'react'
import { ArrowLeft, Mail, Settings, Trash2, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/lib/ui'
import { useRouter, useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { toast } from 'sonner'

export default function EmailChannelDetailPage() {
  const router = useRouter()
  const params = useParams()
  const queryClient = useQueryClient()
  const channelId = params.id as string

  // Fetch channel details
  const { data: channel, isLoading, error } = useQuery({
    queryKey: ['email-channel', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single()

      if (error) throw error
      return data
    }
  })

  // Fetch OAuth tokens
  const { data: tokens } = useQuery({
    queryKey: ['oauth-tokens', channelId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('oauth_tokens')
        .select('*')
        .eq('channel_id', channelId)
        .eq('provider', 'gmail')
        .single()

      if (error) {
        console.log('No tokens found:', error)
        return null
      }
      return data
    }
  })

  const syncEmails = async () => {
    try {
      const response = await fetch(`/api/sync/gmail/${channelId}`, {
        method: 'POST',
      })
      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.error || 'Sync failed')
      }
      
      const stats = result.result
      toast.success(result.message, {
        description: `${stats?.newEmails || 0} nieuwe emails, ${stats?.processed || 0} verwerkt van ${stats?.totalFound || 0} gevonden`,
      })
      
      queryClient.invalidateQueries({ queryKey: ['email-channel', channelId] })
      
    } catch (err: any) {
      console.error('Sync error:', err)
      toast.error('Email sync mislukt', {
        description: err.message,
      })
    }
  }

  const reconnectGmail = () => {
    if (!channel) return
    
    const params = new URLSearchParams({
      channelId: channel.id,
      channelName: channel.name,
      userId: 'current-user' // TODO: Get actual user ID
    })
    
    window.location.href = `/api/auth/gmail/connect?${params.toString()}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Channel laden...</div>
      </div>
    )
  }

  if (error || !channel) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Channel niet gevonden</h2>
          <p className="text-gray-600 mb-4">Dit email kanaal bestaat niet of je hebt geen toegang.</p>
          <Button onClick={() => router.push('/kanalen/email')}>
            Terug naar overzicht
          </Button>
        </div>
      </div>
    )
  }

  const hasTokens = tokens && tokens.access_token
  const emailAddress = (channel.settings as any)?.email_address

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/kanalen/email')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar email kanalen
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">{channel.name}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gmail kanaal configuratie
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {hasTokens ? (
              <Button onClick={syncEmails} className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Sync emails
              </Button>
            ) : (
              <Button onClick={reconnectGmail} className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Gmail koppelen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg ${hasTokens ? 'bg-green-100' : 'bg-red-100'}`}>
              <Mail className={`h-5 w-5 ${hasTokens ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Verbindingsstatus</h3>
              <p className={`text-sm ${hasTokens ? 'text-green-600' : 'text-red-600'}`}>
                {hasTokens ? 'Verbonden' : 'Niet verbonden'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Settings className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Email Adres</h3>
              <p className="text-sm text-gray-600">
                {emailAddress || 'Niet geconfigureerd'}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-purple-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-sm font-medium text-gray-900">Laatste Sync</h3>
              <p className="text-sm text-gray-600">
                {channel.last_sync 
                  ? new Date(channel.last_sync).toLocaleString('nl-NL')
                  : 'Nog niet gesynchroniseerd'
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Configuratie</h2>
        </div>
        
        <div className="p-6">
          {!hasTokens ? (
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Gmail niet gekoppeld</h3>
              <p className="text-gray-600 mb-4">
                Koppel je Gmail account om emails te kunnen synchroniseren.
              </p>
              <Button onClick={reconnectGmail} className="flex items-center gap-2 mx-auto">
                <Mail className="h-4 w-4" />
                Gmail koppelen
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Adres
                </label>
                <div className="text-sm text-gray-900">
                  {emailAddress || 'Niet beschikbaar'}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <div className="text-sm text-gray-900">Gmail</div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <div className="text-sm text-green-600">Actief en verbonden</div>
              </div>
              
              {tokens?.expires_at && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Token verloopt
                  </label>
                  <div className="text-sm text-gray-900">
                    {new Date(tokens.expires_at).toLocaleString('nl-NL')}
                  </div>
                </div>
              )}
              
              <div className="pt-4 border-t border-gray-200">
                <Button
                  variant="outline"
                  onClick={reconnectGmail}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Opnieuw koppelen
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sync Statistics */}
      {(channel.settings as any)?.last_sync_stats && (
        <div className="mt-6 bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Laatste Sync Statistieken</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries((channel.settings as any).last_sync_stats).map(([key, value]) => (
                <div key={key} className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{value as number}</div>
                  <div className="text-sm text-gray-500 capitalize">{key.replace('_', ' ')}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 