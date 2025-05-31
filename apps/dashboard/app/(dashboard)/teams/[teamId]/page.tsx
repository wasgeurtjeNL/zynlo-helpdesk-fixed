'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, Crown, UserMinus, Mail } from 'lucide-react'
import { Button } from '@zynlo/ui'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'

interface TeamMember {
  id: string
  user_id: string
  role: 'member' | 'leader'
  user: {
    id: string
    email: string
    full_name: string | null
  }
}

export default function TeamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const teamId = params.teamId as string
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')

  // Fetch team details
  const { data: team, isLoading: teamLoading } = useQuery({
    queryKey: ['team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (error) throw error
      return data
    }
  })

  // Fetch team members
  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('team_members')
        .select(`
          id,
          user_id,
          role,
          user:users(id, email, full_name)
        `)
        .eq('team_id', teamId)
        .order('role', { ascending: false })

      if (error) throw error
      return data as TeamMember[]
    }
  })

  // Fetch available users (not in this team)
  const { data: availableUsers } = useQuery({
    queryKey: ['available-users', teamId],
    queryFn: async () => {
      // First get all users
      const { data: allUsers, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name')
        .eq('is_active', true)

      if (usersError) throw usersError

      // Filter out users already in the team
      const memberUserIds = members?.map(m => m.user_id) || []
      return allUsers?.filter(user => !memberUserIds.includes(user.id)) || []
    },
    enabled: !!members
  })

  // Add member mutation
  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: 'member' | 'leader' }) => {
      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: userId,
          role
        })

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
      queryClient.invalidateQueries({ queryKey: ['available-users', teamId] })
      setIsAddingMember(false)
      setSelectedUserId('')
    }
  })

  // Remove member mutation
  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('id', memberId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
      queryClient.invalidateQueries({ queryKey: ['available-users', teamId] })
    }
  })

  // Update member role mutation
  const updateMemberRole = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: 'member' | 'leader' }) => {
      const { error } = await supabase
        .from('team_members')
        .update({ role })
        .eq('id', memberId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] })
    }
  })

  if (teamLoading || membersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Team gegevens laden...</div>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="p-6">
        <div className="text-center">
          <p className="text-gray-500">Team niet gevonden</p>
          <Button
            variant="outline"
            onClick={() => router.push('/teams')}
            className="mt-4"
          >
            Terug naar teams
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.push('/teams')}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Terug naar teams
        </button>
        
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{team.name}</h1>
          {team.description && (
            <p className="mt-1 text-sm text-gray-500">{team.description}</p>
          )}
        </div>
      </div>

      {/* Team members section */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">
            Teamleden ({members?.length || 0})
          </h2>
          <Button
            size="sm"
            onClick={() => setIsAddingMember(true)}
            className="flex items-center gap-2"
          >
            <UserPlus className="h-4 w-4" />
            Lid toevoegen
          </Button>
        </div>

        {/* Add member form */}
        {isAddingMember && (
          <div className="p-4 border-b border-gray-200 bg-gray-50">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Selecteer gebruiker
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Kies een gebruiker...</option>
                  {availableUsers?.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name || user.email}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => addMember.mutate({ userId: selectedUserId, role: 'member' })}
                  disabled={!selectedUserId || addMember.isPending}
                >
                  {addMember.isPending ? 'Toevoegen...' : 'Als lid toevoegen'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => addMember.mutate({ userId: selectedUserId, role: 'leader' })}
                  disabled={!selectedUserId || addMember.isPending}
                >
                  Als teamleider toevoegen
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsAddingMember(false)
                    setSelectedUserId('')
                  }}
                >
                  Annuleren
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Members list */}
        {members && members.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">
                      {member.user.full_name?.[0] || member.user.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {member.user.full_name || member.user.email}
                      </p>
                      {member.role === 'leader' && (
                        <span title="Teamleider">
                          <Crown className="h-4 w-4 text-yellow-500" />
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.user.email}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'member' ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateMemberRole.mutate({ 
                        memberId: member.id, 
                        role: 'leader' 
                      })}
                      disabled={updateMemberRole.isPending}
                    >
                      Maak teamleider
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => updateMemberRole.mutate({ 
                        memberId: member.id, 
                        role: 'member' 
                      })}
                      disabled={updateMemberRole.isPending}
                    >
                      Maak lid
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      if (confirm(`Weet je zeker dat je ${member.user.full_name || member.user.email} uit het team wilt verwijderen?`)) {
                        removeMember.mutate(member.id)
                      }
                    }}
                    disabled={removeMember.isPending}
                  >
                    <UserMinus className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <p>Dit team heeft nog geen leden</p>
            <p className="text-sm mt-1">Voeg teamleden toe om te beginnen</p>
          </div>
        )}
      </div>
    </div>
  )
} 