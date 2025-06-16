# OAuth Setup Instructies

## 🔧 Stap 1: .env.local bestand aanmaken

Maak een `.env.local` bestand aan in de root van je project met de volgende inhoud:

```env
# ============================================
# SUPABASE CONFIGURATION
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://nkrytssezaefinbjgwnq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rcnl0c3NlemFlZmluYmpnd25xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg0MzMzNjksImV4cCI6MjA2NDAwOTM2OX0.lYibGsjREQYbrHI0P8QJc4tm4KOVbzHiXXmPq_BBLxg

# Service role key voor server-side operations (krijg je van Supabase dashboard)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# ============================================
# GOOGLE OAUTH CONFIGURATIE
# ============================================
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# ============================================
# MICROSOFT OAUTH CONFIGURATIE (Optioneel)
# ============================================
AZURE_CLIENT_ID=your-azure-client-id-here
AZURE_CLIENT_SECRET=your-azure-client-secret-here

# ============================================
# DEVELOPMENT SETTINGS
# ============================================
NODE_ENV=development
NEXT_PUBLIC_ENVIRONMENT=development
NEXT_PUBLIC_API_URL=http://localhost:3001
PORT=3001
```

## 🔑 Stap 2: Google OAuth Credentials aanmaken

### 2.1 Google Cloud Console Setup

1. **Ga naar Google Cloud Console**: https://console.cloud.google.com/
2. **Maak een nieuw project aan** of selecteer een bestaand project
3. **Navigeer naar "APIs & Services" > "Credentials"**
4. **Klik op "Create Credentials" > "OAuth 2.0 Client IDs"**

### 2.2 OAuth Client Configuration

1. **Application type**: Web application
2. **Name**: Zynlo Helpdesk (of een andere naam)
3. **Authorized JavaScript origins**:
   - `http://localhost:3000` (voor development)
   - `https://jouw-domain.vercel.app` (voor productie)
4. **Authorized redirect URIs**:
   - `http://localhost:3000/auth/callback` (voor development)
   - `https://jouw-domain.vercel.app/auth/callback` (voor productie)
   - `https://nkrytssezaefinbjgwnq.supabase.co/auth/v1/callback` (Supabase callback)

### 2.3 Credentials ophalen

1. **Klik "Create"**
2. **Kopieer de Client ID en Client Secret**
3. **Voeg deze toe aan je `.env.local` bestand**

## 🔄 Stap 3: Supabase OAuth Setup

### 3.1 Supabase Dashboard

1. **Ga naar je Supabase project**: https://supabase.com/dashboard/project/nkrytssezaefinbjgwnq
2. **Navigeer naar "Authentication" > "Providers"**
3. **Zoek "Google" en klik erop**

### 3.2 Google Provider Configuration

1. **Enable Google provider**: Zet de toggle aan
2. **Client ID**: Voer je Google Client ID in
3. **Client Secret**: Voer je Google Client Secret in
4. **Redirect URL**: `https://nkrytssezaefinbjgwnq.supabase.co/auth/v1/callback`
5. **Klik "Save"**

## 🚀 Stap 4: Local Development Setup

### 4.1 Environment Variables voor Supabase CLI

Als je lokale Supabase gebruikt, voeg ook de environment variables toe aan je shell:

**Windows (PowerShell):**

```powershell
$env:GOOGLE_CLIENT_ID="your-google-client-id"
$env:GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

**macOS/Linux (Bash):**

```bash
export GOOGLE_CLIENT_ID="your-google-client-id"
export GOOGLE_CLIENT_SECRET="your-google-client-secret"
```

### 4.2 Restart Services

1. **Stop je development server** (Ctrl+C)
2. **Restart Supabase** (als je lokaal draait):
   ```bash
   supabase stop
   supabase start
   ```
3. **Start je development server weer**:
   ```bash
   pnpm dev
   ```

## ✅ Stap 5: Testen

1. **Ga naar**: http://localhost:3000/login
2. **Klik op "Google" knop**
3. **Je wordt doorgestuurd naar Google voor authenticatie**
4. **Na goedkeuring kom je terug op de app** en ben je ingelogd

## 🐛 Troubleshooting

### Veelvoorkomende problemen:

1. **"OAuth client not found"**:

   - Controleer of je Client ID correct is
   - Zorg dat redirect URIs kloppen

2. **"redirect_uri_mismatch"**:

   - Controleer je redirect URIs in Google Cloud Console
   - Zorg dat ze exact overeenkomen

3. **"Provider not enabled"**:

   - Controleer Supabase dashboard
   - Zorg dat Google provider is ingeschakeld

4. **Development niet werkend**:
   - Restart je development server
   - Controleer `.env.local` bestand
   - Check browser console voor errors

## 🔐 Microsoft OAuth (Optioneel)

Voor Microsoft login:

1. **Ga naar Azure Portal**: https://portal.azure.com/
2. **Navigeer naar "Azure Active Directory" > "App registrations"**
3. **Maak een nieuwe app registration**
4. **Kopieer Application (client) ID en Client Secret**
5. **Voeg toe aan Supabase dashboard onder "Azure" provider**

## 📝 Notes

- **Development URLs** gebruiken `http://localhost:3000`
- **Production URLs** gebruiken je echte domain
- **Supabase callback URL** is altijd: `https://nkrytssezaefinbjgwnq.supabase.co/auth/v1/callback`
- **Test eerst in development** voordat je naar productie gaat
