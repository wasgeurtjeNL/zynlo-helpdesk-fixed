'use client'

import { useState, useEffect } from 'react'
import { Calendar, Users, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { 
  useCreateTask, 
  useUpdateTask, 
  useTask,
  useUsers,
  useAuth
} from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'
import { showToast } from './toast'

type TaskPriority = Database['public']['Enums']['task_priority']

interface TaskFormProps {
  taskId?: string
  ticketId?: string
  onSubmit: () => void
  onCancel: () => void
}

const priorityOptions: Array<{ value: TaskPriority; label: string; color: string }> = [
  { value: 'low', label: 'Laag', color: 'text-gray-500' },
  { value: 'normal', label: 'Normaal', color: 'text-blue-500' },
  { value: 'high', label: 'Hoog', color: 'text-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'text-red-500' },
]

export function TaskForm({ taskId, ticketId, onSubmit, onCancel }: TaskFormProps) {
  const { user } = useAuth()
  const { data: users } = useUsers()
  const { data: existingTask } = useTask(taskId || '')
  const createTask = useCreateTask()
  const updateTask = useUpdateTask()

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'normal' as TaskPriority,
    due_date: '',
    assignee_ids: [] as string[],
  })

  useEffect(() => {
    if (existingTask && taskId) {
      setFormData({
        title: existingTask.title,
        description: existingTask.description || '',
        priority: existingTask.priority,
        due_date: existingTask.due_date ? new Date(existingTask.due_date).toISOString().split('T')[0] : '',
        assignee_ids: existingTask.assignees?.map((a: any) => a.user.id) || [],
      })
    }
  }, [existingTask, taskId])

  useEffect(() => {
    if (existingTask?.task_assignees) {
      setFormData(prev => ({
        ...prev,
        assignee_ids: existingTask.task_assignees?.map((a: any) => a.user_id) || []
      }))
    }
  }, [existingTask])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) return

    try {
      if (taskId) {
        await updateTask.mutateAsync({
          taskId,
          updates: {
            title: formData.title,
            description: formData.description || undefined,
            status: existingTask?.status,
            priority: formData.priority,
            due_date: formData.due_date || null,
          },
        })
        showToast('success', 'Taak bijgewerkt', 'De taak is succesvol bijgewerkt')
      } else {
        await createTask.mutateAsync({
          title: formData.title,
          description: formData.description,
          status: existingTask?.status,
          priority: formData.priority,
          due_date: formData.due_date || null,
          ticket_id: ticketId || undefined,
          assignee_ids: formData.assignee_ids,
        })
        showToast('success', 'Taak aangemaakt', 'De nieuwe taak is succesvol aangemaakt')
      }
      onSubmit()
    } catch (error) {
      console.error('Error saving task:', error)
      showToast('error', 'Fout bij opslaan', 'Er is een fout opgetreden bij het opslaan van de taak')
    }
  }

  const toggleAssignee = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: prev.assignee_ids.includes(userId)
        ? prev.assignee_ids.filter(id => id !== userId)
        : [...prev.assignee_ids, userId]
    }))
  }

  const isSubmitting = createTask.isPending || updateTask.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <input
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder="Wat moet er gedaan worden?"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
          autoFocus
        />
      </div>

      {/* Description */}
      <div>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Beschrijving (optioneel)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Priority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <AlertCircle className="w-4 h-4 inline mr-1" />
            Prioriteit
          </label>
          <select
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {priorityOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Due date */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            <Calendar className="w-4 h-4 inline mr-1" />
            Deadline
          </label>
          <input
            type="date"
            value={formData.due_date}
            onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>

      {/* Assignees */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          <Users className="w-4 h-4 inline mr-1" />
          Toewijzen aan
        </label>
        <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2">
          {users?.map((user: any) => (
            <label
              key={user.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={formData.assignee_ids.includes(user.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setFormData(prev => ({
                      ...prev,
                      assignee_ids: [...prev.assignee_ids, user.id]
                    }))
                  } else {
                    setFormData(prev => ({
                      ...prev,
                      assignee_ids: prev.assignee_ids.filter(id => id !== user.id)
                    }))
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                  {user.full_name?.charAt(0) || user.email?.charAt(0)}
                </div>
                <span className="text-sm">{user.full_name || user.email}</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={isSubmitting || !formData.title.trim()}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
          {taskId ? 'Opslaan' : 'Taak aanmaken'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50"
        >
          Annuleren
        </button>
      </div>
    </form>
  )
} 