# 🔧 Email Sync Probleem Oplossen

## Het Probleem
De email sync mislukt omdat de API server niet correct is geconfigureerd met de benodigde environment variables.

## Oplossing Stappen

### Stap 1: Maak een `.env` bestand voor de API server

Maak een nieuw bestand: `apps/api-server/.env` met de volgende inhoud:

```env
# Server Configuration
PORT=3001
API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000

# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Google OAuth Configuration
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxx
```

### Stap 2: Vind je Supabase Credentials

1. Ga naar [Supabase Dashboard](https://app.supabase.com)
2. Selecteer je project
3. Ga naar **Settings** → **API**
4. Kopieer:
   - **Project URL** → `SUPABASE_URL`
   - **service_role key** (onder Project API keys) → `SUPABASE_SERVICE_ROLE_KEY`

### Stap 3: Google OAuth Credentials (Optioneel voor nieuwe kanalen)

Als je nog geen Gmail kanaal hebt gekoppeld, sla dit over.

Voor nieuwe Gmail kanalen:
1. Ga naar [Google Cloud Console](https://console.cloud.google.com)
2. Selecteer je project
3. Ga naar **APIs & Services** → **Credentials**
4. Kopieer je OAuth 2.0 Client ID en Secret

### Stap 4: Herstart de API Server

```bash
# Stop de huidige server (Ctrl+C)
# Dan:
cd apps/api-server
pnpm dev
```

### Stap 5: Test de Sync

1. Ga naar http://localhost:3000/kanalen/email
2. Klik op de "Sync" knop (🔄)
3. Je zou nu "X nieuwe emails gevonden" moeten zien

## Alternatieve Test Methode

Als de sync nog steeds niet werkt, gebruik dan het test script:

1. Pas `scripts/test-email.ps1` aan met je Supabase credentials
2. Run: `.\scripts\test-email.ps1`

Dit simuleert een inkomende email zonder de Gmail API.

## Veelvoorkomende Fouten

### "Channel not found"
- Check of je Gmail kanaal actief is (groene status in dashboard)
- Zorg dat het kanaal correct is opgeslagen in de database

### "Invalid credentials"
- Controleer of de OAuth tokens niet zijn verlopen
- Probeer het Gmail account opnieuw te koppelen

### "SUPABASE_URL is not defined"
- Je bent het `.env` bestand vergeten
- Of de API server is niet herstart na het toevoegen van het bestand

## Debug Tips

1. **Check API Server Logs**
   - Kijk in de terminal waar `pnpm dev` draait
   - Zoek naar error messages

2. **Check Supabase Logs**
   - Ga naar Supabase Dashboard → Logs → Edge Functions
   - Filter op `process-email` function

3. **Verify Channel in Database**
   ```sql
   SELECT * FROM channels 
   WHERE type = 'email' 
   AND provider = 'gmail';
   ```

## Hulp Nodig?

Als het nog steeds niet werkt:
1. Check of alle services draaien:
   - Dashboard: http://localhost:3000
   - API Server: http://localhost:3001
2. Controleer de browser console voor errors
3. Kijk in de Supabase logs voor meer details 