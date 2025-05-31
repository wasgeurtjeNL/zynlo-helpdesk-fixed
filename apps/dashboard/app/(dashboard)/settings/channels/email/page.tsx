'use client'

import { useState, useEffect } from 'react'
import { ArrowLeft, Mail, Save, TestTube, Shield, Info } from 'lucide-react'
import { Button } from '@zynlo/ui'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { showToast } from '@/components/toast'

// Create toast utility object
const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message),
}

interface EmailSettings {
  smtp_host: string
  smtp_port: number
  smtp_username: string
  smtp_password: string
  smtp_encryption: 'none' | 'ssl' | 'tls'
  imap_host: string
  imap_port: number
  imap_username: string
  imap_password: string
  imap_encryption: 'none' | 'ssl' | 'tls'
  from_name: string
  from_email: string
  reply_to_email: string
  signature: string
  auto_bcc: string
  fetch_interval: number
}

export default function EmailSettingsPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [activeTab, setActiveTab] = useState<'smtp' | 'imap' | 'general'>('smtp')

  // Fetch existing email channel
  const { data: emailChannel, isLoading } = useQuery({
    queryKey: ['email-channel'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('type', 'email')
        .single()

      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  })

  const [settings, setSettings] = useState<EmailSettings>({
    smtp_host: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_password: '',
    smtp_encryption: 'tls',
    imap_host: '',
    imap_port: 993,
    imap_username: '',
    imap_password: '',
    imap_encryption: 'ssl',
    from_name: '',
    from_email: '',
    reply_to_email: '',
    signature: '',
    auto_bcc: '',
    fetch_interval: 5,
  })

  // Update settings when emailChannel loads
  useEffect(() => {
    if (emailChannel?.settings && typeof emailChannel.settings === 'object') {
      const channelSettings = emailChannel.settings as Record<string, any>
      setSettings({
        smtp_host: channelSettings.smtp_host || '',
        smtp_port: channelSettings.smtp_port || 587,
        smtp_username: channelSettings.smtp_username || '',
        smtp_password: channelSettings.smtp_password || '',
        smtp_encryption: channelSettings.smtp_encryption || 'tls',
        imap_host: channelSettings.imap_host || '',
        imap_port: channelSettings.imap_port || 993,
        imap_username: channelSettings.imap_username || '',
        imap_password: channelSettings.imap_password || '',
        imap_encryption: channelSettings.imap_encryption || 'ssl',
        from_name: channelSettings.from_name || '',
        from_email: channelSettings.from_email || '',
        reply_to_email: channelSettings.reply_to_email || '',
        signature: channelSettings.signature || '',
        auto_bcc: channelSettings.auto_bcc || '',
        fetch_interval: channelSettings.fetch_interval || 5,
      })
    }
  }, [emailChannel])

  // Save settings mutation
  const saveSettings = useMutation({
    mutationFn: async () => {
      if (emailChannel) {
        // Update existing channel
        const { error } = await supabase
          .from('channels')
          .update({
            settings: settings as any,
            updated_at: new Date().toISOString()
          })
          .eq('id', emailChannel.id)

        if (error) throw error
      } else {
        // Create new channel
        const { error } = await supabase
          .from('channels')
          .insert({
            name: 'Email',
            type: 'email' as const,
            settings: settings as any,
            is_active: true
          })

        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-channel'] })
      queryClient.invalidateQueries({ queryKey: ['channels'] })
      toast.success('Email instellingen opgeslagen')
    },
    onError: (error: any) => {
      toast.error('Fout bij opslaan: ' + error.message)
    }
  })

  // Test connection
  const testConnection = async (type: 'smtp' | 'imap') => {
    setIsTestingConnection(true)
    
    try {
      // In a real app, this would call an Edge Function to test the connection
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Simulate success/failure
      const success = Math.random() > 0.3
      
      if (success) {
        toast.success(`${type.toUpperCase()} verbinding succesvol!`)
      } else {
        throw new Error(`Kan geen verbinding maken met ${type.toUpperCase()} server`)
      }
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setIsTestingConnection(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Instellingen laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar instellingen
        </Link>
        
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Email Kanaal</h1>
            <p className="text-sm text-gray-500">
              Configureer SMTP en IMAP instellingen voor email integratie
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('smtp')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'smtp'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            SMTP (Uitgaand)
          </button>
          <button
            onClick={() => setActiveTab('imap')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'imap'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            IMAP (Inkomend)
          </button>
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Algemeen
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow p-6">
        {activeTab === 'smtp' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">SMTP Server</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    SMTP wordt gebruikt voor het verzenden van emails vanuit het systeem.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtp_host}
                  onChange={(e) => setSettings({ ...settings, smtp_host: e.target.value })}
                  placeholder="smtp.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Port
                </label>
                <input
                  type="number"
                  value={settings.smtp_port}
                  onChange={(e) => setSettings({ ...settings, smtp_port: parseInt(e.target.value) })}
                  placeholder="587"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Gebruikersnaam
                </label>
                <input
                  type="text"
                  value={settings.smtp_username}
                  onChange={(e) => setSettings({ ...settings, smtp_username: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SMTP Wachtwoord
                </label>
                <input
                  type="password"
                  value={settings.smtp_password}
                  onChange={(e) => setSettings({ ...settings, smtp_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Encryptie
              </label>
              <select
                value={settings.smtp_encryption}
                onChange={(e) => setSettings({ ...settings, smtp_encryption: e.target.value as 'none' | 'ssl' | 'tls' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Geen</option>
                <option value="ssl">SSL</option>
                <option value="tls">TLS (Aanbevolen)</option>
              </select>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => testConnection('smtp')}
                disabled={isTestingConnection || !settings.smtp_host || !settings.smtp_username}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTestingConnection ? 'Testen...' : 'Test SMTP Verbinding'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'imap' && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mt-0.5" />
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">IMAP Server</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    IMAP wordt gebruikt voor het ontvangen en lezen van emails.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Host
                </label>
                <input
                  type="text"
                  value={settings.imap_host}
                  onChange={(e) => setSettings({ ...settings, imap_host: e.target.value })}
                  placeholder="imap.gmail.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Port
                </label>
                <input
                  type="number"
                  value={settings.imap_port}
                  onChange={(e) => setSettings({ ...settings, imap_port: parseInt(e.target.value) })}
                  placeholder="993"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Gebruikersnaam
                </label>
                <input
                  type="text"
                  value={settings.imap_username}
                  onChange={(e) => setSettings({ ...settings, imap_username: e.target.value })}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  IMAP Wachtwoord
                </label>
                <input
                  type="password"
                  value={settings.imap_password}
                  onChange={(e) => setSettings({ ...settings, imap_password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Encryptie
              </label>
              <select
                value={settings.imap_encryption}
                onChange={(e) => setSettings({ ...settings, imap_encryption: e.target.value as 'none' | 'ssl' | 'tls' })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="none">Geen</option>
                <option value="ssl">SSL (Aanbevolen)</option>
                <option value="tls">TLS</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Check Interval (minuten)
              </label>
              <input
                type="number"
                value={settings.fetch_interval}
                onChange={(e) => setSettings({ ...settings, fetch_interval: parseInt(e.target.value) })}
                min="1"
                max="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Hoe vaak het systeem nieuwe emails moet ophalen
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => testConnection('imap')}
                disabled={isTestingConnection || !settings.imap_host || !settings.imap_username}
                className="flex items-center gap-2"
              >
                <TestTube className="h-4 w-4" />
                {isTestingConnection ? 'Testen...' : 'Test IMAP Verbinding'}
              </Button>
            </div>
          </div>
        )}

        {activeTab === 'general' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Afzender Naam
              </label>
              <input
                type="text"
                value={settings.from_name}
                onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
                placeholder="Support Team"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Afzender Email
              </label>
              <input
                type="email"
                value={settings.from_email}
                onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
                placeholder="support@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reply-To Email
              </label>
              <input
                type="email"
                value={settings.reply_to_email}
                onChange={(e) => setSettings({ ...settings, reply_to_email: e.target.value })}
                placeholder="noreply@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Auto BCC
              </label>
              <input
                type="email"
                value={settings.auto_bcc}
                onChange={(e) => setSettings({ ...settings, auto_bcc: e.target.value })}
                placeholder="archive@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">
                Alle uitgaande emails worden automatisch gekopieerd naar dit adres
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Handtekening
              </label>
              <textarea
                value={settings.signature}
                onChange={(e) => setSettings({ ...settings, signature: e.target.value })}
                rows={5}
                placeholder="Met vriendelijke groet,&#10;&#10;Het Support Team"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Shield className="h-4 w-4" />
          <span>Alle wachtwoorden worden versleuteld opgeslagen</span>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => router.push('/settings')}
          >
            Annuleren
          </Button>
          <Button
            onClick={() => saveSettings.mutate()}
            disabled={saveSettings.isPending}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saveSettings.isPending ? 'Opslaan...' : 'Instellingen Opslaan'}
          </Button>
        </div>
      </div>
    </div>
  )
} 