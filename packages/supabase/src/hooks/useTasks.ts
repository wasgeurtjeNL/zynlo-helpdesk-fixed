import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'
import type { Database } from '../types/database.types'

type Task = Database['public']['Tables']['tasks']['Row']
type TaskComment = Database['public']['Tables']['task_comments']['Row']

interface TaskWithDetails extends Task {
  creator: {
    id: string
    email: string
    full_name: string | null
  }
  assignees: Array<{
    id: string
    email: string
    full_name: string | null
  }>
  comment_count: number
}

interface CreateTaskParams {
  title: string
  description?: string
  status?: 'todo' | 'in_progress' | 'done' | 'cancelled'
  priority?: 'low' | 'normal' | 'high' | 'urgent'
  due_date?: string | null
  ticket_id?: string | null
  assignee_ids?: string[]
}

// Hook for fetching a single task
export function useTask(taskId: string) {
  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select(`
          *,
          creator:created_by(id, email, full_name),
          assignees:task_assignees(user:user_id(id, email, full_name)),
          comments:task_comments(count)
        `)
        .eq('id', taskId)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!taskId,
  })
}

// Hook for fetching tasks list
export function useTasks(filters?: {
  status?: string
  user_id?: string
  include_completed?: boolean
}) {
  return useQuery({
    queryKey: ['tasks', filters],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_tasks_with_details', {
        p_filter_status: filters?.status || null,
        p_filter_user_id: filters?.user_id || null,
        p_include_completed: filters?.include_completed || false,
      })

      if (error) throw error
      return data as TaskWithDetails[]
    },
  })
}

// Hook for creating a task
export function useCreateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: CreateTaskParams) => {
      const { data, error } = await supabase.rpc('create_task_with_assignees', {
        p_title: params.title,
        p_description: params.description || null,
        p_status: params.status || 'todo',
        p_priority: params.priority || 'normal',
        p_due_date: params.due_date || null,
        p_ticket_id: params.ticket_id || null,
        p_assignee_ids: params.assignee_ids || [],
      })

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

// Hook for updating a task
export function useUpdateTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      updates 
    }: { 
      taskId: string
      updates: Partial<{
        title: string
        description: string
        status: 'todo' | 'in_progress' | 'done' | 'cancelled'
        priority: 'low' | 'normal' | 'high' | 'urgent'
        due_date: string | null
      }>
    }) => {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', taskId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

// Hook for updating task status
export function useUpdateTaskStatus() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      status 
    }: { 
      taskId: string
      status: 'todo' | 'in_progress' | 'done' | 'cancelled'
    }) => {
      const { data, error } = await supabase.rpc('update_task_status', {
        p_task_id: taskId,
        p_status: status,
      })

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

// Hook for deleting a task
export function useDeleteTask() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', taskId)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['task-stats'] })
    },
  })
}

// Hook for task comments
export function useTaskComments(taskId: string) {
  return useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('task_comments')
        .select(`
          *,
          user:user_id(id, email, full_name)
        `)
        .eq('task_id', taskId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data
    },
    enabled: !!taskId,
  })
}

// Hook for adding a task comment
export function useAddTaskComment() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      content 
    }: { 
      taskId: string
      content: string 
    }) => {
      const { data, error } = await supabase
        .from('task_comments')
        .insert({
          task_id: taskId,
          content,
          user_id: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
    },
  })
}

// Hook for task statistics
export function useTaskStats(userId: string) {
  return useQuery({
    queryKey: ['task-stats', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_task_stats', {
        p_user_id: userId,
      })

      if (error) throw error
      return data as {
        total_tasks: number
        my_tasks: number
        overdue_tasks: number
        completed_today: number
        due_today: number
        due_this_week: number
      }
    },
    enabled: !!userId,
  })
}

// Hook for managing task assignees
export function useUpdateTaskAssignees() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ 
      taskId, 
      assigneeIds 
    }: { 
      taskId: string
      assigneeIds: string[] 
    }) => {
      // First, remove all existing assignees
      await supabase
        .from('task_assignees')
        .delete()
        .eq('task_id', taskId)

      // Then add new assignees
      if (assigneeIds.length > 0) {
        const { error } = await supabase
          .from('task_assignees')
          .insert(
            assigneeIds.map(userId => ({
              task_id: taskId,
              user_id: userId,
            }))
          )

        if (error) throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['task', variables.taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
} 