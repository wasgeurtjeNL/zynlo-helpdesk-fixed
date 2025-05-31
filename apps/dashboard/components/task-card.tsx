'use client'

import { useState } from 'react'
import { 
  CheckCircle2, 
  Circle, 
  Clock, 
  Calendar,
  User,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateTaskStatus } from '@zynlo/supabase'
import type { Database } from '@zynlo/supabase'

type TaskStatus = Database['public']['Enums']['task_status']
type TaskPriority = Database['public']['Enums']['task_priority']

interface TaskCardProps {
  task: {
    id: string
    title: string
    description?: string | null
    status: TaskStatus
    priority: TaskPriority
    due_date?: string | null
    created_at: string
    completed_at?: string | null
    creator?: {
      id: string
      email: string
      full_name?: string | null
    }
    assignees?: Array<{
      id: string
      email: string
      full_name?: string | null
    }>
    comment_count?: number
  }
  onEdit?: () => void
  onDelete?: () => void
  onClick?: () => void
}

const priorityColors = {
  low: 'text-gray-500',
  normal: 'text-blue-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

const priorityLabels = {
  low: 'Laag',
  normal: 'Normaal',
  high: 'Hoog',
  urgent: 'Urgent',
}

export function TaskCard({ task, onEdit, onDelete, onClick }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const updateStatus = useUpdateTaskStatus()

  const handleStatusToggle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const newStatus = task.status === 'done' ? 'todo' : 'done'
    await updateStatus.mutateAsync({
      taskId: task.id,
      status: newStatus,
    })
  }

  const formatDate = (date: string) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    if (d.toDateString() === today.toDateString()) {
      return 'Vandaag'
    } else if (d.toDateString() === tomorrow.toDateString()) {
      return 'Morgen'
    } else {
      return d.toLocaleDateString('nl-NL', { 
        day: 'numeric', 
        month: 'short' 
      })
    }
  }

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done'

  return (
    <div 
      className={cn(
        "bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer",
        task.status === 'done' && "opacity-60"
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* Status checkbox */}
        <button
          onClick={handleStatusToggle}
          className="mt-0.5 flex-shrink-0"
          disabled={updateStatus.isPending}
        >
          {task.status === 'done' ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400 hover:text-gray-600" />
          )}
        </button>

        {/* Task content */}
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "text-sm font-medium text-gray-900",
            task.status === 'done' && "line-through text-gray-500"
          )}>
            {task.title}
          </h3>
          
          {task.description && (
            <p className="mt-1 text-sm text-gray-600 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* Meta information */}
          <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
            {/* Priority */}
            <span className={cn("flex items-center gap-1", priorityColors[task.priority])}>
              <AlertCircle className="w-3 h-3" />
              {priorityLabels[task.priority]}
            </span>

            {/* Due date */}
            {task.due_date && (
              <span className={cn(
                "flex items-center gap-1",
                isOverdue && "text-red-500 font-medium"
              )}>
                <Calendar className="w-3 h-3" />
                {formatDate(task.due_date)}
              </span>
            )}

            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assignees.length === 1 
                  ? task.assignees[0].full_name || task.assignees[0].email.split('@')[0]
                  : `${task.assignees.length} personen`
                }
              </span>
            )}

            {/* Comments */}
            {task.comment_count && task.comment_count > 0 && (
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {task.comment_count}
              </span>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowMenu(!showMenu)
            }}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>

          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(false)
                }}
              />
              <div className="absolute right-0 mt-1 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-20">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onEdit?.()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 text-left"
                >
                  <Edit2 className="w-4 h-4" />
                  Bewerken
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowMenu(false)
                    onDelete?.()
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-gray-100 text-left"
                >
                  <Trash2 className="w-4 h-4" />
                  Verwijderen
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
} 