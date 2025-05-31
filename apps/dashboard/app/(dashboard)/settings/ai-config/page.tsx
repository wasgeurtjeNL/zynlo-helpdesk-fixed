'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@zynlo/supabase'
import { supabase } from '@zynlo/supabase'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Loader2, Save, RefreshCw, Brain, MessageSquare, Settings } from 'lucide-react'
import { showToast } from '@/components/toast'
import { useRouter } from 'next/navigation'

interface AISettings {
  system_prompts: Record<string, string>
  user_prompt_template: { template: string }
  ai_config: {
    model: string
    temperature: number
    max_tokens: number
    suggestions_count: number
    enable_learning: boolean
    min_feedback_for_improvement: number
  }
}

export default function AIConfigPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'prompts' | 'config' | 'feedback'>('prompts')
  const [activeLanguage, setActiveLanguage] = useState('nl')
  const [settings, setSettings] = useState<AISettings | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  const languages = [
    { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
  ]

  // Check if user is admin
  useEffect(() => {
    async function checkAdmin() {
      // Wait for auth to load
      if (authLoading) {
        console.log('Auth still loading...')
        return
      }
      
      if (!user) {
        console.log('No user found, redirecting to settings')
        router.push('/settings')
        return
      }
      
      console.log('Checking admin status for user:', user.id, user.email)
      
      try {
        const { data: userData, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        console.log('User data from database:', userData, 'Error:', error)
        
        if (error) {
          console.error('Error fetching user role:', error)
          showToast('error', 'Fout bij het controleren van toegangsrechten')
          router.push('/settings')
          return
        }
        
        if (userData?.role === 'admin') {
          console.log('User is admin, granting access')
          setIsAdmin(true)
        } else {
          console.log('User is not admin, role:', userData?.role)
          showToast('error', 'Je hebt geen toegang tot deze pagina')
          router.push('/settings')
        }
      } catch (error) {
        console.error('Unexpected error checking admin status:', error)
        showToast('error', 'Er is een fout opgetreden')
        router.push('/settings')
      }
    }
    
    checkAdmin()
  }, [user, authLoading, router])

  // Load settings
  useEffect(() => {
    async function loadSettings() {
      // Only load settings if user is confirmed admin
      if (!isAdmin) {
        console.log('Not loading settings - admin status:', isAdmin)
        return
      }
      
      try {
        const { data, error } = await supabase
          .from('ai_settings')
          .select('*')
        
        if (error) throw error
        
        const settingsMap: any = {}
        data?.forEach(item => {
          settingsMap[item.setting_key] = item.setting_value
        })
        
        setSettings({
          system_prompts: settingsMap.system_prompts || {},
          user_prompt_template: settingsMap.user_prompt_template || { template: '' },
          ai_config: settingsMap.ai_config || {
            model: 'gpt-3.5-turbo',
            temperature: 0.7,
            max_tokens: 300,
            suggestions_count: 3,
            enable_learning: true,
            min_feedback_for_improvement: 10
          }
        })
      } catch (error) {
        console.error('Error loading settings:', error)
        showToast('error', 'Fout bij het laden van instellingen')
      } finally {
        setIsLoading(false)
      }
    }
    
    loadSettings()
  }, [isAdmin])

  // Save settings
  const handleSave = async () => {
    if (!settings || !user) return
    
    setIsSaving(true)
    
    try {
      // Save each setting
      const updates = [
        { setting_key: 'system_prompts', setting_value: settings.system_prompts },
        { setting_key: 'user_prompt_template', setting_value: settings.user_prompt_template },
        { setting_key: 'ai_config', setting_value: settings.ai_config }
      ]
      
      for (const update of updates) {
        const { error } = await supabase
          .from('ai_settings')
          .upsert({
            ...update,
            updated_by: user.id,
            updated_at: new Date().toISOString()
          }, { onConflict: 'setting_key' })
        
        if (error) throw error
      }
      
      showToast('success', 'AI instellingen opgeslagen')
    } catch (error) {
      console.error('Error saving settings:', error)
      showToast('error', 'Fout bij het opslaan van instellingen')
    } finally {
      setIsSaving(false)
    }
  }

  // Load feedback data
  const { data: feedbackData } = useQuery({
    queryKey: ['ai-feedback'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_feedback')
        .select('*, user:user_id(email, full_name)')
        .order('created_at', { ascending: false })
        .limit(100)
      
      if (error) throw error
      return data
    },
    enabled: activeTab === 'feedback' && isAdmin === true
  })

  // Show loading while checking auth
  if (authLoading || isAdmin === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">Toegangsrechten controleren...</p>
        </div>
      </div>
    )
  }

  // If not admin, don't show anything (redirect will happen)
  if (isAdmin === false) {
    return null
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!settings) {
    return (
      <div className="p-6">
        <p className="text-gray-600">Geen instellingen gevonden</p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-600" />
            <h1 className="text-xl font-semibold">AI Configuratie</h1>
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Opslaan
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b">
        <div className="flex gap-6 px-6">
          <button
            onClick={() => setActiveTab('prompts')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'prompts' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Prompts
            </div>
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'config' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Configuratie
            </div>
          </button>
          <button
            onClick={() => setActiveTab('feedback')}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === 'feedback' 
                ? 'border-purple-600 text-purple-600' 
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4" />
              Feedback & Training
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'prompts' && (
          <div className="max-w-4xl space-y-6">
            {/* Language selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taal selecteren
              </label>
              <div className="flex gap-2">
                {languages.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => setActiveLanguage(lang.code)}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      activeLanguage === lang.code
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <span className="mr-2">{lang.flag}</span>
                    {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* System prompt */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                System Prompt ({languages.find(l => l.code === activeLanguage)?.name})
              </label>
              <textarea
                value={settings.system_prompts[activeLanguage] || ''}
                onChange={(e) => setSettings({
                  ...settings,
                  system_prompts: {
                    ...settings.system_prompts,
                    [activeLanguage]: e.target.value
                  }
                })}
                className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                placeholder="Voer de system prompt in voor deze taal..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Dit bepaalt de persoonlijkheid en stijl van de AI voor deze taal
              </p>
            </div>

            {/* User prompt template */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                User Prompt Template
              </label>
              <textarea
                value={settings.user_prompt_template.template}
                onChange={(e) => setSettings({
                  ...settings,
                  user_prompt_template: { template: e.target.value }
                })}
                className="w-full h-48 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-mono"
                placeholder="Voer de user prompt template in..."
              />
              <p className="mt-1 text-xs text-gray-500">
                Gebruik {'{{context}}'} voor gesprek context en {'{{customerMessage}}'} voor het klantbericht
              </p>
            </div>
          </div>
        )}

        {activeTab === 'config' && (
          <div className="max-w-2xl space-y-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Model */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  AI Model
                </label>
                <select
                  value={settings.ai_config.model}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai_config: { ...settings.ai_config, model: e.target.value }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                  <option value="gpt-4">GPT-4</option>
                  <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
                </select>
              </div>

              {/* Temperature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Temperature
                </label>
                <input
                  type="number"
                  min="0"
                  max="2"
                  step="0.1"
                  value={settings.ai_config.temperature}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai_config: { ...settings.ai_config, temperature: parseFloat(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  0 = deterministisch, 2 = creatief
                </p>
              </div>

              {/* Max tokens */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Tokens
                </label>
                <input
                  type="number"
                  min="50"
                  max="1000"
                  value={settings.ai_config.max_tokens}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai_config: { ...settings.ai_config, max_tokens: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Suggestions count */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Aantal Suggesties
                </label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={settings.ai_config.suggestions_count}
                  onChange={(e) => setSettings({
                    ...settings,
                    ai_config: { ...settings.ai_config, suggestions_count: parseInt(e.target.value) }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            {/* Learning settings */}
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Learning & Feedback</h3>
              
              <div className="space-y-4">
                <label className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={settings.ai_config.enable_learning}
                    onChange={(e) => setSettings({
                      ...settings,
                      ai_config: { ...settings.ai_config, enable_learning: e.target.checked }
                    })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                  />
                  <span className="text-sm text-gray-700">
                    Gebruik feedback om suggesties te verbeteren
                  </span>
                </label>

                {settings.ai_config.enable_learning && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum feedback voor verbetering
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={settings.ai_config.min_feedback_for_improvement}
                      onChange={(e) => setSettings({
                        ...settings,
                        ai_config: { 
                          ...settings.ai_config, 
                          min_feedback_for_improvement: parseInt(e.target.value) 
                        }
                      })}
                      className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Aantal feedback items nodig voordat de AI zijn gedrag aanpast
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'feedback' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg border">
              <div className="px-4 py-3 border-b">
                <h3 className="font-medium text-gray-900">Feedback Overzicht</h3>
              </div>
              
              {feedbackData && feedbackData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Gebruiker</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Suggestie</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rating</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Toegepast</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Feedback</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Datum</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feedbackData.map((item: any) => (
                        <tr key={item.id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">
                            {item.user?.full_name || item.user?.email}
                          </td>
                          <td className="px-4 py-2 text-sm max-w-xs truncate">
                            {item.suggestion}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.rating ? (
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <span
                                    key={i}
                                    className={i < item.rating ? 'text-yellow-400' : 'text-gray-300'}
                                  >
                                    ★
                                  </span>
                                ))}
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {item.applied ? (
                              <span className="text-green-600">✓</span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-sm max-w-xs truncate">
                            {item.feedback_text || '-'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {new Date(item.created_at).toLocaleDateString('nl-NL')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-4 py-8 text-center text-gray-500">
                  Nog geen feedback ontvangen
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">AI Training Info</h4>
              <p className="text-sm text-blue-700">
                De AI gebruikt feedback om zijn suggesties te verbeteren. Wanneer gebruikers suggesties 
                beoordelen of aanpassen, wordt deze informatie gebruikt om betere antwoorden te genereren. 
                {settings.ai_config.enable_learning ? (
                  <span> Learning is momenteel <strong>ingeschakeld</strong>.</span>
                ) : (
                  <span> Learning is momenteel <strong>uitgeschakeld</strong>.</span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 