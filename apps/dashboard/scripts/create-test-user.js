// This script creates a test user in Supabase
// Run with: node scripts/create-test-user.js

const SUPABASE_URL = 'https://nkrytssezaefinbjgwnq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg'

async function createTestUser() {
  console.log('Creating test user...')
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: 'demo@zynlo.com',
      password: 'demo123456',
      data: {
        full_name: 'Demo User'
      }
    })
  })

  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Test user created successfully!')
    console.log('Email: demo@zynlo.com')
    console.log('Password: demo123456')
  } else {
    console.error('❌ Error creating user:', data)
  }
}

createTestUser() 