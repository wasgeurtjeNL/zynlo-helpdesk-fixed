# Email Configuration Quick Setup

To fix the "Email not configured" error, you need to set up at least one email provider.

## Quick Fix - Using Resend (5 minutes)

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create a free account (100 emails/day free)
   - Get your API key from the dashboard

2. **Create `.env.local` file in the project root**
   ```bash
   # Copy the example file
   cp env.example .env.local
   ```

3. **Edit `.env.local` and add your Resend API key**
   ```env
   # Add this line (replace with your actual key)
   RESEND_API_KEY=re_123456789_yourActualResendApiKey
   ```

4. **Also add your Supabase credentials** (from your Supabase dashboard)
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

5. **Restart your development server**
   ```bash
   # Stop the current server (Ctrl+C)
   # Then restart
   pnpm dev
   ```

## Alternative - Using Gmail OAuth

For production use or if you prefer Gmail, follow the detailed guide in `GMAIL_OAUTH_SETUP.md`.

## Verification

After setup, try sending an email again from the compose modal. It should work without errors.

## Troubleshooting

- Make sure `.env.local` is in the root directory (not in apps/dashboard)
- Ensure the API key is correct and has no extra spaces
- Check that the server was restarted after adding the environment variables 