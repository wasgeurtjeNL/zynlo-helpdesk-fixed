import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import type { Database } from '../types'

type Team = Database['public']['Tables']['teams']['Row']
type TeamInsert = Database['public']['Tables']['teams']['Insert']
type TeamUpdate = Database['public']['Tables']['teams']['Update']

export function useTeams() {
  return useQuery({
    queryKey: ['teams'],
    queryFn: async () => {
      // First get all teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false })

      if (teamsError) throw teamsError

      // Try to get member counts for each team (fallback if table doesn't exist)
      let memberCountMap: Record<string, number> = {}
      
      try {
        const { data: memberCounts, error: countsError } = await supabase
          .from('team_members')
          .select('team_id')

        if (!countsError && memberCounts) {
          // Count members per team
          memberCountMap = memberCounts.reduce((acc, member) => {
            acc[member.team_id] = (acc[member.team_id] || 0) + 1
            return acc
          }, {} as Record<string, number>)
        }
      } catch (error) {
        // team_members table doesn't exist yet, use default counts
        console.warn('team_members table not found, using default member counts')
      }

      // Combine teams with their member counts
      return teams?.map(team => ({
        ...team,
        member_count: memberCountMap[team.id] || 0
      })) || []
    }
  })
}

export function useCreateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (team: Omit<TeamInsert, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('teams')
        .insert(team)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

export function useUpdateTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TeamUpdate>) => {
      const { data, error } = await supabase
        .from('teams')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
}

export function useDeleteTeam() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', teamId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] })
    }
  })
} 