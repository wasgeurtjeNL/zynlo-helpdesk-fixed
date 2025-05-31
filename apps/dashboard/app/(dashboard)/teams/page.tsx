'use client'

import { useState } from 'react'
import { Plus, Users, Settings, Trash2, Edit2, ChevronRight } from 'lucide-react'
import { Button } from '@zynlo/ui'
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '@zynlo/supabase'
import { useRouter } from 'next/navigation'

export default function TeamsPage() {
  const { data: teams, isLoading } = useTeams()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '' })

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) return
    
    await createTeam.mutateAsync({
      name: formData.name,
      description: formData.description
    })
    
    setFormData({ name: '', description: '' })
    setIsCreating(false)
  }

  const handleUpdateTeam = async (teamId: string) => {
    if (!formData.name.trim()) return
    
    await updateTeam.mutateAsync({
      id: teamId,
      name: formData.name,
      description: formData.description
    })
    
    setFormData({ name: '', description: '' })
    setEditingTeam(null)
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (confirm('Weet je zeker dat je dit team wilt verwijderen?')) {
      await deleteTeam.mutateAsync(teamId)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Teams laden...</div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
        <p className="mt-1 text-sm text-gray-500">
          Beheer teams en teamleden binnen je organisatie
        </p>
      </div>

      <div className="mb-6">
        <Button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Nieuw team
        </Button>
      </div>

      {/* Create new team form */}
      {isCreating && (
        <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-medium mb-4">Nieuw team aanmaken</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teamnaam
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Bijv. Support Team"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschrijving (optioneel)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Beschrijf de verantwoordelijkheden van dit team..."
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateTeam}
                disabled={!formData.name.trim() || createTeam.isPending}
              >
                {createTeam.isPending ? 'Aanmaken...' : 'Team aanmaken'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsCreating(false)
                  setFormData({ name: '', description: '' })
                }}
              >
                Annuleren
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Teams list */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Alle teams</h2>
        </div>
        
        {teams && teams.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {teams.map((team: any) => (
              <div key={team.id} className="p-4">
                {editingTeam === team.id ? (
                  <div className="space-y-4">
                    <div>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleUpdateTeam(team.id)}
                        disabled={!formData.name.trim() || updateTeam.isPending}
                      >
                        {updateTeam.isPending ? 'Opslaan...' : 'Opslaan'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTeam(null)
                          setFormData({ name: '', description: '' })
                        }}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => router.push(`/teams/${team.id}`)}
                    >
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Users className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-medium text-gray-900">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-gray-500">{team.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {team.member_count || 0} teamleden
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingTeam(team.id)
                          setFormData({
                            name: team.name,
                            description: team.description || ''
                          })
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteTeam(team.id)
                        }}
                        disabled={deleteTeam.isPending}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>Nog geen teams aangemaakt</p>
            <p className="text-sm mt-1">Maak je eerste team aan om te beginnen</p>
          </div>
        )}
      </div>
    </div>
  )
} 