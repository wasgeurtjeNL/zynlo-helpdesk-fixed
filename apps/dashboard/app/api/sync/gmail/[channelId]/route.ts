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
        settings: {
          ...channel.settings,
          last_sync: new Date().toISOString()
        }
      })
      .eq('id', channelId)
    
    if (updateError) {
      console.error('Update error:', updateError)
    }
    
    // TODO: Implement real Gmail API sync here
    // For now, simulate processing
    const mockEmailsFound = Math.floor(Math.random() * 5) + 1
    
    return NextResponse.json({ 
      success: true, 
      message: `Gmail sync voltooid voor ${channel.name}`,
      channelId,
      channelName: channel.name,
      processed: mockEmailsFound,
      lastSync: new Date().toISOString()
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