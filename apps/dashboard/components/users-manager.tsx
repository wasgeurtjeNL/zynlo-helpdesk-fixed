'use client'

import { useState } from 'react'
import { 
  User, 
  Mail,
  Shield,
  Users,
  MoreVertical,
  Edit2,
  Trash2,
  UserPlus,
  Check,
  X,
  Loader2,
  Calendar,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type UserType = Database['public']['Tables']['users']['Row'] & {
  teams?: Array<{
    team: Database['public']['Tables']['teams']['Row']
    role: string
  }>
}

const roleLabels = {
  admin: { label: 'Admin', color: 'text-red-600', bgColor: 'bg-red-100' },
  agent: { label: 'Agent', color: 'text-blue-600', bgColor: 'bg-blue-100' },
  viewer: { label: 'Viewer', color: 'text-gray-600', bgColor: 'bg-gray-100' },
}

export function UsersManager() {
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<string | null>(null)
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteData, setInviteData] = useState({
    email: '',
    full_name: '',
    role: 'agent' as 'admin' | 'agent' | 'viewer'
  })

  // Fetch users with their team memberships
  const { data: users, isLoading } = useQuery({
    queryKey: ['users-with-teams'],
    queryFn: async () => {
      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Get team memberships for each user
      const usersWithTeams = await Promise.all(
        (usersData || []).map(async (user) => {
          const { data: memberships, error: membershipError } = await supabase
            .from('team_members')
            .select(`
              role,
              team:team_id(*)
            `)
            .eq('user_id', user.id)

          if (membershipError) {
            console.error('Error fetching team memberships:', membershipError)
            return { ...user, teams: [] }
          }

          return {
            ...user,
            teams: memberships || []
          }
        })
      )

      return usersWithTeams as UserType[]
    },
  })

  // Update user role mutation
  const updateUserRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-teams'] })
    },
  })

  // Delete user mutation
  const deleteUser = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users-with-teams'] })
    },
  })

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatLastSeen = (date: string | null) => {
    if (!date) return 'Nooit'
    
    const lastSeen = new Date(date)
    const now = new Date()
    const diffInHours = (now.getTime() - lastSeen.getTime()) / (1000 * 60 * 60)
    
    if (diffInHours < 1) {
      return 'Minder dan een uur geleden'
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)} uur geleden`
    } else if (diffInHours < 48) {
      return 'Gisteren'
    } else {
      return formatDate(date)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Invite Form */}
      {showInviteForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Nieuwe gebruiker uitnodigen</h3>
          <form className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="gebruiker@voorbeeld.nl"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Volledige naam
                </label>
                <input
                  type="text"
                  value={inviteData.full_name}
                  onChange={(e) => setInviteData({ ...inviteData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jan Jansen"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rol
              </label>
              <select
                value={inviteData.role}
                onChange={(e) => setInviteData({ ...inviteData, role: e.target.value as any })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="agent">Agent</option>
                <option value="admin">Admin</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Uitnodiging versturen
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowInviteForm(false)
                  setInviteData({ email: '', full_name: '', role: 'agent' })
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Annuleren
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
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
                Laatst gezien
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Toegevoegd op
              </th>
              <th className="relative px-6 py-3">
                <span className="sr-only">Acties</span>
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users?.map((user) => {
              const roleInfo = roleLabels[user.role as keyof typeof roleLabels] || roleLabels.agent
              
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                        {user.full_name?.charAt(0) || user.email?.charAt(0)}
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user.full_name || 'Geen naam'}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={cn(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                      roleInfo.bgColor,
                      roleInfo.color
                    )}>
                      {user.role === 'admin' && <Shield className="w-3 h-3 mr-1" />}
                      {roleInfo.label}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.teams?.slice(0, 2).map((membership) => (
                        <span
                          key={membership.team.id}
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {membership.team.name}
                          {membership.role === 'leader' && (
                            <Shield className="w-3 h-3 ml-1 text-yellow-600" />
                          )}
                        </span>
                      ))}
                      {user.teams && user.teams.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{user.teams.length - 2} meer
                        </span>
                      )}
                      {(!user.teams || user.teams.length === 0) && (
                        <span className="text-xs text-gray-500">Geen teams</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {formatLastSeen(user.last_sign_in_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDate(user.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => setSelectedUser(user.id)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
} 