'use client'

import { useState } from 'react'
import { Button } from '@/lib/ui'
import { 
  Smartphone, 
  MessageSquare, 
  Settings, 
  Key, 
  Globe, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  Copy,
  Plus,
  Trash2,
  RefreshCw,
  Send,
  FileText
} from 'lucide-react'
import { showToast } from '@/components/toast'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { useParams } from 'next/navigation'

// Create toast utility
const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message),
}

interface WhatsAppSettings {
  phone_number?: string
  phone_number_id?: string
  business_account_id?: string
  access_token?: string
  webhook_verify_token?: string
  display_name?: string
  quality_rating?: string
  messaging_limit?: string
  status?: 'connected' | 'disconnected' | 'pending'
  [key: string]: any
}

interface MessageTemplate {
  id: string
  name: string
  category: string
  language: string
  status: 'APPROVED' | 'PENDING' | 'REJECTED'
  components: Array<{
    type: string
    text?: string
    format?: string
    buttons?: Array<{
      type: string
      text: string
      url?: string
      phone_number?: string
    }>
  }>
}

export default function WhatsAppSettingsPage() {
  const params = useParams()
  const projectId = params.project_id as string
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState('configuration')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [webhookCopied, setWebhookCopied] = useState(false)
  
  // Fetch WhatsApp channel settings
  const { data: channel, isLoading } = useQuery({
    queryKey: ['whatsapp-channel', projectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('channels')
        .select('*')
        .eq('type', 'whatsapp')
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    }
  })
  
  // Extract settings from the channel
  const settings = (channel?.settings || {}) as WhatsAppSettings
  
  // Store templates in local state for now (in production, these would be in a separate table)
  const [templates, setTemplates] = useState<MessageTemplate[]>([])
  
  // Update settings mutation
  const updateSettings = useMutation({
    mutationFn: async (updates: Partial<WhatsAppSettings>) => {
      const newSettings = { ...settings, ...updates }
      
      if (channel) {
        // Update existing channel
        const { error } = await supabase
          .from('channels')
          .update({
            settings: newSettings,
            updated_at: new Date().toISOString()
          })
          .eq('id', channel.id)
        
        if (error) throw error
      } else {
        // Create new channel
        const { error } = await supabase
          .from('channels')
          .insert({
            name: 'WhatsApp',
            type: 'whatsapp' as const,
            settings: newSettings,
            is_active: true,
            color: '#25D366',
            icon: 'message-square'
          })
        
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-channel', projectId] })
      toast.success('Instellingen bijgewerkt')
    },
    onError: () => {
      toast.error('Fout bij opslaan')
    }
  })
  
  // Test connection
  const testConnection = async () => {
    setIsTestingConnection(true)
    try {
      // In production, this would make an API call to verify the WhatsApp credentials
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock success for now
      const success = settings?.access_token && settings?.phone_number_id
      
      if (success) {
        toast.success('Verbinding succesvol')
        updateSettings.mutate({ status: 'connected' })
      } else {
        throw new Error('Ongeldige configuratie')
      }
    } catch (error) {
      toast.error('Verbinding mislukt')
      updateSettings.mutate({ status: 'disconnected' })
    } finally {
      setIsTestingConnection(false)
    }
  }
  
  // Copy webhook URL
  const copyWebhookUrl = () => {
    const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL}/webhooks/whatsapp/${projectId}`
    navigator.clipboard.writeText(webhookUrl)
    setWebhookCopied(true)
    setTimeout(() => setWebhookCopied(false), 2000)
    toast.success('Webhook URL gekopieerd')
  }
  
  // Sync templates from WhatsApp
  const syncTemplates = useMutation({
    mutationFn: async () => {
      // In production, this would fetch templates from WhatsApp API
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Mock template sync
      const mockTemplates: MessageTemplate[] = [
        {
          id: '1',
          name: 'order_confirmation',
          category: 'TRANSACTIONAL',
          language: 'nl',
          status: 'APPROVED',
          components: [
            {
              type: 'HEADER',
              format: 'TEXT',
              text: 'Orderbevestiging'
            },
            {
              type: 'BODY',
              text: 'Hallo {{1}}, uw bestelling #{{2}} is bevestigd en wordt verwerkt.'
            },
            {
              type: 'FOOTER',
              text: 'Bedankt voor uw bestelling!'
            }
          ]
        }
      ]
      
      // Store templates in local state
      setTemplates(mockTemplates)
      
      // In production, save to database
      // For now, we could store in channel settings
      updateSettings.mutate({ 
        message_templates: mockTemplates 
      })
    },
    onSuccess: () => {
      toast.success('Templates gesynchroniseerd')
    }
  })
  
  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Laden...</div>
  }
  
  const webhookUrl = `${process.env.NEXT_PUBLIC_API_URL || 'https://api.yourdomain.com'}/webhooks/whatsapp/${projectId}`
  
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">WhatsApp Business</h2>
          <p className="text-gray-500">
            Configureer WhatsApp Business API voor uw helpdesk
          </p>
        </div>
        <div className="flex items-center gap-2">
          {settings?.status === 'connected' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <CheckCircle2 className="h-3 w-3" />
              Verbonden
            </span>
          ) : settings?.status === 'pending' ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
              <AlertCircle className="h-3 w-3" />
              In afwachting
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
              <XCircle className="h-3 w-3" />
              Niet verbonden
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div>
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('configuration')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configuration'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Settings className="h-4 w-4 inline mr-2" />
              Configuratie
            </button>
            <button
              onClick={() => setActiveTab('webhook')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'webhook'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Globe className="h-4 w-4 inline mr-2" />
              Webhook
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="h-4 w-4 inline mr-2" />
              Message Templates
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <MessageSquare className="h-4 w-4 inline mr-2" />
              Berichtinstellingen
            </button>
          </nav>
        </div>

        <div className="mt-6">
          {activeTab === 'configuration' && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">WhatsApp Business API</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Vul uw WhatsApp Business API gegevens in om berichten te kunnen ontvangen en versturen.
                  </p>
                  
                  <div className="mt-6 space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label htmlFor="phone-number" className="block text-sm font-medium text-gray-700">
                          Telefoonnummer
                        </label>
                        <div className="flex gap-2">
                          <Smartphone className="h-4 w-4 mt-3 text-gray-400" />
                          <input
                            id="phone-number"
                            type="tel"
                            placeholder="+31 6 12345678"
                            value={settings?.phone_number || ''}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings.mutate({ phone_number: e.target.value })}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                          />
                        </div>
                        <p className="text-sm text-gray-500">
                          Het telefoonnummer gekoppeld aan uw WhatsApp Business account
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="display-name" className="block text-sm font-medium text-gray-700">
                          Weergavenaam
                        </label>
                        <input
                          id="display-name"
                          placeholder="Uw Bedrijfsnaam"
                          value={settings?.display_name || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings.mutate({ display_name: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <p className="text-sm text-gray-500">
                          De naam die klanten zien in WhatsApp
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="phone-number-id" className="block text-sm font-medium text-gray-700">
                          Phone Number ID
                        </label>
                        <input
                          id="phone-number-id"
                          placeholder="1234567890123456"
                          value={settings?.phone_number_id || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings.mutate({ phone_number_id: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <p className="text-sm text-gray-500">
                          Te vinden in uw WhatsApp Business dashboard
                        </p>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="business-account-id" className="block text-sm font-medium text-gray-700">
                          Business Account ID
                        </label>
                        <input
                          id="business-account-id"
                          placeholder="1234567890123456"
                          value={settings?.business_account_id || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings.mutate({ business_account_id: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                        <p className="text-sm text-gray-500">
                          Uw WhatsApp Business Account ID
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="access-token" className="block text-sm font-medium text-gray-700">
                        Access Token
                      </label>
                      <div className="flex gap-2">
                        <Key className="h-4 w-4 mt-3 text-gray-400" />
                        <input
                          id="access-token"
                          type="password"
                          placeholder="EAAxxxxxxxxxx..."
                          value={settings?.access_token || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings.mutate({ access_token: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <p className="text-sm text-gray-500">
                        Uw permanente WhatsApp Business API access token
                      </p>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                      <Button
                        variant="outline"
                        onClick={testConnection}
                        disabled={isTestingConnection}
                      >
                        {isTestingConnection ? (
                          <>
                            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            Testen...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-4 w-4" />
                            Test Verbinding
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {settings?.status === 'connected' && (
                <div className="bg-white shadow rounded-lg">
                  <div className="px-4 py-5 sm:p-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Account Status</h3>
                    <p className="mt-1 text-sm text-gray-600">
                      Informatie over uw WhatsApp Business account
                    </p>
                    
                    <div className="mt-6 grid gap-4 md:grid-cols-3">
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Kwaliteitsscore</p>
                        <p className="text-lg font-medium">
                          {settings?.quality_rating || 'Groen'} 
                          <CheckCircle2 className="inline h-4 w-4 ml-1 text-green-500" />
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Berichtenlimiet</p>
                        <p className="text-lg font-medium">{settings?.messaging_limit || '1.000/dag'}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-gray-500">Laatst gesynchroniseerd</p>
                        <p className="text-lg font-medium">
                          {channel ? new Date(channel.updated_at || Date.now()).toLocaleString('nl-NL') : 'Nooit'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'webhook' && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Webhook Configuratie</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Configureer de webhook URL in uw WhatsApp Business dashboard om berichten te ontvangen.
                  </p>
                  
                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Webhook URL
                      </label>
                      <div className="flex gap-2">
                        <input
                          value={webhookUrl}
                          readOnly
                          className="block w-full rounded-md border-gray-300 bg-gray-50 shadow-sm font-mono text-sm"
                        />
                        <Button
                          variant="outline"
                          onClick={copyWebhookUrl}
                        >
                          {webhookCopied ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500">
                        Kopieer deze URL en configureer hem in uw WhatsApp Business dashboard
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="verify-token" className="block text-sm font-medium text-gray-700">
                        Webhook Verify Token
                      </label>
                      <input
                        id="verify-token"
                        type="text"
                        placeholder="your-verify-token"
                        value={settings?.webhook_verify_token || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => updateSettings.mutate({ webhook_verify_token: e.target.value })}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-sm text-gray-500">
                        Een geheime token voor webhook verificatie
                      </p>
                    </div>

                    <div className="rounded-md bg-yellow-50 p-4">
                      <div className="flex">
                        <AlertCircle className="h-5 w-5 text-yellow-400" />
                        <div className="ml-3">
                          <p className="text-sm text-yellow-800">
                            Zorg ervoor dat u de volgende webhook events aanzet in WhatsApp:
                          </p>
                          <ul className="list-disc list-inside mt-2 text-sm text-yellow-700">
                            <li>messages</li>
                            <li>message_status</li>
                            <li>message_template_status_update</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'templates' && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Message Templates</h3>
                      <p className="mt-1 text-sm text-gray-600">
                        Beheer uw goedgekeurde WhatsApp message templates
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => syncTemplates.mutate()}
                      disabled={syncTemplates.isPending}
                    >
                      {syncTemplates.isPending ? (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                          Synchroniseren...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Synchroniseer Templates
                        </>
                      )}
                    </Button>
                  </div>
                  
                  <div className="mt-6">
                    {templates.length === 0 ? (
                      <div className="text-center py-8">
                        <MessageSquare className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500">
                          Geen message templates gevonden. Synchroniseer eerst uw templates.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="border rounded-lg p-4 space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{template.name}</h4>
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                  template.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                  template.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' : 
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {template.status}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {template.category}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {template.language}
                                </span>
                              </div>
                            </div>
                            
                            <div className="space-y-2 text-sm">
                              {template.components.map((component, idx) => (
                                <div key={idx} className="pl-4">
                                  <span className="font-medium text-gray-500">
                                    {component.type}:
                                  </span>{' '}
                                  {component.text || component.format}
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">Berichtinstellingen</h3>
                  <p className="mt-1 text-sm text-gray-600">
                    Configureer hoe berichten worden verwerkt en weergegeven
                  </p>
                  
                  <div className="mt-6 space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Automatisch ticket aanmaken</label>
                          <p className="text-sm text-gray-500">
                            Maak automatisch een ticket aan voor nieuwe gesprekken
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 rounded" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Bevestiging ontvangst</label>
                          <p className="text-sm text-gray-500">
                            Stuur automatisch een ontvangstbevestiging
                          </p>
                        </div>
                        <input type="checkbox" className="h-4 w-4 text-blue-600 rounded" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <label className="text-sm font-medium text-gray-700">Media downloads</label>
                          <p className="text-sm text-gray-500">
                            Download automatisch ontvangen media bestanden
                          </p>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 text-blue-600 rounded" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="welcome-message" className="block text-sm font-medium text-gray-700">
                        Welkomstbericht
                      </label>
                      <textarea
                        id="welcome-message"
                        placeholder="Hallo! Bedankt voor uw bericht. Een van onze medewerkers helpt u zo snel mogelijk."
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-sm text-gray-500">
                        Dit bericht wordt verstuurd bij het eerste contact
                      </p>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="away-message" className="block text-sm font-medium text-gray-700">
                        Afwezigheidsbericht
                      </label>
                      <textarea
                        id="away-message"
                        placeholder="Bedankt voor uw bericht. We zijn momenteel gesloten. We reageren tijdens kantooruren."
                        rows={3}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                      <p className="text-sm text-gray-500">
                        Dit bericht wordt verstuurd buiten kantooruren
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 