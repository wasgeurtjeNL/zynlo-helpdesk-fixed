import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupConfig {
  cleanWebhookLogs?: boolean
  cleanSystemLogs?: boolean
  cleanOldAttachments?: boolean
  daysToKeep?: number
  dryRun?: boolean
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Parse configuration
    const config: CleanupConfig = req.method === 'POST' 
      ? await req.json() 
      : {}
    
    const {
      cleanWebhookLogs = true,
      cleanSystemLogs = true,
      cleanOldAttachments = true,
      daysToKeep = 30,
      dryRun = false
    } = config

    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)

    console.log(`Cleaning data older than ${cutoffDate.toISOString()}`)
    console.log(`Dry run: ${dryRun}`)

    const results: any = {
      webhookLogs: { count: 0, size: 0 },
      systemLogs: { count: 0, size: 0 },
      attachments: { count: 0, size: 0 },
      totalFreed: 0
    }

    // Clean webhook logs
    if (cleanWebhookLogs) {
      const { data: oldLogs, error } = await supabase
        .from('webhook_logs')
        .select('id, payload, created_at')
        .lt('created_at', cutoffDate.toISOString())
        .limit(1000)  // Process in batches

      if (!error && oldLogs) {
        results.webhookLogs.count = oldLogs.length
        
        // Estimate size based on payload
        oldLogs.forEach((log: any) => {
          const size = new Blob([JSON.stringify(log.payload || {})]).size
          results.webhookLogs.size += size
        })

        if (!dryRun && oldLogs.length > 0) {
          const { error: deleteError } = await supabase
            .from('webhook_logs')
            .delete()
            .in('id', oldLogs.map((l: any) => l.id))

          if (deleteError) {
            console.error('Error deleting webhook logs:', deleteError)
          }
        }
      }
    }

    // Clean system logs
    if (cleanSystemLogs) {
      const { data: oldLogs, error } = await supabase
        .from('system_logs')
        .select('id, event_data, created_at')
        .lt('created_at', cutoffDate.toISOString())
        .limit(1000)

      if (!error && oldLogs) {
        results.systemLogs.count = oldLogs.length
        
        oldLogs.forEach((log: any) => {
          const size = new Blob([JSON.stringify(log.event_data || {})]).size
          results.systemLogs.size += size
        })

        if (!dryRun && oldLogs.length > 0) {
          const { error: deleteError } = await supabase
            .from('system_logs')
            .delete()
            .in('id', oldLogs.map((l: any) => l.id))

          if (deleteError) {
            console.error('Error deleting system logs:', deleteError)
          }
        }
      }
    }

    // Clean old attachments (from archived tickets)
    if (cleanOldAttachments) {
      // Find attachments from archived/old tickets
      const { data: oldAttachments, error } = await supabase
        .from('messages')
        .select(`
          id,
          attachments,
          conversation:conversation_id(
            ticket:ticket_id(
              status,
              updated_at
            )
          )
        `)
        .not('attachments', 'is', null)
        .filter('conversation.ticket.status', 'eq', 'archived')
        .limit(100)

      if (!error && oldAttachments) {
        let attachmentCount = 0
        let totalSize = 0

        for (const message of oldAttachments) {
          if (message.attachments && Array.isArray(message.attachments)) {
            for (const attachment of message.attachments) {
              attachmentCount++
              totalSize += attachment.size || 0

              if (!dryRun && attachment.path) {
                // Delete from storage
                const { error: storageError } = await supabase.storage
                  .from('ticket-attachments')
                  .remove([attachment.path])

                if (storageError) {
                  console.error('Error deleting attachment:', storageError)
                }
              }
            }

            if (!dryRun) {
              // Clear attachments from message
              await supabase
                .from('messages')
                .update({ attachments: [] })
                .eq('id', message.id)
            }
          }
        }

        results.attachments.count = attachmentCount
        results.attachments.size = totalSize
      }
    }

    // Calculate total freed space
    results.totalFreed = 
      results.webhookLogs.size + 
      results.systemLogs.size + 
      results.attachments.size

    // Log the cleanup
    if (!dryRun) {
      await supabase
        .from('system_logs')
        .insert({
          event_type: 'data_cleanup',
          event_data: {
            config,
            results,
            cutoff_date: cutoffDate.toISOString()
          },
          created_at: new Date().toISOString()
        })
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: dryRun 
          ? `Would clean ${results.webhookLogs.count + results.systemLogs.count + results.attachments.count} items`
          : `Cleaned ${results.webhookLogs.count + results.systemLogs.count + results.attachments.count} items`,
        results,
        estimatedFreedSpace: `${(results.totalFreed / 1024 / 1024).toFixed(2)} MB`
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Cleanup error:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 