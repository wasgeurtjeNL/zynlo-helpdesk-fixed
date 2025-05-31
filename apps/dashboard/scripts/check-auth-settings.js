// Check Supabase auth settings
const SUPABASE_URL = 'https://nkrytssezaefinbjgwnq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg'

async function checkSettings() {
  console.log('Checking Supabase auth settings...\n')
  
  // Test basic connectivity
  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/settings`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
      }
    })
    
    if (response.ok) {
      const settings = await response.json()
      console.log('Auth settings:', JSON.stringify(settings, null, 2))
    } else {
      console.log('Settings endpoint returned:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('Error fetching settings:', error)
  }

  // Test login with confirmed user
  console.log('\nTesting login with demo@zynlo.com...')
  try {
    const loginResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: 'demo@zynlo.com',
        password: 'demo123456'
      })
    })
    
    const result = await loginResponse.json()
    
    if (loginResponse.ok) {
      console.log('✅ Login successful!')
      console.log('User:', result.user?.email)
    } else {
      console.log('❌ Login failed:', result)
    }
  } catch (error) {
    console.error('Login error:', error)
  }
}

checkSettings() 