# Gmail OAuth Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### 1. Google Cloud Console
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create project → Enable Gmail API
3. OAuth consent screen → External → Fill details
4. Credentials → OAuth 2.0 Client ID → Web application
5. Add redirect URI: `http://localhost:3000/api/auth/gmail/callback`
6. Copy **Client ID** and **Client Secret**

### 2. Environment Variables
Create `.env.local` in project root:
```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=your-client-secret
```

### 3. Test Setup
```bash
pnpm setup-gmail
```

### 4. Restart Application
```bash
pnpm restart
```

## ✅ Success Indicators
- ✅ No "OAuth not configured" errors
- ✅ Gmail OAuth flow works in `/kanalen/email`
- ✅ Emails sent from admin@wasgeurtje.nl
- ✅ Email sync works without errors

## 📚 Full Documentation
- **Complete Setup**: See `GMAIL_OAUTH_PRODUCTION_SETUP.md`
- **Troubleshooting**: Check console logs and Google Cloud Console
- **Support**: Verify environment variables and restart application

---
**Note**: Replace `your-client-id` and `your-client-secret` with actual values from Google Cloud Console. 