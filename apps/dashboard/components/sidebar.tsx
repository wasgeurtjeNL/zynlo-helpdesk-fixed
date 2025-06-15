'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { 
  Inbox, 
  MessageSquare, 
  Users, 
  Settings, 
  ChevronDown,
  ChevronRight,
  Hash,
  Star,
  Archive,
  Trash2,
  AlertCircle,
  LogOut,
  User,
  CheckSquare,
  Edit3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTicketCounts, useTaskStats } from '@zynlo/supabase'
import { useAuthContext } from '@/components/auth-provider'
import { useRouter } from 'next/navigation'
import { ComposeModal } from './compose-modal'
import { toast } from 'sonner'
import { supabase } from '@zynlo/supabase'

const navigation = [
  {
    name: 'Inbox',
    href: '/inbox',
    icon: Inbox,
    children: [
      { name: 'Nieuw', href: '/inbox/nieuw' },
      { name: 'Open', href: '/inbox/open' },
      { name: 'In afwachting', href: '/inbox/afwachting' },
      { name: 'Opgelost', href: '/inbox/opgelost' },
      { name: 'Gesloten', href: '/inbox/gesloten' },
      { name: 'Spam', href: '/inbox/spam', icon: AlertCircle },
    ]
  },
  {
    name: 'Tickets',
    href: '/tickets',
    icon: MessageSquare,
    children: [
      { name: 'Alle tickets', href: '/tickets' },
      { name: 'Mijn tickets', href: '/tickets/mijn' },
      { name: 'Niet toegewezen', href: '/tickets/niet-toegewezen' },
      { name: 'Favorieten', href: '/tickets/favorieten', icon: Star },
      { name: 'Archief', href: '/tickets/archief', icon: Archive },
      { name: 'Prullenbak', href: '/tickets/prullenbak', icon: Trash2 },
    ]
  },
  {
    name: 'Taken',
    href: '/taken',
    icon: CheckSquare,
    children: [
      { name: 'Alle taken', href: '/taken' },
      { name: 'Mijn taken', href: '/taken/mijn' },
      { name: 'Team taken', href: '/taken/team' },
      { name: 'Voltooid', href: '/taken/voltooid' },
    ]
  },
  {
    name: 'Klanten',
    href: '/klanten',
    icon: Users,
  },
  {
    name: 'Instellingen',
    href: '/settings',
    icon: Settings,
  },
]

export function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [expandedItems, setExpandedItems] = useState<string[]>(['Inbox', 'Tickets', 'Taken'])
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const { user, signOut } = useAuthContext()
  const { data: counts } = useTicketCounts()
  const { data: taskStats } = useTaskStats(user?.id || '')

  const toggleExpanded = (itemName: string) => {
    setExpandedItems(prev =>
      prev.includes(itemName)
        ? prev.filter(item => item !== itemName)
        : [...prev, itemName]
    )
  }

  const handleSignOut = async () => {
    await signOut()
    // AuthProvider will handle the redirect
  }

  const handleSendEmail = async (data: {
    to: string
    cc?: string
    bcc?: string
    subject: string
    content: string
    isHtml?: boolean
    fromChannelId?: string
  }) => {
    try {
      toast.loading('Email wordt verzonden...', { id: 'send-email' })

      const {
        data: { session },
      } = await supabase.auth.getSession()

      const response = await fetch('/api/compose/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify(data),
        credentials: 'include',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to send email')
      }

      const result = await response.json()
      
      toast.success('Email succesvol verzonden!', { 
        id: 'send-email',
        description: `Verzonden naar ${data.to}${result.fromChannel ? ` via ${result.fromChannel}` : ''}`
      })
      
      // Optionally redirect to the new ticket
      if (result.ticketId) {
        router.push(`/tickets/${result.ticketId}`)
      }
    } catch (error) {
      console.error('Error sending email:', error)
      toast.error('Fout bij verzenden van email', { 
        id: 'send-email',
        description: error instanceof Error ? error.message : 'Onbekende fout'
      })
      throw error
    }
  }

  const getCountForPath = (path: string) => {
    if (!counts && !taskStats) return 0
    
    switch (path) {
      case '/inbox/nieuw':
        return counts?.new || 0
      case '/inbox/open':
        return counts?.open || 0
      case '/inbox/afwachting':
        return counts?.pending || 0
      case '/inbox/opgelost':
        return counts?.resolved || 0
      case '/inbox/gesloten':
        return counts?.closed || 0
      case '/inbox/spam':
        return counts?.spam || 0
      case '/tickets':
        return counts?.total || 0
      case '/tickets/mijn':
        return counts?.assigned_to_me || 0
      case '/tickets/niet-toegewezen':
        return counts?.unassigned || 0
      case '/tickets/favorieten':
        return counts?.favorites || 0
      // Task counts
      case '/taken':
        return taskStats?.total_tasks || 0
      case '/taken/mijn':
        return taskStats?.my_tasks || 0
      case '/taken/team':
        return taskStats?.total_tasks ? (taskStats.total_tasks - taskStats.my_tasks) : 0
      case '/taken/voltooid':
        return 0 // Could be added to taskStats if needed
      default:
        return 0
    }
  }

  return (
    <>
      <div className="flex h-full w-64 flex-col bg-gray-900">
        {/* Logo */}
        <div className="flex h-16 items-center px-6">
          <h1 className="text-base font-semibold text-white" style={{ fontSize: '1rem', lineHeight: '1.5rem' }}>Zynlo Helpdesk</h1>
        </div>

        {/* Compose Button */}
        <div className="px-3 pb-4">
          <button
            onClick={() => setIsComposeOpen(true)}
            className="flex w-full items-center justify-center space-x-2 rounded-md bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900"
          >
            <Edit3 className="h-4 w-4" />
            <span>Nieuw gesprek</span>
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3">
          {navigation.map((item) => {
            const isExpanded = expandedItems.includes(item.name)
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

            return (
              <div key={item.name}>
                <button
                  onClick={() => {
                    if (item.children) {
                      toggleExpanded(item.name)
                    } else {
                      router.push(item.href)
                    }
                  }}
                  className={cn(
                    'group flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-gray-800 text-white'
                      : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5 flex-shrink-0" />
                  <span className="flex-1 text-left">{item.name}</span>
                  {item.children && (
                    <span className="ml-auto">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>
                  )}
                </button>

                {item.children && isExpanded && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => {
                      const childIsActive = pathname === child.href
                      const count = getCountForPath(child.href)

                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'group flex items-center rounded-md py-2 pl-11 pr-3 text-sm transition-colors',
                            childIsActive
                              ? 'bg-gray-800 text-white'
                              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                          )}
                        >
                          {child.icon ? (
                            <child.icon className="mr-3 h-4 w-4" />
                          ) : (
                            <Hash className="mr-3 h-4 w-4" />
                          )}
                          <span className="flex-1">{child.name}</span>
                          {count > 0 && (
                            <span className="ml-auto rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                              {count}
                            </span>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </nav>

        {/* User menu */}
        <div className="border-t border-gray-800 p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-700 text-sm font-medium text-white">
                {user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="ml-auto rounded p-1 text-gray-400 hover:bg-gray-800 hover:text-white"
              title="Uitloggen"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
      />
    </>
  )
} 