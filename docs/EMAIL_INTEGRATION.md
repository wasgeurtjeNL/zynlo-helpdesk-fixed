# Email Integration Setup Guide

Deze guide helpt je bij het opzetten van de Gmail integratie voor het Zynlo Helpdesk systeem.

## 🚀 Huidige Status (December 2024)

### ✅ **Geïmplementeerd & Werkend:**
- Gmail OAuth flow (connect/callback)
- Database integratie voor kanalen
- UI feedback met Sonner toasts
- Sync API endpoint met database updates
- Responsive frontend in Next.js
- Vercel deployment ready

### ⚠️ **Gedeeltelijk Werkend:**
- Sync functie (mock implementatie - toont feedback maar haalt nog geen echte emails op)
- OAuth callback (redirect werkt, maar slaat nog geen tokens op)

### ❌ **Nog Te Implementeren:**
- Echte Gmail API integratie (emails ophalen)
- Token opslag in database
- Automatische email-naar-ticket conversie
- Email replies versturen
- Attachment handling

## Architectuur

### **Nieuwe Architectuur (Current)**
```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Gmail     │────▶│    Next.js       │────▶│  Supabase   │
│   Account   │     │  API Routes      │     │  Database   │
└─────────────┘     │ /api/auth/gmail/ │     └─────────────┘
                    │ /api/sync/gmail/ │
                    └──────────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Dashboard   │
                    │  (Same App)  │
                    └──────────────┘
```

### **Oude Architectuur (Deprecated)**
```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Gmail     │────▶│  API Server  │────▶│  Supabase   │
│   Account   │     │  (Express)   │     │  Database   │
└─────────────┘     └──────────────┘     └─────────────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  Dashboard   │
                    │  (Next.js)   │
                    └──────────────┘
```

## Stap 1: Google Cloud Project Setup

1. Ga naar [Google Cloud Console](https://console.cloud.google.com/)
2. Maak een nieuw project aan of selecteer een bestaand project
3. Activeer de Gmail API:
   - Ga naar "APIs & Services" > "Library"
   - Zoek naar "Gmail API"
   - Klik op "Enable"

## Stap 2: OAuth 2.0 Credentials

1. Ga naar "APIs & Services" > "Credentials"
2. Klik op "Create Credentials" > "OAuth client ID"
3. Selecteer "Web application"
4. Configureer:
   - **Name**: Zynlo Helpdesk
   - **Authorized JavaScript origins**: 
     - `http://localhost:3000` (development)
     - `https://your-vercel-app.vercel.app` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3000/api/auth/gmail/callback` (development)
     - `https://your-vercel-app.vercel.app/api/auth/gmail/callback` (production)
5. Kopieer de Client ID en Client Secret

## Stap 3: Environment Variables

### **Vercel Production:**
In Vercel project settings > Environment Variables:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### **Local Development:**
In `apps/dashboard/.env.local`:
```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Stap 4: Deployment & Testing

### **Development:**
```bash
cd apps/dashboard
pnpm dev
```
App draait op `http://localhost:3000`

### **Production:**
- Push naar GitHub
- Vercel deployt automatisch
- Controleer environment variables in Vercel dashboard

## Stap 5: Email Kanaal Toevoegen

1. Ga in de dashboard naar "Kanalen" > "Email"
2. Klik op "Email toevoegen"
3. Geef het kanaal een naam (bijv. "Support Inbox")
4. Klik op "Gmail" om de OAuth flow te starten
5. Log in met je Google account en geef toestemming
6. Je wordt teruggeleid naar de dashboard

## API Endpoints (Next.js Routes)

### **OAuth Flow:**
- `GET /api/auth/gmail/connect` - Start OAuth flow
- `GET /api/auth/gmail/callback` - Handle OAuth callback

### **Sync Operations:**
- `POST /api/sync/gmail/[channelId]` - Trigger manual sync

## Hoe het werkt (Current Implementation)

### **OAuth Flow (✅ Working):**
1. User klikt "Gmail" in add channel dialog
2. Redirect naar Google OAuth met correct callback URL
3. User authorizes access
4. Google redirects to `/api/auth/gmail/callback`
5. Callback route handles response and redirects to email channels page

### **Sync Process (⚠️ Mock Implementation):**
1. User klikt sync button (🔄)
2. Frontend calls `/api/sync/gmail/[channelId]`
3. API route:
   - Fetches channel info from database
   - Updates `last_sync` timestamp
   - Returns mock success response
4. Frontend shows Sonner toast with feedback
5. Channel list refreshes to show updated sync time

### **Next Steps for Full Implementation:**
1. **Token Storage:** Store OAuth tokens in database after callback
2. **Gmail API Integration:** Use stored tokens to fetch emails
3. **Email Processing:** Convert emails to tickets/messages
4. **Reply Functionality:** Send ticket replies as emails

## File Structure

```
apps/dashboard/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── gmail/
│   │   │       ├── connect/
│   │   │       │   └── route.ts     # OAuth initiation
│   │   │       └── callback/
│   │   │           └── route.ts     # OAuth callback handler
│   │   └── sync/
│   │       └── gmail/
│   │           └── [channelId]/
│   │               └── route.ts     # Manual sync trigger
│   └── (dashboard)/
│       └── kanalen/
│           └── email/
│               └── page.tsx         # Email channels UI
```

## Troubleshooting

### **OAuth Issues:**
- **"Invalid redirect URI"**: Check Google Console redirect URIs exactly match your URLs
- **"Client ID not found"**: Verify `GOOGLE_CLIENT_ID` environment variable
- **Stuck on callback**: Check browser console for JavaScript errors

### **Sync Issues:**
- **No toast appears**: Check browser console, might be Sonner configuration issue
- **API errors**: Check Vercel function logs in dashboard
- **Database errors**: Verify Supabase credentials and RLS policies

### **Common Fixes:**
- Clear browser cache and cookies
- Verify all environment variables are set in Vercel
- Check Supabase RLS policies allow operations
- Ensure proper CORS headers (handled by Next.js)

## Security Status

### **Current Security Measures:**
- OAuth 2.0 with PKCE flow
- HTTPS-only in production
- Environment variables for secrets
- Supabase RLS policies

### **Security TODOs:**
- Encrypt stored OAuth tokens
- Implement token refresh logic
- Add webhook signature verification
- Rate limiting on sync endpoints

## Development Roadmap

### **Phase 1 - Foundation (✅ Complete)**
- [x] Next.js API routes setup
- [x] OAuth flow implementation
- [x] Database integration
- [x] Basic UI with feedback

### **Phase 2 - Core Functionality (🚧 In Progress)**
- [ ] Store OAuth tokens securely
- [ ] Implement Gmail API client
- [ ] Email fetching functionality
- [ ] Basic email-to-ticket conversion

### **Phase 3 - Advanced Features**
- [ ] Email reply functionality
- [ ] Attachment handling
- [ ] Thread detection
- [ ] Automated sync scheduling

### **Phase 4 - Polish**
- [ ] Outlook/Office 365 support
- [ ] IMAP/SMTP fallback
- [ ] Email templates
- [ ] Advanced filtering 