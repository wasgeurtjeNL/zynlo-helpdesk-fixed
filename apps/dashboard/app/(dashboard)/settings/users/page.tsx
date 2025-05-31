'use client'

import { useState } from 'react'
import { 
  ArrowLeft, 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Mail, 
  Shield, 
  Clock, 
  MoreVertical,
  UserPlus,
  Download,
  Upload,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  Key,
  Activity
} from 'lucide-react'
import { Button } from '@/lib/ui'
import Link from 'next/link'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { showToast } from '@/components/toast'

// Create toast utility
const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message),
}

interface User {
  id: string
  email: string
  full_name: string | null
  role: 'admin' | 'agent' | 'viewer'
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  teams?: Array<{
    id: string
    name: string
    role: 'member' | 'leader'
  }>
  permissions?: {
    tickets: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
      assign: boolean
    }
    customers: {
      view: boolean
      create: boolean
      edit: boolean
      delete: boolean
    }
    settings: {
      view: boolean
      edit: boolean
    }
  }
}

const defaultPermissions = {
  admin: {
    tickets: { view: true, create: true, edit: true, delete: true, assign: true },
    customers: { view: true, create: true, edit: true, delete: true },
    settings: { view: true, edit: true }
  },
  agent: {
    tickets: { view: true, create: true, edit: true, delete: false, assign: true },
    customers: { view: true, create: true, edit: true, delete: false },
    settings: { view: false, edit: false }
  },
  viewer: {
    tickets: { view: true, create: false, edit: false, delete: false, assign: false },
    customers: { view: true, create: false, edit: false, delete: false },
    settings: { view: false, edit: false }
  }
}

export default function UsersSettingsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterRole, setFilterRole] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [activeTab, setActiveTab] = useState<'details' | 'permissions' | 'activity'>('details')

  // Invite form state
  const [inviteData, setInviteData] = useState({
    emails: '',
    role: 'agent' as 'admin' | 'agent' | 'viewer',
    teams: [] as string[],
    sendWelcomeEmail: true
  })

  // Fetch users
  const { data: users, isLoading } = useQuery({
    queryKey: ['settings-users', searchQuery, filterRole, filterStatus],
    queryFn: async () => {
      let query = supabase
        .from('users')
        .select(`
          *,
          team_members!inner(
            team_id,
            role,
            teams!inner(
              id,
              name
            )
          )
        `)

      // Apply search
      if (searchQuery) {
        query = query.or(`email.ilike.%${searchQuery}%,full_name.ilike.%${searchQuery}%`)
      }

      // Apply role filter
      if (filterRole !== 'all') {
        query = query.eq('role', filterRole)
      }

      // Apply status filter
      if (filterStatus !== 'all') {
        query = query.eq('is_active', filterStatus === 'active')
      }

      const { data, error } = await query.order('created_at', { ascending: false })

      if (error) throw error

      // Transform data to include teams
      return data?.map(user => ({
        ...user,
        teams: user.team_members?.map((tm: any) => ({
          id: tm.teams.id,
          name: tm.teams.name,
          role: tm.role
        })) || []
      })) as User[]
    }
  })

  // Fetch teams for dropdowns
  const { data: teams } = useQuery({
    queryKey: ['teams-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('id, name')
        .order('name')

      if (error) throw error
      return data
    }
  })

  // Invite users mutation
  const inviteUsers = useMutation({
    mutationFn: async () => {
      const emails = inviteData.emails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0)

      if (emails.length === 0) {
        throw new Error('Geen geldige email adressen opgegeven')
      }

      // In a real app, this would:
      // 1. Create user accounts
      // 2. Assign roles and teams
      // 3. Send invitation emails

      // For now, simulate the process
      await new Promise(resolve => setTimeout(resolve, 2000))

      return { invited: emails.length }
    },
    onSuccess: (data) => {
      toast.success(`${data.invited} gebruiker(s) uitgenodigd`)
      setShowInviteModal(false)
      setInviteData({
        emails: '',
        role: 'agent',
        teams: [],
        sendWelcomeEmail: true
      })
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
    },
    onError: (error: any) => {
      toast.error(error.message)
    }
  })

  // Update user mutation
  const updateUser = useMutation({
    mutationFn: async (userData: Partial<User> & { id: string }) => {
      const { id, ...updates } = userData
      const { error } = await supabase
        .from('users')
        .update(updates)
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Gebruiker bijgewerkt')
      setEditingUser(null)
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
    },
    onError: (error: any) => {
      toast.error('Fout bij bijwerken gebruiker')
    }
  })

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      // In a real app, you might want to deactivate instead of delete
      const { error } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Gebruiker gedeactiveerd')
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
    },
    onError: () => {
      toast.error('Fout bij deactiveren gebruiker')
    }
  })

  // Bulk actions
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return

    try {
      switch (action) {
        case 'activate':
        case 'deactivate':
          await supabase
            .from('users')
            .update({ is_active: action === 'activate' })
            .in('id', selectedUsers)
          toast.success(`${selectedUsers.length} gebruiker(s) ${action === 'activate' ? 'geactiveerd' : 'gedeactiveerd'}`)
          break
        case 'delete':
          if (confirm(`Weet je zeker dat je ${selectedUsers.length} gebruiker(s) wilt verwijderen?`)) {
            await supabase
              .from('users')
              .update({ is_active: false })
              .in('id', selectedUsers)
            toast.success(`${selectedUsers.length} gebruiker(s) verwijderd`)
          }
          break
      }
      setSelectedUsers([])
      queryClient.invalidateQueries({ queryKey: ['settings-users'] })
    } catch (error) {
      toast.error('Fout bij bulk actie')
    }
  }

  // Export users
  const exportUsers = () => {
    if (!users) return

    const csv = [
      ['Email', 'Naam', 'Rol', 'Status', 'Teams', 'Aangemaakt', 'Laatste login'],
      ...users.map(user => [
        user.email,
        user.full_name || '',
        user.role,
        user.is_active ? 'Actief' : 'Inactief',
        user.teams?.map(t => t.name).join(', ') || '',
        new Date(user.created_at).toLocaleDateString(),
        user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : 'Nooit'
      ])
    ].map(row => row.join(',')).join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
    
    toast.success('Gebruikers geëxporteerd')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Gebruikers laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/settings"
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar instellingen
        </Link>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Gebruikers</h1>
              <p className="text-sm text-gray-500">
                Beheer gebruikers, rollen en toegangsrechten
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={exportUsers}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exporteer
            </Button>
            <Button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Gebruiker uitnodigen
            </Button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Zoek op naam of email..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle rollen</option>
            <option value="admin">Admin</option>
            <option value="agent">Agent</option>
            <option value="viewer">Viewer</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Alle statussen</option>
            <option value="active">Actief</option>
            <option value="inactive">Inactief</option>
          </select>
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                {selectedUsers.length} geselecteerd
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk acties
              </Button>
            </div>
          )}
        </div>

        {/* Bulk actions dropdown */}
        {showBulkActions && selectedUsers.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('activate')}
            >
              Activeer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('deactivate')}
            >
              Deactiveer
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleBulkAction('delete')}
              className="text-red-600 hover:text-red-700"
            >
              Verwijder
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setSelectedUsers([])
                setShowBulkActions(false)
              }}
            >
              Annuleer
            </Button>
          </div>
        )}
      </div>

      {/* Users table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedUsers.length === users?.length && users.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(users?.map(u => u.id) || [])
                    } else {
                      setSelectedUsers([])
                    }
                  }}
                  className="h-4 w-4 text-blue-600 rounded"
                />
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Gebruiker
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Rol
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Teams
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Laatste login
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Acties</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users && users.length > 0 ? (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers([...selectedUsers, user.id])
                        } else {
                          setSelectedUsers(selectedUsers.filter(id => id !== user.id))
                        }
                      }}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {user.full_name?.[0] || user.email[0].toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'Geen naam'}
                        </div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800'
                        : user.role === 'agent'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {user.teams && user.teams.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {user.teams.slice(0, 2).map(team => (
                            <span key={team.id} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100">
                              {team.name}
                              {team.role === 'leader' && (
                                <Shield className="ml-1 h-3 w-3" />
                              )}
                            </span>
                          ))}
                          {user.teams.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{user.teams.length - 2}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-500">Geen teams</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {user.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        Actief
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-gray-500">
                        <XCircle className="h-4 w-4" />
                        Inactief
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.last_sign_in_at ? (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(user.last_sign_in_at).toLocaleDateString()}
                      </div>
                    ) : (
                      'Nooit'
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setEditingUser(user)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    Geen gebruikers gevonden
                  </p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Gebruikers uitnodigen
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email adressen
                </label>
                <textarea
                  value={inviteData.emails}
                  onChange={(e) => setInviteData({ ...inviteData, emails: e.target.value })}
                  placeholder="email1@example.com, email2@example.com"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Scheid meerdere adressen met komma's of nieuwe regels
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  value={inviteData.role}
                  onChange={(e) => setInviteData({ 
                    ...inviteData, 
                    role: e.target.value as 'admin' | 'agent' | 'viewer' 
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="agent">Agent</option>
                  <option value="admin">Admin</option>
                  <option value="viewer">Viewer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teams (optioneel)
                </label>
                <select
                  multiple
                  value={inviteData.teams}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions, option => option.value)
                    setInviteData({ ...inviteData, teams: selected })
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  size={4}
                >
                  {teams?.map(team => (
                    <option key={team.id} value={team.id}>{team.name}</option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Houd Ctrl/Cmd ingedrukt om meerdere teams te selecteren
                </p>
              </div>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={inviteData.sendWelcomeEmail}
                  onChange={(e) => setInviteData({ 
                    ...inviteData, 
                    sendWelcomeEmail: e.target.checked 
                  })}
                  className="mr-2"
                />
                <span className="text-sm text-gray-700">
                  Stuur welkom email met login instructies
                </span>
              </label>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowInviteModal(false)
                  setInviteData({
                    emails: '',
                    role: 'agent',
                    teams: [],
                    sendWelcomeEmail: true
                  })
                }}
              >
                Annuleren
              </Button>
              <Button
                onClick={() => inviteUsers.mutate()}
                disabled={inviteUsers.isPending || !inviteData.emails.trim()}
              >
                {inviteUsers.isPending ? 'Uitnodigen...' : 'Uitnodigen'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Gebruiker bewerken
              </h2>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'details'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('permissions')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'permissions'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Permissies
                </button>
                <button
                  onClick={() => setActiveTab('activity')}
                  className={`px-6 py-3 text-sm font-medium ${
                    activeTab === 'activity'
                      ? 'border-b-2 border-blue-500 text-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Activiteit
                </button>
              </nav>
            </div>

            <div className="p-6">
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Volledige naam
                      </label>
                      <input
                        type="text"
                        value={editingUser.full_name || ''}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          full_name: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editingUser.email}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol
                      </label>
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          role: e.target.value as 'admin' | 'agent' | 'viewer'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="admin">Admin</option>
                        <option value="agent">Agent</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        value={editingUser.is_active ? 'active' : 'inactive'}
                        onChange={(e) => setEditingUser({
                          ...editingUser,
                          is_active: e.target.value === 'active'
                        })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="active">Actief</option>
                        <option value="inactive">Inactief</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-2">Acties</h3>
                    <div className="space-y-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Key className="h-4 w-4" />
                        Wachtwoord reset link sturen
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <Mail className="h-4 w-4" />
                        Verificatie email sturen
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'permissions' && (
                <div className="space-y-6">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <p className="text-sm text-yellow-800">
                      Permissies worden automatisch toegepast op basis van de rol.
                      Aangepaste permissies komen in een toekomstige update.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Tickets</h3>
                      <div className="space-y-2">
                        {Object.entries(defaultPermissions[editingUser.role].tickets).map(([action, allowed]) => (
                          <label key={action} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{action}</span>
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Klanten</h3>
                      <div className="space-y-2">
                        {Object.entries(defaultPermissions[editingUser.role].customers).map(([action, allowed]) => (
                          <label key={action} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{action}</span>
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                          </label>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-2">Instellingen</h3>
                      <div className="space-y-2">
                        {Object.entries(defaultPermissions[editingUser.role].settings).map(([action, allowed]) => (
                          <label key={action} className="flex items-center justify-between">
                            <span className="text-sm text-gray-600 capitalize">{action}</span>
                            <input
                              type="checkbox"
                              checked={allowed}
                              disabled
                              className="h-4 w-4 text-blue-600 rounded"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Aangemaakt:</span>
                        <p className="font-medium">
                          {new Date(editingUser.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500">Laatste login:</span>
                        <p className="font-medium">
                          {editingUser.last_sign_in_at
                            ? new Date(editingUser.last_sign_in_at).toLocaleString()
                            : 'Nooit'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
                      <Activity className="h-4 w-4" />
                      Recente activiteit
                    </h3>
                    <div className="text-sm text-gray-500 text-center py-8">
                      Activiteiten tracking komt in een toekomstige update
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 flex justify-between">
              <Button
                variant="outline"
                onClick={() => deleteUser.mutate(editingUser.id)}
                disabled={deleteUser.isPending}
                className="text-red-600 hover:text-red-700"
              >
                {deleteUser.isPending ? 'Deactiveren...' : 'Gebruiker deactiveren'}
              </Button>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setEditingUser(null)}
                >
                  Annuleren
                </Button>
                <Button
                  onClick={() => updateUser.mutate(editingUser)}
                  disabled={updateUser.isPending}
                >
                  {updateUser.isPending ? 'Opslaan...' : 'Wijzigingen opslaan'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 