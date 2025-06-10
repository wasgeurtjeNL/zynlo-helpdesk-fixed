'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Building2,
  Users,
  Hash,
  Zap,
  Palette,
  Globe,
  CreditCard,
  Shield,
  Bell,
  Puzzle,
  Code,
  FileText,
  HelpCircle,
  ChevronLeft,
  Brain,
  Activity,
  User,
  Tag,
  CheckSquare,
  Languages,
  Bot,
  BarChart3,
  Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthContext } from '@/components/auth-provider'
import { useEffect, useState } from 'react'
import { supabase } from '@zynlo/supabase'

const settingsNavigation = [
  {
    title: 'Organisatie',
    items: [
      { id: 'organization', label: 'Organisatie', icon: Building2, href: '/settings/organization' },
      { id: 'teams', label: 'Teams', icon: Users, href: '/settings/teams' },
      { id: 'users', label: 'Gebruikers', icon: Users, href: '/settings/users' },
    ],
  },
  {
    title: 'Kanalen',
    items: [
      { id: 'whatsapp', label: 'WhatsApp Business', icon: Hash, href: '/settings/channels/whatsapp' },
      { id: 'facebook', label: 'Facebook', icon: Hash, href: '/settings/channels/facebook' },
      { id: 'instagram', label: 'Instagram', icon: Hash, href: '/settings/channels/instagram' },
      { id: 'email', label: 'E-mail', icon: Hash, href: '/settings/channels/email' },
      { id: 'livechat', label: 'Live chat', icon: Hash, href: '/settings/channels/livechat' },
      { id: 'telegram', label: 'Telegram', icon: Hash, href: '/settings/channels/telegram' },
      { id: 'sms', label: 'SMS', icon: Hash, href: '/settings/channels/sms' },
    ],
  },
  {
    title: 'Automatisering',
    items: [
      { id: 'rules', label: 'Regels', icon: Zap, href: '/settings/automation/rules' },
      { id: 'flowbots', label: 'Flowbots', icon: Zap, href: '/settings/automation/flowbots' },
      { id: 'ai-journeys', label: 'AI Journeys', icon: Zap, href: '/settings/automation/ai-journeys' },
      { id: 'auto-replies', label: 'Automatische antwoorden', icon: Zap, href: '/settings/automation/auto-replies' },
      { id: 'widget-customization', label: 'Widget aanpassingen', icon: Palette, href: '/settings/widget' },
      { id: 'translations', label: 'Vertalingen', icon: Globe, href: '/settings/translations' },
    ],
  },
  {
    title: 'AI & Machine Learning',
    items: [
      { id: 'ai-config', label: 'AI Configuratie', icon: Brain, href: '/settings/ai-config' },
      { id: 'ai-usage', label: 'AI Gebruik & Kosten', icon: Activity, href: '/settings/ai-usage' },
      { id: 'ai-learning', label: 'AI Learning Center', icon: Sparkles, href: '/settings/ai-learning', adminOnly: true },
    ],
  },
  {
    title: 'Instellingen',
    items: [
      { id: 'inbox', label: 'Inbox', icon: Building2, href: '/settings/inbox' },
      { id: 'integrations', label: 'Integraties', icon: Puzzle, href: '/settings/integrations' },
      { id: 'api', label: 'API', icon: Code, href: '/settings/api' },
      { id: 'webhooks', label: 'Webhooks', icon: Code, href: '/settings/webhooks' },
      { id: 'logs', label: 'Logs', icon: FileText, href: '/settings/logs' },
    ],
  },
  {
    title: 'Account',
    items: [
      { id: 'billing', label: 'Facturering', icon: CreditCard, href: '/settings/billing' },
      { id: 'security', label: 'Beveiliging', icon: Shield, href: '/settings/security' },
      { id: 'notifications', label: 'Notificaties', icon: Bell, href: '/settings/notifications' },
    ],
  },
]

export function SettingsSidebar() {
  const pathname = usePathname()
  const { user } = useAuthContext()
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    async function checkRole() {
      if (user) {
        const { data } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setIsAdmin(data?.role === 'admin')
      }
    }
    checkRole()
  }, [user])

  const navigation = [
    { name: 'Profiel', href: '/settings/profile', icon: User },
    { name: 'Notificaties', href: '/settings/notifications', icon: Bell },
    { name: 'Beveiliging', href: '/settings/security', icon: Shield },
    { name: 'Abonnement', href: '/settings/subscription', icon: CreditCard },
  ]

  const teamNavigation = [
    { name: 'Team Leden', href: '/settings/team', icon: Users },
    { name: 'Labels', href: '/settings/labels', icon: Tag },
    { name: 'Taken', href: '/settings/tasks', icon: CheckSquare },
    { name: 'Kanalen', href: '/settings/channels', icon: HelpCircle },
    { name: 'Talen', href: '/settings/languages', icon: Languages },
  ]

  const adminNavigation = [
    { name: 'AI Configuratie', href: '/settings/ai-config', icon: Bot },
    { name: 'AI Gebruik', href: '/settings/ai-usage', icon: BarChart3 },
    { name: 'AI Learning', href: '/settings/ai-learning', icon: Sparkles },
  ]

  return (
    <aside className="w-64 bg-gray-50 border-r border-gray-200 overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <Link
          href="/inbox/nieuw"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Terug naar inbox</span>
        </Link>
      </div>

      <nav className="p-4">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Instellingen</h2>
        
        {settingsNavigation.map((section) => (
          <div key={section.title} className="mb-6">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              {section.title}
            </h3>
            <div className="space-y-1">
              {section.items.map((item) => {
                // Skip admin-only items for non-admin users
                if (item.adminOnly && !isAdmin) {
                  return null
                }
                
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.id}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors",
                      isActive
                        ? "bg-blue-50 text-blue-600"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span>{item.label}</span>
                    {item.adminOnly && (
                      <span className="ml-auto text-xs text-gray-500">Admin</span>
                    )}
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <nav className="space-y-8 bg-gray-50 h-full p-4">
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Persoonlijk
          </h3>
          <ul className="mt-3 space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md
                      ${isActive 
                        ? 'bg-gray-200 text-gray-900' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        flex-shrink-0 -ml-1 mr-3 h-6 w-6
                        ${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Team
          </h3>
          <ul className="mt-3 space-y-1">
            {teamNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`
                      group flex items-center px-3 py-2 text-sm font-medium rounded-md
                      ${isActive 
                        ? 'bg-gray-200 text-gray-900' 
                        : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                      }
                    `}
                  >
                    <item.icon
                      className={`
                        flex-shrink-0 -ml-1 mr-3 h-6 w-6
                        ${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'}
                      `}
                    />
                    <span className="truncate">{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>

        {isAdmin && (
          <div>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Admin
            </h3>
            <ul className="mt-3 space-y-1">
              {adminNavigation.map((item) => {
                const isActive = pathname === item.href
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`
                        group flex items-center px-3 py-2 text-sm font-medium rounded-md
                        ${isActive 
                          ? 'bg-gray-200 text-gray-900' 
                          : 'text-gray-700 hover:text-gray-900 hover:bg-gray-100'
                        }
                      `}
                    >
                      <item.icon
                        className={`
                          flex-shrink-0 -ml-1 mr-3 h-6 w-6
                          ${isActive ? 'text-gray-500' : 'text-gray-400 group-hover:text-gray-500'}
                        `}
                      />
                      <span className="truncate">{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  )
} 