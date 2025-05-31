import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../client'

interface SendEmailReplyParams {
  ticketId: string
  content: string
  senderEmail: string
  senderName: string
}

export function useSendEmailReply() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (params: SendEmailReplyParams) => {
      // Get the current session to use the user's token
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        throw new Error('User not authenticated')
      }

      // Call the send-email-reply Edge Function
      const { data, error } = await supabase.functions.invoke('send-email-reply', {
        body: params,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      })

      if (error) {
        console.error('Error sending email reply:', error)
        throw new Error(error.message || 'Failed to send email reply')
      }

      if (!data.success) {
        throw new Error(data.error || 'Email sending failed')
      }

      return data
    },
    onSuccess: (data, variables) => {
      // Invalidate queries to refresh the ticket data
      queryClient.invalidateQueries({ queryKey: ['ticket'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
      
      console.log('Email reply sent successfully:', data.emailId)
    },
    onError: (error) => {
      console.error('Failed to send email reply:', error)
    },
  })
} 