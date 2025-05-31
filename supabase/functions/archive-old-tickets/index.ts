import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ArchiveConfig {
  daysOld?: number  // How many days old tickets should be before archiving
  statuses?: string[]  // Which statuses to consider for archiving
  dryRun?: boolean  // Whether to just report what would be archived
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
    const config: ArchiveConfig = req.method === 'POST' 
      ? await req.json() 
      : {}
    
    const daysOld = config.daysOld || 365  // Default: 1 year
    const statuses = config.statuses || ['closed', 'resolved']  // Default: closed and resolved tickets
    const dryRun = config.dryRun || false

    // Calculate cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    console.log(`Archiving tickets older than ${cutoffDate.toISOString()}`)
    console.log(`Statuses to archive: ${statuses.join(', ')}`)
    console.log(`Dry run: ${dryRun}`)

    // Find tickets to archive
    const { data: ticketsToArchive, error: fetchError } = await supabase
      .from('tickets')
      .select(`
        id,
        number,
        subject,
        status,
        created_at,
        updated_at,
        customer:customer_id(email)
      `)
      .in('status', statuses)
      .lt('updated_at', cutoffDate.toISOString())
      .order('created_at', { ascending: true })

    if (fetchError) {
      throw new Error(`Failed to fetch tickets: ${fetchError.message}`)
    }

    const ticketCount = ticketsToArchive?.length || 0
    console.log(`Found ${ticketCount} tickets to archive`)

    if (ticketCount === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No tickets to archive',
          count: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // If dry run, just return the tickets that would be archived
    if (dryRun) {
      return new Response(
        JSON.stringify({
          success: true,
          message: `Would archive ${ticketCount} tickets (dry run)`,
          count: ticketCount,
          tickets: ticketsToArchive.map(t => ({
            number: t.number,
            subject: t.subject,
            status: t.status,
            created: t.created_at,
            lastUpdated: t.updated_at,
            customer: t.customer?.email
          }))
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Archive tickets (move to archive table and delete from main table)
    const ticketIds = ticketsToArchive.map(t => t.id)
    
    // First, copy to archive table (if it exists)
    const { error: archiveError } = await supabase
      .from('archived_tickets')
      .insert(
        ticketsToArchive.map(ticket => ({
          ...ticket,
          archived_at: new Date().toISOString(),
          archived_reason: 'age_based_policy'
        }))
      )
      .select()

    if (archiveError && archiveError.code !== '42P01') { // 42P01 = table does not exist
      console.error('Archive table error:', archiveError)
      // Continue anyway - we'll just mark as archived
    }

    // Mark tickets as archived instead of deleting
    const { error: updateError } = await supabase
      .from('tickets')
      .update({ 
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .in('id', ticketIds)

    if (updateError) {
      throw new Error(`Failed to archive tickets: ${updateError.message}`)
    }

    // Log the archival
    await supabase
      .from('system_logs')
      .insert({
        event_type: 'tickets_archived',
        event_data: {
          count: ticketCount,
          cutoff_date: cutoffDate.toISOString(),
          statuses: statuses,
          ticket_numbers: ticketsToArchive.map(t => t.number)
        },
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully archived ${ticketCount} tickets`,
        count: ticketCount,
        archivedTickets: ticketsToArchive.map(t => t.number)
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Archive error:', error)
    
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