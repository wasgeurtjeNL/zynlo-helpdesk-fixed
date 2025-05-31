# Email Integration Setup Guide

Deze guide helpt je bij het opzetten van de Gmail integratie voor het Zynlo Helpdesk systeem.

## Overzicht

De email integratie maakt het mogelijk om:
- Emails automatisch om te zetten naar tickets
- Antwoorden op tickets als email te versturen
- Email threads te koppelen aan bestaande tickets
- Meerdere email accounts te beheren

## Architectuur

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
     - `https://jouw-domein.com` (production)
   - **Authorized redirect URIs**:
     - `http://localhost:3001/auth/gmail/callback` (development)
     - `https://api.jouw-domein.com/auth/gmail/callback` (production)
5. Kopieer de Client ID en Client Secret

## Stap 3: Environment Variables

Voeg de volgende variabelen toe aan je `.env.local` bestanden:

### Dashboard (`apps/dashboard/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### API Server (`apps/api-server/.env`):
```env
# Server
PORT=3001
API_URL=http://localhost:3001
DASHBOARD_URL=http://localhost:3000

# Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

## Stap 4: API Server Starten

1. Installeer dependencies:
```bash
cd apps/api-server
pnpm install
```

2. Start de server:
```bash
pnpm dev
```

De API server draait nu op `http://localhost:3001`

## Stap 5: Email Kanaal Toevoegen

1. Ga in de dashboard naar "Kanalen" > "Email"
2. Klik op "Email toevoegen"
3. Geef het kanaal een naam (bijv. "Support Inbox")
4. Klik op "Gmail" om de OAuth flow te starten
5. Log in met je Google account en geef toestemming
6. Je wordt teruggeleid naar de dashboard

## Hoe het werkt

### Email naar Ticket Flow

1. **Email ontvangen**: Gmail ontvangt een email
2. **Sync proces**: De API server haalt nieuwe emails op (elke 5 minuten)
3. **Webhook verwerking**: Email wordt naar Supabase Edge Function gestuurd
4. **Ticket creatie**: 
   - Nieuwe klant wordt aangemaakt (indien nodig)
   - Ticket wordt aangemaakt met eerste bericht
   - Of bericht wordt toegevoegd aan bestaand ticket (bij reply)
5. **Dashboard update**: Nieuwe ticket verschijnt in de inbox

### Reply Detection

Het systeem herkent replies op basis van:
- Email headers (`In-Reply-To`, `References`)
- Ticket nummer in subject (bijv. `[Ticket #123]`)

### Automatische Sync

- Emails worden elke 5 minuten gesynchroniseerd
- Handmatige sync mogelijk via "Sync" knop
- Laatste sync tijd wordt getoond per kanaal

## Troubleshooting

### "Authentication failed"
- Controleer of de Google OAuth credentials correct zijn
- Zorg dat de redirect URI exact overeenkomt

### Emails worden niet gesynchroniseerd
- Check of het kanaal actief is
- Controleer de API server logs
- Verifieer dat de Gmail API geactiveerd is

### Dubbele tickets
- Het systeem gebruikt message IDs om duplicaten te voorkomen
- Check de `webhook_logs` tabel voor processing errors

## Security Best Practices

1. **Service Account**: Overweeg een Google Service Account voor productie
2. **Scope beperking**: Gebruik alleen benodigde Gmail scopes
3. **Token opslag**: OAuth tokens worden encrypted opgeslagen
4. **Rate limiting**: Implementeer rate limiting op sync endpoints
5. **Webhook verificatie**: Valideer webhook signatures

## Volgende stappen

- [ ] Outlook/Office 365 integratie toevoegen
- [ ] IMAP/SMTP support voor andere providers
- [ ] Email templates voor antwoorden
- [ ] Automatische categorisatie met AI
- [ ] Attachment handling verbeteren 