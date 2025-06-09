# Gmail OAuth Setup Guide

This guide explains how to properly configure Gmail OAuth integration to resolve authentication errors.

## 🚨 Current Issue

You're seeing these errors because Gmail OAuth credentials are not configured:
- ❌ Google OAuth credentials not configured
- ❌ Failed to fetch Gmail message: invalid_request
- ❌ OAuth configuratie ontbreekt - contacteer administrator

## ⚡ Quick Fix (Disable Gmail Sync)

**Already applied!** Gmail sync is now disabled when OAuth credentials are not configured, stopping the error spam.

## 🔧 Full Setup (Enable Gmail Integration)

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable the **Gmail API**:
   - Navigate to **APIs & Services** > **Library**
   - Search for "Gmail API"
   - Click **Enable**

### 2. Configure OAuth Consent Screen

1. Go to **APIs & Services** > **OAuth consent screen**
2. Select **External** user type
3. Fill in required fields:
   - **App name**: Zynlo Helpdesk
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
5. Add test users (your email addresses)

### 3. Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Select **Web application**
4. Add authorized redirect URIs:
   ```
   http://localhost:3000/api/auth/gmail/callback
   https://your-production-domain.com/api/auth/gmail/callback
   ```
5. Save and copy the:
   - **Client ID**
   - **Client Secret**

### 4. Configure Environment Variables

Add to your `.env.local` file:

```env
# Gmail OAuth Configuration
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# API URLs (adjust for your environment)
API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000
```

### 5. Restart Services

```bash
# Stop current services
pnpm dev
# Ctrl+C to stop

# Restart with new configuration
pnpm dev
```

## 🧪 Testing Gmail Integration

1. **Navigate to**: `/kanalen/email` in your dashboard
2. **Click**: "Connect Gmail Account"
3. **Authorize**: Gmail access
4. **Verify**: Channel appears in channel list

## 🔍 Troubleshooting

### Common Issues:

**1. "invalid_request" errors**
- ❌ Wrong redirect URI
- ✅ Ensure redirect URI matches exactly: `http://localhost:3000/api/auth/gmail/callback`

**2. "access_denied" errors**
- ❌ OAuth consent screen not configured
- ✅ Follow step 2 above

**3. "unauthorized_client" errors**
- ❌ Client ID/Secret incorrect
- ✅ Double-check credentials from Google Cloud Console

**4. Still seeing sync errors**
- ❌ Old database channels with invalid tokens
- ✅ Delete old channels from database:
  ```sql
  DELETE FROM channels WHERE provider = 'gmail' AND is_active = false;
  ```

## 📋 Production Deployment

For production:

1. **Update OAuth consent screen** to "Published" status
2. **Add production URLs** to authorized redirect URIs
3. **Set environment variables** in your hosting platform
4. **Test end-to-end** Gmail integration

## 🔒 Security Notes

- **Never commit** OAuth credentials to version control
- **Use different credentials** for development and production  
- **Regularly rotate** client secrets
- **Monitor usage** in Google Cloud Console

## 🆘 Need Help?

If you continue to see errors after setup:

1. Check Google Cloud Console logs
2. Verify all redirect URIs are correct
3. Ensure Gmail API is enabled
4. Test with a simple OAuth flow first

---

**Status**: Gmail sync is currently disabled to prevent errors. Follow this guide to enable it properly. 