# Gmail OAuth Production Setup Guide

## 🎯 Overview
This guide will help you replace the development/mock Gmail OAuth credentials with real production credentials from Google Cloud Console.

## 📋 Prerequisites
- Google account (preferably admin@wasgeurtje.nl)
- Access to Google Cloud Console
- Admin access to your hosting platform (Vercel, etc.)

## 🔧 Step 1: Google Cloud Console Setup

### 1.1 Create/Select Project
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing project
3. Note your project ID for reference

### 1.2 Enable Gmail API
1. Navigate to **APIs & Services** → **Library**
2. Search for "Gmail API"
3. Click **Enable**
4. Wait for activation (may take a few minutes)

### 1.3 Configure OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **External** user type
3. Fill in application information:
   ```
   App name: Zynlo Helpdesk
   User support email: admin@wasgeurtje.nl
   App logo: (optional - upload your logo)
   App domain: your-production-domain.com
   Developer contact: admin@wasgeurtje.nl
   ```
4. **Add OAuth Scopes**:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.send`
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://mail.google.com/` (full Gmail access)

5. **Add Test Users** (for testing phase):
   - `admin@wasgeurtje.nl`
   - Any other email addresses you want to test with

6. **Save and Continue**

### 1.4 Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Select **Web application**
4. Configure:
   ```
   Name: Zynlo Helpdesk OAuth Client
   
   Authorized JavaScript origins:
   - http://localhost:3000 (development)
   - https://your-production-domain.com (production)
   
   Authorized redirect URIs:
   - http://localhost:3000/api/auth/gmail/callback (development)
   - https://your-production-domain.com/api/auth/gmail/callback (production)
   ```
5. Click **Create**
6. **IMPORTANT**: Copy and securely store:
   - **Client ID** (format: `123456789-abc123.apps.googleusercontent.com`)
   - **Client Secret** (format: `GOCSPX-abc123def456`)

## 🔧 Step 2: Environment Configuration

### 2.1 Create/Update .env.local
Create a `.env.local` file in your project root with:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Gmail OAuth Configuration (REPLACE WITH YOUR REAL CREDENTIALS)
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456

# Alternative names (for compatibility)
GMAIL_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-abc123def456

# Application URLs
NEXT_PUBLIC_APP_URL=http://localhost:3000
API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### 2.2 Production Environment Variables
For your production hosting platform (Vercel, Railway, etc.), add these environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-abc123def456
GMAIL_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-abc123def456
NEXT_PUBLIC_BASE_URL=https://your-production-domain.com
API_URL=https://your-production-domain.com
DASHBOARD_URL=https://your-production-domain.com
```

## 🔧 Step 3: Update OAuth Redirect URIs

### 3.1 Development URLs
Ensure these are added to your Google Cloud Console OAuth client:
- `http://localhost:3000/api/auth/gmail/callback`

### 3.2 Production URLs
Add your production domain:
- `https://your-production-domain.com/api/auth/gmail/callback`
- `https://your-production-domain.vercel.app/api/auth/gmail/callback` (if using Vercel)

## 🧪 Step 4: Testing

### 4.1 Development Testing
1. Restart your development server:
   ```bash
   pnpm dev
   ```
2. Navigate to `/kanalen/email`
3. Click "Email Kanaal Toevoegen"
4. Select "Gmail" provider
5. Click "Koppel Gmail Account"
6. Complete OAuth flow with admin@wasgeurtje.nl
7. Verify channel appears in channel list

### 4.2 Production Testing
1. Deploy to production with new environment variables
2. Test OAuth flow on production domain
3. Verify email sending/receiving works

## 🔒 Step 5: Security & Publishing

### 5.1 OAuth Consent Screen Publishing
1. Go back to **OAuth consent screen** in Google Cloud Console
2. Click **Publish App** when ready for production
3. This removes the "unverified app" warning

### 5.2 Security Best Practices
- **Never commit** OAuth credentials to version control
- **Use different credentials** for development and production
- **Regularly rotate** client secrets (every 6-12 months)
- **Monitor usage** in Google Cloud Console
- **Set up billing alerts** to monitor API usage

## 🚨 Troubleshooting

### Common Issues:

**1. "invalid_request" Error**
- ❌ Wrong redirect URI
- ✅ Ensure redirect URI matches exactly in Google Cloud Console

**2. "access_denied" Error**
- ❌ OAuth consent screen not configured properly
- ✅ Complete consent screen setup and add test users

**3. "unauthorized_client" Error**
- ❌ Client ID/Secret incorrect or not set
- ✅ Double-check credentials in environment variables

**4. "redirect_uri_mismatch" Error**
- ❌ Redirect URI not authorized
- ✅ Add exact redirect URI to Google Cloud Console

**5. Still seeing "OAuth not configured" errors**
- ❌ Environment variables not loaded
- ✅ Restart application after setting environment variables
- ✅ Check environment variable names match exactly

### Debug Steps:
1. Check Google Cloud Console logs
2. Verify all redirect URIs are correct
3. Ensure Gmail API is enabled
4. Test with a simple OAuth flow first
5. Check browser network tab for detailed error messages

## 📞 Support

If you encounter issues:
1. Check Google Cloud Console error logs
2. Verify environment variables are set correctly
3. Test OAuth flow step by step
4. Check browser developer tools for detailed errors

## 🎉 Success Indicators

You'll know it's working when:
- ✅ No "OAuth not configured" errors in console
- ✅ Gmail OAuth flow completes successfully
- ✅ Channel appears in channel list with "Connected" status
- ✅ Emails can be sent using admin@wasgeurtje.nl as sender
- ✅ Email sync works without errors

---

**Next Steps**: After completing this setup, you'll have real Gmail OAuth integration that allows sending emails from admin@wasgeurtje.nl and syncing incoming emails to your helpdesk system. 