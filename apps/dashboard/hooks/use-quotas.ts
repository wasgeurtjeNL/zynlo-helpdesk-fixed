import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@zynlo/supabase'
import { useUser } from '@/hooks/use-user'

export interface OrganizationQuota {
  id: string
  organization_id: string
  max_tickets: number
  max_active_tickets: number
  max_users: number
  max_storage_gb: number
  max_attachments_per_ticket: number
  max_attachment_size_mb: number
  current_tickets: number
  current_active_tickets: number
  current_users: number
  current_storage_bytes: number
  created_at: string
  updated_at: string
}

export interface UserQuota {
  id: string
  user_id: string
  organization_id?: string
  max_tickets_per_hour: number
  max_tickets_per_day: number
  max_messages_per_hour: number
  max_api_calls_per_hour: number
  tickets_created_this_hour: number
  tickets_created_today: number
  messages_sent_this_hour: number
  api_calls_this_hour: number
  hour_reset_at: string
  day_reset_at: string
  created_at: string
  updated_at: string
}

/**
 * Hook to get organization quota
 */
export function useOrganizationQuota(organizationId?: string) {
  return useQuery({
    queryKey: ['organization-quota', organizationId],
    queryFn: async () => {
      if (!organizationId) return null

      const { data, error } = await supabase
        .from('organization_quotas')
        .select('*')
        .eq('organization_id', organizationId)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data as OrganizationQuota | null
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}

/**
 * Hook to get user quota
 */
export function useUserQuota() {
  const { user } = useUser()

  return useQuery({
    queryKey: ['user-quota', user?.id],
    queryFn: async () => {
      if (!user?.id) return null

      const { data, error } = await supabase
        .from('user_quotas')
        .select('*')
        .eq('user_id', user.id)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      return data as UserQuota | null
    },
    enabled: !!user?.id,
    staleTime: 60 * 1000 // 1 minute
  })
}

/**
 * Hook to check if user can perform action
 */
export function useQuotaCheck() {
  const { data: userQuota } = useUserQuota()
  const queryClient = useQueryClient()

  const checkQuota = async (action: 'create_ticket' | 'send_message' | 'upload_file') => {
    if (!userQuota) return { allowed: true, reason: null }

    switch (action) {
      case 'create_ticket':
        if (userQuota.tickets_created_this_hour >= userQuota.max_tickets_per_hour) {
          return {
            allowed: false,
            reason: `Je hebt het maximum van ${userQuota.max_tickets_per_hour} tickets per uur bereikt. Probeer het later opnieuw.`
          }
        }
        if (userQuota.tickets_created_today >= userQuota.max_tickets_per_day) {
          return {
            allowed: false,
            reason: `Je hebt het maximum van ${userQuota.max_tickets_per_day} tickets per dag bereikt. Probeer het morgen opnieuw.`
          }
        }
        break

      case 'send_message':
        if (userQuota.messages_sent_this_hour >= userQuota.max_messages_per_hour) {
          return {
            allowed: false,
            reason: `Je hebt het maximum van ${userQuota.max_messages_per_hour} berichten per uur bereikt.`
          }
        }
        break
    }

    return { allowed: true, reason: null }
  }

  return { checkQuota }
}

/**
 * Hook to get quota violations
 */
export function useQuotaViolations(organizationId?: string) {
  return useQuery({
    queryKey: ['quota-violations', organizationId],
    queryFn: async () => {
      let query = supabase
        .from('quota_violations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100)

      if (organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query

      if (error) throw error

      return data
    },
    enabled: !!organizationId,
    staleTime: 5 * 60 * 1000
  })
}

/**
 * Calculate quota usage percentages
 */
export function calculateQuotaUsage(quota: OrganizationQuota | UserQuota | null) {
  if (!quota) return null

  if ('max_tickets' in quota) {
    // Organization quota
    return {
      tickets: {
        used: quota.current_tickets,
        max: quota.max_tickets,
        percentage: (quota.current_tickets / quota.max_tickets) * 100
      },
      activeTickets: {
        used: quota.current_active_tickets,
        max: quota.max_active_tickets,
        percentage: (quota.current_active_tickets / quota.max_active_tickets) * 100
      },
      users: {
        used: quota.current_users,
        max: quota.max_users,
        percentage: (quota.current_users / quota.max_users) * 100
      },
      storage: {
        used: quota.current_storage_bytes,
        max: quota.max_storage_gb * 1024 * 1024 * 1024,
        percentage: (quota.current_storage_bytes / (quota.max_storage_gb * 1024 * 1024 * 1024)) * 100,
        usedGB: quota.current_storage_bytes / (1024 * 1024 * 1024),
        maxGB: quota.max_storage_gb
      }
    }
  } else {
    // User quota
    const now = new Date()
    const hourReset = new Date(quota.hour_reset_at)
    const dayReset = new Date(quota.day_reset_at)

    return {
      ticketsHour: {
        used: quota.tickets_created_this_hour,
        max: quota.max_tickets_per_hour,
        percentage: (quota.tickets_created_this_hour / quota.max_tickets_per_hour) * 100,
        resetIn: Math.max(0, hourReset.getTime() - now.getTime())
      },
      ticketsDay: {
        used: quota.tickets_created_today,
        max: quota.max_tickets_per_day,
        percentage: (quota.tickets_created_today / quota.max_tickets_per_day) * 100,
        resetIn: Math.max(0, dayReset.getTime() - now.getTime())
      },
      messagesHour: {
        used: quota.messages_sent_this_hour,
        max: quota.max_messages_per_hour,
        percentage: (quota.messages_sent_this_hour / quota.max_messages_per_hour) * 100,
        resetIn: Math.max(0, hourReset.getTime() - now.getTime())
      }
    }
  }
}

/**
 * Format time until reset
 */
export function formatResetTime(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / 60000)
  const hours = Math.floor(minutes / 60)

  if (hours > 0) {
    return `${hours} uur ${minutes % 60} minuten`
  }
  return `${minutes} minuten`
} 