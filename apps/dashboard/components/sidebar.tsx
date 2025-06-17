'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  Edit3,
  Home,
  FolderOpen,
  Calendar,
  FileText,
  Bell,
  Mail,
  Plus,
  Check,
  Zap,
  LayoutDashboard,
  Tag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTicketCounts, useTaskStats } from '@zynlo/supabase';
import { useAuthContext } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { ComposeModal } from './compose-modal';
import { toast } from 'sonner';
import { supabase } from '@zynlo/supabase';

const navigation = [
  {
    name: 'Dashboard',
    href: '/inbox/nieuw',
    icon: LayoutDashboard,
  },
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
    ],
  },
  {
    name: 'Tickets',
    href: '/tickets',
    icon: MessageSquare,
    children: [
      { name: 'Alle tickets', href: '/tickets' },
      { name: 'Toegewezen', href: '/inbox/toegewezen' },
      { name: 'Favorieten', href: '/tickets/favorieten', icon: Star },
    ],
  },
  {
    name: 'Klanten',
    href: '/klanten',
    icon: Users,
  },
  {
    name: 'Teams',
    href: '/teams',
    icon: Users,
  },
];

const channels = [
  { name: 'Email Support', color: 'bg-blue-500', href: '/kanalen/email' },
  { name: 'Live Chat', color: 'bg-green-500', href: '/kanalen/chat' },
  { name: 'WhatsApp', color: 'bg-emerald-500', href: '/kanalen/whatsapp' },
  { name: 'Social Media', color: 'bg-purple-500', href: '/kanalen/social' },
];

const quickActions = [
  { name: 'Nieuw gesprek', icon: Edit3, href: '#', action: 'compose' },
  { name: 'Planning', icon: Calendar, href: '/planning' },
  { name: 'Rapporten', icon: FileText, href: '/rapporten' },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedItems, setExpandedItems] = useState<string[]>(['Inbox', 'Tickets']);
  const [showChannels, setShowChannels] = useState(true);
  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const { user, signOut } = useAuthContext();
  const { data: counts } = useTicketCounts();
  const { data: taskStats } = useTaskStats(user?.id || '');

  // Close workspace dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('#workspace-dropdown')) {
        setWorkspaceOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const toggleExpanded = (itemName: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemName) ? prev.filter((item) => item !== itemName) : [...prev, itemName]
    );
  };

  const handleSignOut = async () => {
    await signOut();
    // AuthProvider will handle the redirect
  };

  const handleSendEmail = async (data: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    content: string;
    isHtml?: boolean;
    fromChannelId?: string;
  }) => {
    try {
      toast.loading('Email wordt verzonden...', { id: 'send-email' });

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await fetch('/api/compose/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }),
        },
        body: JSON.stringify(data),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send email');
      }

      const result = await response.json();

      toast.success('Email succesvol verzonden!', {
        id: 'send-email',
        description: `Verzonden naar ${data.to}${result.fromChannel ? ` via ${result.fromChannel}` : ''}`,
      });

      // Optionally redirect to the new ticket
      if (result.ticketId) {
        router.push(`/tickets/${result.ticketId}`);
      }
    } catch (error) {
      console.error('Error sending email:', error);
      toast.error('Fout bij verzenden van email', {
        id: 'send-email',
        description: error instanceof Error ? error.message : 'Onbekende fout',
      });
      throw error;
    }
  };

  const getCountForPath = (path: string) => {
    if (!counts && !taskStats) return 0;

    switch (path) {
      case '/inbox/nieuw':
        return counts?.new || 0;
      case '/inbox/open':
        return counts?.open || 0;
      case '/inbox/afwachting':
        return counts?.pending || 0;
      case '/inbox/opgelost':
        return counts?.resolved || 0;
      case '/inbox/gesloten':
        return counts?.closed || 0;
      case '/inbox/spam':
        return counts?.spam || 0;
      case '/tickets':
        return counts?.total || 0;
      case '/inbox/toegewezen':
        return counts?.assigned_to_me || 0;
      case '/tickets/favorieten':
        return counts?.favorites || 0;
      default:
        return 0;
    }
  };

  return (
    <>
      <style jsx global>{`
        .beautiful-shadow {
          box-shadow:
            0px 0px 0px 1px rgba(0, 0, 0, 0.06),
            0px 1px 1px -0.5px rgba(0, 0, 0, 0.06),
            0px 3px 3px -1.5px rgba(0, 0, 0, 0.06),
            0px 6px 6px -3px rgba(0, 0, 0, 0.06),
            0px 12px 12px -6px rgba(0, 0, 0, 0.06),
            0px 24px 24px -12px rgba(0, 0, 0, 0.06);
        }
        .beautiful-shadow-dark {
          box-shadow:
            0px 0px 0px 1px rgba(0, 0, 0, 0.15),
            0px 1px 1px -0.5px rgba(0, 0, 0, 0.15),
            0px 3px 3px -1.5px rgba(0, 0, 0, 0.15),
            0px 6px 6px -3px rgba(0, 0, 0, 0.15),
            0px 12px 12px -6px rgba(0, 0, 0, 0.15),
            0px 24px 24px -12px rgba(0, 0, 0, 0.15);
        }
        .scroll-hide::-webkit-scrollbar {
          display: none;
        }
        .scroll-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>

      <aside className="w-80 beautiful-shadow-dark overflow-hidden bg-slate-900 border-slate-700 rounded-2xl h-full">
        {/* Workspace header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800">
          <button
            id="workspace-dropdown"
            onClick={() => setWorkspaceOpen(!workspaceOpen)}
            className="flex items-center gap-2 hover:bg-slate-700 transition-all text-sm font-semibold bg-slate-800 border-slate-700 border rounded-xl py-2.5 px-4 beautiful-shadow-dark"
          >
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-white">Zynlo</span>
            <ChevronDown className="w-4 h-4 text-slate-400" />
          </button>
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold beautiful-shadow-dark">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900"></div>
          </div>
        </div>

        {/* Workspace dropdown */}
        {workspaceOpen && (
          <div className="mx-5 mt-2 rounded-xl bg-gradient-to-br from-slate-800 to-slate-700 beautiful-shadow-dark border border-slate-600 p-5 text-sm">
            <div className="mb-4 pb-4 border-b border-slate-600">
              <p className="font-semibold text-white">
                {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
              </p>
              <p className="text-slate-400 text-xs mt-1">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-xs text-slate-300">Online</span>
              </div>
            </div>
            <button className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg hover:bg-slate-600/60 transition-colors">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="font-medium text-white">Zynlo Support</span>
              <Check className="w-4 h-4 ml-auto text-green-400" />
            </button>
            <hr className="my-4 border-slate-600" />
            <Link
              href="/settings"
              className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg hover:bg-slate-600/60 transition-colors text-slate-300 hover:text-white"
            >
              <Settings className="w-4 h-4" />
              <span>Instellingen</span>
            </Link>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 w-full py-2.5 px-2 rounded-lg hover:bg-slate-600/60 transition-colors text-red-400 hover:text-red-300"
            >
              <LogOut className="w-4 h-4" />
              <span>Uitloggen</span>
            </button>
          </div>
        )}

        {/* Navigation */}
        <nav className="select-none text-sm text-white pt-6 px-2 flex-1 overflow-y-auto scroll-hide">
          {navigation.map((item) => {
            const isExpanded = expandedItems.includes(item.name);
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

            if (!item.children) {
              const itemIsActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors',
                    itemIsActive
                      ? 'bg-gradient-to-r from-blue-600 to-purple-600 beautiful-shadow-dark text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.name}</span>
                </Link>
              );
            }

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleExpanded(item.name)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 mx-2 rounded-xl transition-colors w-full',
                    isActive
                      ? 'bg-slate-800 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex-1 text-left font-medium">{item.name}</span>
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>

                {isExpanded && (
                  <div className="mt-1 space-y-1">
                    {item.children.map((child) => {
                      const childIsActive = pathname === child.href;
                      const count = getCountForPath(child.href);

                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={cn(
                            'block pl-9 py-2 mx-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors',
                            childIsActive && 'text-white bg-slate-800'
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span>{child.name}</span>
                            {count > 0 && (
                              <span className="text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-full">
                                {count}
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* Kanalen Section */}
          <div className="px-4 mt-6">
            <button
              onClick={() => setShowChannels(!showChannels)}
              className="flex items-center gap-2 w-full text-slate-400 uppercase text-xs tracking-wider font-semibold mb-3"
            >
              <ChevronDown
                className={cn('w-4 h-4 transition-transform', !showChannels && 'rotate-180')}
              />
              <span>Kanalen</span>
              <Plus className="w-4 h-4 ml-auto hover:bg-slate-700 rounded p-0.5 transition-colors" />
            </button>

            {showChannels && (
              <div className="space-y-1">
                {channels.map((channel) => (
                  <Link
                    key={channel.name}
                    href={channel.href}
                    className="flex items-center gap-3 w-full px-4 py-3 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 hover:text-white"
                  >
                    <span className={cn('w-2 h-2 rounded-full', channel.color)}></span>
                    <span>{channel.name}</span>
                    <div className="ml-auto flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                      <span className="text-xs text-slate-400">3</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="px-4 mt-6 pb-6">
            <p className="text-slate-400 uppercase text-xs tracking-wider font-semibold mb-3">
              Snelle Acties
            </p>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <button
                  key={action.name}
                  onClick={() => {
                    if (action.action === 'compose') {
                      setIsComposeOpen(true);
                    } else if (action.href !== '#') {
                      router.push(action.href);
                    }
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors w-full text-left"
                >
                  <action.icon className="w-4 h-4" />
                  <span>{action.name}</span>
                </button>
              ))}
              <Link
                href="/settings/notifications"
                className="flex items-center gap-3 px-4 py-2.5 text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl transition-colors relative"
              >
                <Bell className="w-4 h-4" />
                <span>Notificaties</span>
                <span className="absolute right-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-red-400"></span>
              </Link>
            </div>
          </div>
        </nav>
      </aside>

      {/* Compose Modal */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSend={handleSendEmail}
      />
    </>
  );
}
