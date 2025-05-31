'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Users,
  Zap,
  Globe,
  Palette,
  FileText,
  ArrowRight,
  Check
} from 'lucide-react'

const settingsCards = [
  {
    id: 'channels',
    title: 'Kanaal toevoegen',
    description: 'Maak contact met je klanten',
    icon: MessageSquare,
    iconBg: 'bg-green-100',
    iconColor: 'text-green-600',
    href: '/settings/channels',
    linkText: 'Alles zien',
  },
  {
    id: 'team',
    title: 'Nodig een collega uit',
    description: 'Ga samen aan de slag',
    icon: Users,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    href: '/settings/users',
    linkText: 'Nodig een collega uit',
  },
  {
    id: 'integrations',
    title: 'Integratie toevoegen',
    description: 'Verbind een mailbox en efficiënte workflow',
    icon: Zap,
    iconBg: 'bg-purple-100',
    iconColor: 'text-purple-600',
    href: '/settings/integrations',
    linkText: 'Alles zien',
    channels: [
      { name: 'Zapier', icon: '⚡' },
      { name: 'Slack', icon: '💬' },
      { name: 'Pipedrive', icon: '🎯' },
      { name: 'Magento', icon: '🛒' },
    ],
  },
]

const quickActions = [
  {
    id: 'portal',
    title: 'Je verzendportaal',
    description: 'Stel je verzendportaal in en personaliseer het',
    icon: Globe,
    href: '/settings/portal',
  },
  {
    id: 'widget',
    title: 'Maak een chat widget',
    description: 'Maak een chat widget voor je website',
    icon: MessageSquare,
    href: '/settings/widget',
  },
  {
    id: 'signature',
    title: 'Maak een handtekening',
    description: 'Voeg een handtekening toe aan je berichten',
    icon: FileText,
    href: '/settings/signature',
  },
  {
    id: 'theme',
    title: 'Een helpcentrum maken',
    description: 'Help je klanten met een kennisbank',
    icon: FileText,
    href: '/settings/helpcenter',
  },
]

export function OrganizationSettings() {
  const [completedActions, setCompletedActions] = useState<Set<string>>(new Set())

  const toggleCompleted = (actionId: string) => {
    setCompletedActions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(actionId)) {
        newSet.delete(actionId)
      } else {
        newSet.add(actionId)
      }
      return newSet
    })
  }

  return (
    <div className="space-y-8">
      {/* Help section */}
      <div className="bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Hulp nodig bij het opzetten?
        </h2>
        <p className="text-gray-600 mb-4">
          Laat ons een gesprek met klanten graag een beetje helpen 💙
        </p>
        <div className="flex gap-4">
          <button className="px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-50 border border-gray-300">
            Neem contact op
          </button>
          <button className="px-4 py-2 bg-white text-gray-700 rounded-md hover:bg-gray-50 border border-gray-300">
            Watch our Video Tutorials
          </button>
        </div>
      </div>

      {/* De basis section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">De basis</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {settingsCards.map((card) => (
            <div
              key={card.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 rounded-lg ${card.iconBg} ${card.iconColor} flex items-center justify-center mb-4`}>
                <card.icon className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{card.title}</h3>
              <p className="text-sm text-gray-600 mb-4">{card.description}</p>
              
              {card.channels && (
                <div className="flex gap-2 mb-4">
                  {card.channels.map((channel) => (
                    <div
                      key={channel.name}
                      className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center text-sm"
                      title={channel.name}
                    >
                      {channel.icon}
                    </div>
                  ))}
                </div>
              )}
              
              <a
                href={card.href}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
              >
                {card.linkText}
                <ArrowRight className="w-3 h-3" />
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Leer meer section */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Leer meer</h2>
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Stel de basis in</h3>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <div
                key={action.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                onClick={() => toggleCompleted(action.id)}
              >
                <button
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                    completedActions.has(action.id)
                      ? 'bg-blue-600 border-blue-600'
                      : 'border-gray-300'
                  }`}
                >
                  {completedActions.has(action.id) && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </button>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{action.title}</h4>
                  <p className="text-sm text-gray-600">{action.description}</p>
                </div>
                <a
                  href={action.href}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  Begin een gesprek
                  <ArrowRight className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mt-4">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Betere klantenservice bieden
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Maak een chat widget voor je website
            </p>
            <a
              href="/settings/customer-service"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              Maak een chat widget
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-2">
              Snel en efficiënt opschalen
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Gebruik automatisering om tijd te besparen
            </p>
            <a
              href="/settings/automation"
              className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
            >
              Maak een regel
              <ArrowRight className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6 mt-4">
          <h3 className="font-semibold text-gray-900 mb-2">
            Een helpcentrum maken
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Help je klanten met een kennisbank
          </p>
          <a
            href="/settings/helpcenter"
            className="text-sm text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1"
          >
            Een helpcentrum maken
            <ArrowRight className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  )
} 