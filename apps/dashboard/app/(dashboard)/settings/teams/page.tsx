'use client'

import { useState } from 'react'
import { ArrowLeft, Users, Plus, Settings, Clock, Bell, Shield, Calendar } from 'lucide-react'
import { Button } from '@zynlo/ui'
import Link from 'next/link'
import { useTeams, useCreateTeam, useUpdateTeam, useDeleteTeam } from '@zynlo/supabase'
import { showToast } from '@/components/toast'

// Create toast utility
const toast = {
  success: (message: string) => showToast('success', message),
  error: (message: string) => showToast('error', message),
  info: (message: string) => showToast('info', message),
}

interface TeamSettings {
  workingHours: {
    enabled: boolean
    timezone: string
    schedule: {
      [key: string]: {
        enabled: boolean
        start: string
        end: string
      }
    }
  }
  notifications: {
    newTicket: boolean
    ticketAssigned: boolean
    ticketUpdated: boolean
    mentionInNote: boolean
  }
  autoAssignment: {
    enabled: boolean
    method: 'round-robin' | 'least-busy' | 'random'
    onlyDuringWorkingHours: boolean
  }
  sla: {
    firstResponseTime: number // in minutes
    resolutionTime: number // in hours
  }
}

export default function TeamsSettingsPage() {
  const { data: teams, isLoading } = useTeams()
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()
  const deleteTeam = useDeleteTeam()
  
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [activeTab, setActiveTab] = useState<'general' | 'hours' | 'notifications' | 'assignment'>('general')
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    settings: {
      workingHours: {
        enabled: false,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        schedule: {
          monday: { enabled: true, start: '09:00', end: '17:00' },
          tuesday: { enabled: true, start: '09:00', end: '17:00' },
          wednesday: { enabled: true, start: '09:00', end: '17:00' },
          thursday: { enabled: true, start: '09:00', end: '17:00' },
          friday: { enabled: true, start: '09:00', end: '17:00' },
          saturday: { enabled: false, start: '09:00', end: '17:00' },
          sunday: { enabled: false, start: '09:00', end: '17:00' },
        }
      },
      notifications: {
        newTicket: true,
        ticketAssigned: true,
        ticketUpdated: false,
        mentionInNote: true,
      },
      autoAssignment: {
        enabled: false,
        method: 'round-robin' as const,
        onlyDuringWorkingHours: true,
      },
      sla: {
        firstResponseTime: 60, // 1 hour
        resolutionTime: 24, // 24 hours
      }
    } as TeamSettings
  })

  const handleCreateTeam = async () => {
    if (!formData.name.trim()) return
    
    try {
      await createTeam.mutateAsync({
        name: formData.name,
        description: formData.description,
        settings: formData.settings,
      })
      
      toast.success('Team aangemaakt')
      setIsCreating(false)
      resetForm()
    } catch (error) {
      toast.error('Fout bij aanmaken team')
    }
  }

  const handleUpdateTeam = async () => {
    if (!selectedTeam || !formData.name.trim()) return
    
    try {
      await updateTeam.mutateAsync({
        id: selectedTeam,
        name: formData.name,
        description: formData.description,
        settings: formData.settings,
      })
      
      toast.success('Team instellingen opgeslagen')
    } catch (error) {
      toast.error('Fout bij opslaan instellingen')
    }
  }

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Weet je zeker dat je dit team wilt verwijderen?')) return
    
    try {
      await deleteTeam.mutateAsync(teamId)
      toast.success('Team verwijderd')
      if (selectedTeam === teamId) {
        setSelectedTeam(null)
      }
    } catch (error) {
      toast.error('Fout bij verwijderen team')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      settings: {
        workingHours: {
          enabled: false,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          schedule: {
            monday: { enabled: true, start: '09:00', end: '17:00' },
            tuesday: { enabled: true, start: '09:00', end: '17:00' },
            wednesday: { enabled: true, start: '09:00', end: '17:00' },
            thursday: { enabled: true, start: '09:00', end: '17:00' },
            friday: { enabled: true, start: '09:00', end: '17:00' },
            saturday: { enabled: false, start: '09:00', end: '17:00' },
            sunday: { enabled: false, start: '09:00', end: '17:00' },
          }
        },
        notifications: {
          newTicket: true,
          ticketAssigned: true,
          ticketUpdated: false,
          mentionInNote: true,
        },
        autoAssignment: {
          enabled: false,
          method: 'round-robin' as const,
          onlyDuringWorkingHours: true,
        },
        sla: {
          firstResponseTime: 60,
          resolutionTime: 24,
        }
      } as TeamSettings
    })
  }

  const loadTeamData = (team: any) => {
    setFormData({
      name: team.name,
      description: team.description || '',
      settings: team.settings || formData.settings,
    })
    setSelectedTeam(team.id)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Teams laden...</div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
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
              <h1 className="text-2xl font-semibold text-gray-900">Teams</h1>
              <p className="text-sm text-gray-500">
                Beheer teams, werkuren, notificaties en automatische toewijzing
              </p>
            </div>
          </div>
          <Button
            onClick={() => {
              setIsCreating(true)
              setSelectedTeam(null)
              resetForm()
            }}
            className="flex items-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Nieuw team
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams List */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Teams</h2>
            </div>
            <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
              {teams && teams.length > 0 ? (
                teams.map((team: any) => (
                  <button
                    key={team.id}
                    onClick={() => loadTeamData(team)}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedTeam === team.id ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">{team.name}</h3>
                        {team.description && (
                          <p className="text-sm text-gray-500 mt-1">{team.description}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-1">
                          {team.member_count || 0} teamleden
                        </p>
                      </div>
                      <Settings className="h-4 w-4 text-gray-400" />
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Nog geen teams</p>
                </div>
              )}
              
              {isCreating && (
                <div className="p-4 bg-blue-50">
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Team naam"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Beschrijving (optioneel)"
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={handleCreateTeam}
                        disabled={!formData.name.trim() || createTeam.isPending}
                      >
                        {createTeam.isPending ? 'Aanmaken...' : 'Aanmaken'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsCreating(false)
                          resetForm()
                        }}
                      >
                        Annuleren
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Team Settings */}
        <div className="lg:col-span-2">
          {selectedTeam ? (
            <div className="bg-white rounded-lg shadow">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex">
                  <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'general'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Algemeen
                  </button>
                  <button
                    onClick={() => setActiveTab('hours')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'hours'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Werkuren
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'notifications'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Notificaties
                  </button>
                  <button
                    onClick={() => setActiveTab('assignment')}
                    className={`px-6 py-3 text-sm font-medium ${
                      activeTab === 'assignment'
                        ? 'border-b-2 border-blue-500 text-blue-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Toewijzing
                  </button>
                </nav>
              </div>

              <div className="p-6">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Team naam
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Beschrijving
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        SLA Instellingen
                      </h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Eerste reactietijd
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={formData.settings.sla.firstResponseTime}
                              onChange={(e) => setFormData({
                                ...formData,
                                settings: {
                                  ...formData.settings,
                                  sla: {
                                    ...formData.settings.sla,
                                    firstResponseTime: parseInt(e.target.value)
                                  }
                                }
                              })}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-500">minuten</span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">
                            Oplostijd
                          </label>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={formData.settings.sla.resolutionTime}
                              onChange={(e) => setFormData({
                                ...formData,
                                settings: {
                                  ...formData.settings,
                                  sla: {
                                    ...formData.settings.sla,
                                    resolutionTime: parseInt(e.target.value)
                                  }
                                }
                              })}
                              min="1"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-500">uren</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'hours' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          Werkuren
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Definieer wanneer dit team beschikbaar is
                        </p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.settings.workingHours.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              workingHours: {
                                ...formData.settings.workingHours,
                                enabled: e.target.checked
                              }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Ingeschakeld</span>
                      </label>
                    </div>

                    {formData.settings.workingHours.enabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tijdzone
                          </label>
                          <select
                            value={formData.settings.workingHours.timezone}
                            onChange={(e) => setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings,
                                workingHours: {
                                  ...formData.settings.workingHours,
                                  timezone: e.target.value
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="Europe/Amsterdam">Europe/Amsterdam</option>
                            <option value="Europe/London">Europe/London</option>
                            <option value="America/New_York">America/New York</option>
                            <option value="America/Los_Angeles">America/Los Angeles</option>
                          </select>
                        </div>

                        <div className="space-y-3">
                          {Object.entries(formData.settings.workingHours.schedule).map(([day, schedule]) => (
                            <div key={day} className="flex items-center gap-4">
                              <label className="flex items-center min-w-[120px]">
                                <input
                                  type="checkbox"
                                  checked={schedule.enabled}
                                  onChange={(e) => setFormData({
                                    ...formData,
                                    settings: {
                                      ...formData.settings,
                                      workingHours: {
                                        ...formData.settings.workingHours,
                                        schedule: {
                                          ...formData.settings.workingHours.schedule,
                                          [day]: {
                                            ...schedule,
                                            enabled: e.target.checked
                                          }
                                        }
                                      }
                                    }
                                  })}
                                  className="mr-2"
                                />
                                <span className="text-sm text-gray-700 capitalize">{day}</span>
                              </label>
                              {schedule.enabled && (
                                <>
                                  <input
                                    type="time"
                                    value={schedule.start}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      settings: {
                                        ...formData.settings,
                                        workingHours: {
                                          ...formData.settings.workingHours,
                                          schedule: {
                                            ...formData.settings.workingHours.schedule,
                                            [day]: {
                                              ...schedule,
                                              start: e.target.value
                                            }
                                          }
                                        }
                                      }
                                    })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                  <span className="text-gray-500">tot</span>
                                  <input
                                    type="time"
                                    value={schedule.end}
                                    onChange={(e) => setFormData({
                                      ...formData,
                                      settings: {
                                        ...formData.settings,
                                        workingHours: {
                                          ...formData.settings.workingHours,
                                          schedule: {
                                            ...formData.settings.workingHours.schedule,
                                            [day]: {
                                              ...schedule,
                                              end: e.target.value
                                            }
                                          }
                                        }
                                      }
                                    })}
                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  />
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                        <Bell className="h-4 w-4" />
                        Notificatie voorkeuren
                      </h3>
                      <p className="text-sm text-gray-500 mb-4">
                        Kies wanneer teamleden notificaties ontvangen
                      </p>
                    </div>

                    <div className="space-y-4">
                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Nieuw ticket</span>
                          <p className="text-xs text-gray-500">Wanneer een nieuw ticket wordt aangemaakt</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.settings.notifications.newTicket}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              notifications: {
                                ...formData.settings.notifications,
                                newTicket: e.target.checked
                              }
                            }
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Ticket toegewezen</span>
                          <p className="text-xs text-gray-500">Wanneer een ticket aan het team wordt toegewezen</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.settings.notifications.ticketAssigned}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              notifications: {
                                ...formData.settings.notifications,
                                ticketAssigned: e.target.checked
                              }
                            }
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Ticket update</span>
                          <p className="text-xs text-gray-500">Wanneer een ticket wordt geüpdatet</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.settings.notifications.ticketUpdated}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              notifications: {
                                ...formData.settings.notifications,
                                ticketUpdated: e.target.checked
                              }
                            }
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </label>

                      <label className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">Vermelding in notitie</span>
                          <p className="text-xs text-gray-500">Wanneer het team wordt genoemd in een interne notitie</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={formData.settings.notifications.mentionInNote}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              notifications: {
                                ...formData.settings.notifications,
                                mentionInNote: e.target.checked
                              }
                            }
                          })}
                          className="h-4 w-4 text-blue-600 rounded"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {activeTab === 'assignment' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          Automatische toewijzing
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          Tickets automatisch toewijzen aan teamleden
                        </p>
                      </div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.settings.autoAssignment.enabled}
                          onChange={(e) => setFormData({
                            ...formData,
                            settings: {
                              ...formData.settings,
                              autoAssignment: {
                                ...formData.settings.autoAssignment,
                                enabled: e.target.checked
                              }
                            }
                          })}
                          className="mr-2"
                        />
                        <span className="text-sm text-gray-700">Ingeschakeld</span>
                      </label>
                    </div>

                    {formData.settings.autoAssignment.enabled && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Toewijzingsmethode
                          </label>
                          <select
                            value={formData.settings.autoAssignment.method}
                            onChange={(e) => setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings,
                                autoAssignment: {
                                  ...formData.settings.autoAssignment,
                                  method: e.target.value as 'round-robin' | 'least-busy' | 'random'
                                }
                              }
                            })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="round-robin">Round Robin (om de beurt)</option>
                            <option value="least-busy">Minst drukke agent</option>
                            <option value="random">Willekeurig</option>
                          </select>
                        </div>

                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.settings.autoAssignment.onlyDuringWorkingHours}
                            onChange={(e) => setFormData({
                              ...formData,
                              settings: {
                                ...formData.settings,
                                autoAssignment: {
                                  ...formData.settings.autoAssignment,
                                  onlyDuringWorkingHours: e.target.checked
                                }
                              }
                            })}
                            className="mr-2"
                          />
                          <span className="text-sm text-gray-700">
                            Alleen toewijzen tijdens werkuren
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="mt-8 pt-6 border-t border-gray-200 flex items-center justify-between">
                  <Button
                    variant="outline"
                    onClick={() => handleDeleteTeam(selectedTeam)}
                    disabled={deleteTeam.isPending}
                    className="text-red-600 hover:text-red-700"
                  >
                    {deleteTeam.isPending ? 'Verwijderen...' : 'Team verwijderen'}
                  </Button>
                  <Button
                    onClick={handleUpdateTeam}
                    disabled={updateTeam.isPending || !formData.name.trim()}
                  >
                    {updateTeam.isPending ? 'Opslaan...' : 'Instellingen opslaan'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-gray-500">
                {isCreating 
                  ? 'Vul de teamnaam in om door te gaan'
                  : 'Selecteer een team om de instellingen te bekijken'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 