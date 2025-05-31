# Environment Setup Instructions

## IMPORTANT: Create .env.local file

You need to create a file named `.env.local` in this directory (`apps/dashboard/`) with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://nkrytssezaefinbjgwnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg
```

## Steps:

1. Create a new file in `apps/dashboard/` called `.env.local` (note the dot at the beginning!)
2. Copy the content above into the file
3. Save the file
4. Restart the development server

## Test Accounts:

After setting up the environment, you can login with:

**Admin Account:**
- Email: `admin@wasgeurtje.nl`
- Password: `admin123456`

**Demo Account:**
- Email: `demo@zynlo.com`
- Password: `demo123456`

## Troubleshooting:

If login still doesn't work:
1. Make sure email confirmation is disabled in Supabase Dashboard
2. Check that the `.env.local` file is in the correct directory (`apps/dashboard/`)
3. Restart the development server after creating the file 