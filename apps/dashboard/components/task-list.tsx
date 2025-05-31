'use client'

import { useState, useMemo } from 'react'
import { Plus, Loader2, CheckSquare } from 'lucide-react'
import { TaskCard } from './task-card'
import { TaskForm } from './task-form'
import { TaskDetail } from './task-detail'
import { TaskFilters, type TaskFilters as TaskFiltersType } from './task-filters'
import { useTasks, useDeleteTask } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type TaskStatus = Database['public']['Enums']['task_status']

interface TaskListProps {
  filter?: {
    status?: TaskStatus
    user_id?: string
    include_completed?: boolean
  }
  title?: string
  emptyMessage?: string
  showFilters?: boolean
}

export function TaskList({ 
  filter, 
  title = 'Taken',
  emptyMessage = 'Geen taken gevonden',
  showFilters = true
}: TaskListProps) {
  const [filters, setFilters] = useState<TaskFiltersType>({})
  const { data: tasks, isLoading } = useTasks(filter)
  const deleteTask = useDeleteTask()
  const [showNewTaskForm, setShowNewTaskForm] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)

  // Filter tasks based on filters and search
  const filteredTasks = useMemo(() => {
    if (!tasks) return []
    
    return tasks.filter((task: any) => {
      // Status filter
      if (filters.status && task.status !== filters.status) {
        return false
      }
      
      // Priority filter
      if (filters.priority && task.priority !== filters.priority) {
        return false
      }
      
      // Assignee filter
      if (filters.assignee_id) {
        const hasAssignee = task.assignees?.some(
          (assignee: any) => assignee.id === filters.assignee_id
        )
        if (!hasAssignee) return false
      }
      
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const titleMatch = task.title.toLowerCase().includes(searchLower)
        const descriptionMatch = task.description?.toLowerCase().includes(searchLower) || false
        
        if (!titleMatch && !descriptionMatch) {
          return false
        }
      }
      
      return true
    })
  }, [tasks, filters, filters.status, filters.priority, filters.assignee_id, filters.search])

  const handleDelete = async (taskId: string) => {
    if (confirm('Weet je zeker dat je deze taak wilt verwijderen?')) {
      await deleteTask.mutateAsync(taskId)
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <button
          onClick={() => setShowNewTaskForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nieuwe taak
        </button>
      </div>

      {/* Filters */}
      {showFilters && (
        <TaskFilters 
          filters={filters}
          onFiltersChange={setFilters}
        />
      )}

      {/* New task form */}
      {showNewTaskForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <TaskForm
            onSubmit={() => setShowNewTaskForm(false)}
            onCancel={() => setShowNewTaskForm(false)}
          />
        </div>
      )}

      {/* Task list */}
      {filteredTasks.length > 0 ? (
        <div className="space-y-2">
          {filteredTasks.map((task: any) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => setSelectedTaskId(task.id)}
              onEdit={() => setEditingTaskId(task.id)}
              onDelete={() => handleDelete(task.id)}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">
            {filters.search || Object.keys(filters).length > 0
              ? 'Geen taken gevonden met deze filters'
              : emptyMessage}
          </p>
          {!showNewTaskForm && Object.keys(filters).length === 0 && (
            <button
              onClick={() => setShowNewTaskForm(true)}
              className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              Maak je eerste taak
            </button>
          )}
        </div>
      )}

      {/* Task detail modal */}
      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onEdit={() => {
            setEditingTaskId(selectedTaskId)
            setSelectedTaskId(null)
          }}
        />
      )}

      {/* Edit task modal */}
      {editingTaskId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Taak bewerken</h3>
              <TaskForm
                taskId={editingTaskId}
                onSubmit={() => setEditingTaskId(null)}
                onCancel={() => setEditingTaskId(null)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 