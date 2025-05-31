'use client'

import { useState } from 'react'
import { 
  X, 
  Calendar, 
  User, 
  AlertCircle, 
  Edit2,
  Clock,
  CheckCircle2,
  Circle,
  XCircle,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TaskComments } from './task-comments'
import { 
  useTask, 
  useUpdateTaskStatus,
  useAuth
} from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']

interface TaskDetailProps {
  taskId: string
  onClose: () => void
  onEdit: () => void
}

const statusOptions: Array<{ value: TaskStatus; label: string; icon: any; color: string }> = [
  { value: 'todo', label: 'Te doen', icon: Circle, color: 'text-gray-500' },
  { value: 'in_progress', label: 'Bezig', icon: Clock, color: 'text-blue-500' },
  { value: 'done', label: 'Voltooid', icon: CheckCircle2, color: 'text-green-500' },
  { value: 'cancelled', label: 'Geannuleerd', icon: XCircle, color: 'text-red-500' },
]

const priorityLabels: Record<TaskPriority, { label: string; color: string }> = {
  low: { label: 'Laag', color: 'text-gray-500' },
  normal: { label: 'Normaal', color: 'text-blue-500' },
  high: { label: 'Hoog', color: 'text-orange-500' },
  urgent: { label: 'Urgent', color: 'text-red-500' },
}

export function TaskDetail({ taskId, onClose, onEdit }: TaskDetailProps) {
  const { user } = useAuth()
  const { data: task, isLoading } = useTask(taskId)
  const updateStatus = useUpdateTaskStatus()
  
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  if (isLoading || !task) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
      </div>
    )
  }

  const handleStatusChange = async (status: TaskStatus) => {
    try {
      await updateStatus.mutateAsync({ taskId, status })
      setShowStatusDropdown(false)
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const currentStatus = statusOptions.find(s => s.value === task.status)
  const priority = task.priority ? priorityLabels[task.priority as TaskPriority] : priorityLabels.normal

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Taak details</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="p-2 hover:bg-gray-100 rounded"
              title="Bewerken"
            >
              <Edit2 className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded"
              title="Sluiten"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            {/* Task info */}
            <div className="space-y-4">
              <h3 className="text-xl font-medium text-gray-900">{task.title}</h3>
              
              {task.description && (
                <p className="text-gray-600 whitespace-pre-wrap">{task.description}</p>
              )}

              {/* Meta info */}
              <div className="grid grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <div className="relative mt-1">
                    <button
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md hover:bg-gray-100"
                    >
                      {currentStatus && (
                        <>
                          <currentStatus.icon className={cn("w-4 h-4", currentStatus.color)} />
                          <span className="text-sm">{currentStatus.label}</span>
                        </>
                      )}
                    </button>
                    {showStatusDropdown && (
                      <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg">
                        {statusOptions.map((option) => (
                          <button
                            key={option.value}
                            onClick={() => handleStatusChange(option.value)}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left"
                          >
                            <option.icon className={cn("w-4 h-4", option.color)} />
                            <span className="text-sm">{option.label}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Priority */}
                {priority && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Prioriteit</label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md">
                      <span className={cn("text-sm font-medium", priority.color)}>
                        {priority.label}
                      </span>
                    </div>
                  </div>
                )}

                {/* Due date */}
                {task.due_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Deadline</label>
                    <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-sm">{formatDate(task.due_date)}</span>
                    </div>
                  </div>
                )}

                {/* Assignees */}
                {task.assignees && task.assignees.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-700">Toegewezen aan</label>
                    <div className="mt-1 space-y-1">
                      {task.assignees.map((assignee: any) => (
                        <div key={assignee.user.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-md">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {assignee.user.full_name || assignee.user.email}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Created info */}
              <div className="text-sm text-gray-500">
                Aangemaakt door {task.creator.full_name || task.creator.email} op {formatDate(task.created_at)}
              </div>
            </div>

            {/* Comments section */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <TaskComments taskId={taskId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 