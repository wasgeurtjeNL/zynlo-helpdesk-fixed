'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { useTeams, useUsers } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  assignee_id?: string
  search?: string
}

interface TaskFiltersProps {
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
}

export function TaskFilters({ filters, onFiltersChange }: TaskFiltersProps) {
  const [showFilters, setShowFilters] = useState(false)
  const [searchTerm, setSearchTerm] = useState(filters.search || '')
  const { data: users } = useUsers()
  const { data: teams } = useTeams()

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== filters.search) {
        onFiltersChange({ ...filters, search: searchTerm })
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm])

  const statuses: { value: TaskStatus; label: string; color: string }[] = [
    { value: 'todo', label: 'Te doen', color: 'bg-gray-100 text-gray-700' },
    { value: 'in_progress', label: 'Bezig', color: 'bg-blue-100 text-blue-700' },
    { value: 'done', label: 'Voltooid', color: 'bg-green-100 text-green-700' }
  ]

  const priorities: { value: TaskPriority; label: string; color: string }[] = [
    { value: 'low', label: 'Laag', color: 'bg-gray-100 text-gray-700' },
    { value: 'normal', label: 'Normaal', color: 'bg-blue-100 text-blue-700' },
    { value: 'high', label: 'Hoog', color: 'bg-orange-100 text-orange-700' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-700' }
  ]

  const handleFilterChange = (key: keyof TaskFilters, value: any) => {
    if (value === filters[key]) {
      // Remove filter if clicking the same value
      const newFilters = { ...filters }
      delete newFilters[key]
      onFiltersChange(newFilters)
    } else {
      onFiltersChange({ ...filters, [key]: value })
    }
  }

  const clearFilters = () => {
    setSearchTerm('')
    onFiltersChange({})
  }

  const activeFilterCount = Object.keys(filters).filter(key => key !== 'search' && filters[key as keyof TaskFilters]).length

  return (
    <div className="space-y-4">
      {/* Search and filter toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Zoek taken..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-4 py-2 flex items-center gap-2 border rounded-md text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'bg-blue-50 border-blue-200 text-blue-700'
              : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 bg-blue-600 text-white text-xs rounded-full">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          {/* Status filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Status</h3>
            <div className="flex flex-wrap gap-2">
              {statuses.map((status) => (
                <button
                  key={status.value}
                  onClick={() => handleFilterChange('status', status.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.status === status.value
                      ? status.color
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {status.label}
                </button>
              ))}
            </div>
          </div>

          {/* Priority filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Prioriteit</h3>
            <div className="flex flex-wrap gap-2">
              {priorities.map((priority) => (
                <button
                  key={priority.value}
                  onClick={() => handleFilterChange('priority', priority.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filters.priority === priority.value
                      ? priority.color
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {priority.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assignee filter */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Toegewezen aan</h3>
            <select
              value={filters.assignee_id || ''}
              onChange={(e) => handleFilterChange('assignee_id', e.target.value || undefined)}
              className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Alle gebruikers</option>
              {users?.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.full_name || user.email}
                </option>
              ))}
            </select>
          </div>

          {/* Clear filters */}
          {(activeFilterCount > 0 || searchTerm) && (
            <div className="flex justify-end">
              <button
                onClick={clearFilters}
                className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                Filters wissen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 