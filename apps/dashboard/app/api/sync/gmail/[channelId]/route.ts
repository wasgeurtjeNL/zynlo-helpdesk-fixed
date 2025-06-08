import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(
  request: NextRequest,
  { params }: { params: { channelId: string } }
) {
  const { channelId } = params
  
  try {
    console.log(`Gmail sync requested for channel: ${channelId}`)
    
    // Initialize Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured')
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Get channel info
    const { data: channel, error: channelError } = await supabase
      .from('channels')
      .select('*')
      .eq('id', channelId)
      .single()
    
    if (channelError) {
      console.error('Channel lookup error:', channelError)
      throw new Error('Channel niet gevonden')
    }
    
    if (!channel) {
      throw new Error('Kanaal bestaat niet')
    }
    
    console.log('Found channel:', channel.name)
    
    // Update last sync time
    const { error: updateError } = await supabase
      .from('channels')
      .update({ 
        last_sync: new Date().toISOString(),
        settings: {
          ...channel.settings,
          sync_count: (channel.settings?.sync_count || 0) + 1
        }
      })
      .eq('id', channelId)
    
    if (updateError) {
      console.error('Update error:', updateError)
    }
    
    // 🚧 MOCK IMPLEMENTATION - TODO: Replace with real Gmail API
    // This currently simulates email sync for development/testing
    console.log('🚧 Using MOCK Gmail sync - no real emails fetched')
    
    // For now, return consistent mock data to avoid confusion
    const mockResult = {
      newEmails: 0,
      existingEmails: 0,
      errors: 0,
      status: 'mock_sync_completed'
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `🚧 MOCK: Sync test voltooid voor ${channel.name}`,
      note: "Dit is test data - nog geen echte Gmail integratie",
      channelId,
      channelName: channel.name,
      result: mockResult,
      lastSync: new Date().toISOString(),
      implementation_status: "mock"
    })
  } catch (error) {
    console.error('Gmail sync error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Sync failed' 
      },
      { status: 500 }
    )
  }
} 