'use client'

import { useState } from 'react'
import { 
  Users, 
  UserPlus,
  Settings,
  MoreVertical,
  Mail,
  Shield,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type Team = Database['public']['Tables']['teams']['Row'] & {
  members: Array<{
    user: Database['public']['Tables']['users']['Row']
    role: string
  }>
}

export function TeamsList() {
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)

  const { data: teams, isLoading } = useQuery({
    queryKey: ['teams-with-members'],
    queryFn: async () => {
      // First get all teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('name', { ascending: true })

      if (teamsError) throw teamsError

      // Then get team members for each team
      const teamsWithMembers = await Promise.all(
        (teamsData || []).map(async (team) => {
          const { data: members, error: membersError } = await supabase
            .from('team_members')
            .select(`
              role,
              user:user_id(*)
            `)
            .eq('team_id', team.id)

          if (membersError) {
            console.error('Error fetching team members:', membersError)
            return { ...team, members: [] }
          }

          return {
            ...team,
            members: members || []
          }
        })
      )

      return teamsWithMembers as Team[]
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teams?.map((team) => (
        <div
          key={team.id}
          className="bg-white rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-gray-900">{team.name}</h3>
                  <p className="text-sm text-gray-500">
                    {team.members.length} {team.members.length === 1 ? 'lid' : 'leden'}
                  </p>
                </div>
              </div>
              <button className="p-1 hover:bg-gray-100 rounded">
                <MoreVertical className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {team.description && (
              <p className="text-sm text-gray-600 mb-4">{team.description}</p>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Teamleden</span>
                <button className="text-blue-600 hover:text-blue-700 flex items-center gap-1">
                  <UserPlus className="w-3 h-3" />
                  Toevoegen
                </button>
              </div>

              <div className="space-y-2">
                {team.members.slice(0, 3).map((member) => (
                  <div
                    key={member.user.id}
                    className="flex items-center gap-3 p-2 rounded hover:bg-gray-50"
                  >
                    <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-medium text-gray-600">
                      {member.user.full_name?.charAt(0) || member.user.email?.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {member.user.full_name || member.user.email}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {member.user.email}
                      </p>
                    </div>
                    {member.role === 'leader' && (
                      <span title="Team leader">
                        <Shield className="w-4 h-4 text-yellow-600" />
                      </span>
                    )}
                  </div>
                ))}
                
                {team.members.length > 3 && (
                  <button className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                    +{team.members.length - 3} meer
                  </button>
                )}
                
                {team.members.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nog geen teamleden
                  </p>
                )}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  {team.settings && typeof team.settings === 'object' && 'auto_assign' in team.settings && team.settings.auto_assign && (
                    <span className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Auto-assign aan
                    </span>
                  )}
                  {team.settings && typeof team.settings === 'object' && 'email' in team.settings && team.settings.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="w-3 h-3" />
                      {team.settings.email as string}
                    </span>
                  )}
                </div>
                <button className="p-1 hover:bg-gray-100 rounded">
                  <Settings className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Add Team Card */}
      <button className="bg-white rounded-lg shadow border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors min-h-[200px]">
        <div className="p-6 flex flex-col items-center justify-center h-full gap-2">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-gray-600" />
          </div>
          <span className="text-sm font-medium text-gray-900">Nieuw team maken</span>
          <span className="text-xs text-gray-500">Organiseer je medewerkers</span>
        </div>
      </button>
    </div>
  )
} 