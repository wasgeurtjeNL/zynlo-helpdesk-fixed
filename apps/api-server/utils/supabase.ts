import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Force load environment variables if not already loaded
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })
dotenv.config({ path: path.resolve(__dirname, '../.env') })

// Try multiple possible environment variable names
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''

// Debug logging
console.log('[Supabase Client] Environment check:')
console.log('  NEXT_PUBLIC_SUPABASE_URL exists:', !!process.env.NEXT_PUBLIC_SUPABASE_URL)
console.log('  SUPABASE_URL exists:', !!process.env.SUPABASE_URL)
console.log('  SUPABASE_SERVICE_ROLE_KEY exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
console.log('  SUPABASE_SERVICE_KEY exists:', !!process.env.SUPABASE_SERVICE_KEY)
console.log('  URL being used:', supabaseUrl)
console.log('  Service key length:', supabaseServiceKey.length)

// Create a dummy client if credentials are missing (for development)
if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('⚠️  Supabase credentials missing - API functionality will be limited')
}

export const supabase = createClient(
  supabaseUrl || 'https://dummy.supabase.co', 
  supabaseServiceKey || 'dummy-key',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Export the raw values for debugging
export const supabaseConfig = {
  url: supabaseUrl,
  serviceKey: supabaseServiceKey,
  hasCredentials: !!supabaseUrl && !!supabaseServiceKey
} 