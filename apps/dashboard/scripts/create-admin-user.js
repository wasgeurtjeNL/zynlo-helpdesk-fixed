// This script creates an admin user in Supabase
// Run with: node scripts/create-admin-user.js

const SUPABASE_URL = 'https://nkrytssezaefinbjgwnq.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg'

async function createAdminUser() {
  console.log('Creating admin user...')
  
  const response = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      email: 'admin@wasgeurtje.nl',
      password: 'admin123456',  // Change this to your preferred password
      data: {
        full_name: 'Admin User',
        role: 'admin'
      }
    })
  })

  const data = await response.json()
  
  if (response.ok) {
    console.log('✅ Admin user created successfully!')
    console.log('Email: admin@wasgeurtje.nl')
    console.log('Password: admin123456')
    console.log('\nIMPORTANT: Please change this password after first login!')
  } else {
    console.error('❌ Error creating user:', data)
    if (data.msg === 'User already registered') {
      console.log('\n💡 User already exists. Try logging in with:')
      console.log('Email: admin@wasgeurtje.nl')
      console.log('Password: (the password you set when creating the account)')
    }
  }
}

createAdminUser() 