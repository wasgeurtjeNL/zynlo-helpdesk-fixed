# Gmail Sync via Vercel Cron Jobs ✅

Deze nieuwe implementatie verplaatst de Gmail sync van een aparte API server naar **Vercel Cron Jobs**, waardoor alles op één platform draait.

## 🚀 Voordelen

**Voor (API Server):**

- ❌ Aparte API server deployment nodig
- ❌ Complexe hosting setup
- ❌ Sync werkte alleen lokaal

**Na (Vercel Cron):**

- ✅ Alles draait op Vercel
- ✅ Automatische Gmail sync elke minuut
- ✅ Geen aparte servers nodig
- ✅ Werkt direct in productie

## 📋 Hoe Het Werkt

### 1. **Vercel Cron Job**

```json
{
  "crons": [
    {
      "path": "/api/cron/gmail-sync",
      "schedule": "* * * * *"
    }
  ]
}
```

### 2. **API Route**

- **Endpoint**: `/api/cron/gmail-sync`
- **Frequentie**: Elke **1 minuut**
- **Functie**: Syncroniseert alle Gmail kanalen

### 3. **Gmail Sync Service**

- Zelfde logica als API server
- Draait nu binnen Next.js
- Gebruikt Supabase voor data opslag

## ⚙️ Environment Variables

Voeg deze toe aan **Vercel Dashboard** → Settings → Environment Variables:

```bash
# Supabase (Required)
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=jouw-service-role-key

# Gmail OAuth (Required)
GOOGLE_CLIENT_ID=jouw-client-id
GOOGLE_CLIENT_SECRET=jouw-client-secret

# Cron Security (Optional)
CRON_SECRET=jouw-beveiligings-token
```

## 🔧 Setup Instructies

### Stap 1: Environment Variables

1. **Ga naar** Vercel Dashboard
2. **Selecteer** je project
3. **Ga naar** Settings → Environment Variables
4. **Voeg toe** alle variables hierboven

### Stap 2: Deploy & Test

```bash
# Push wijzigingen
git add .
git commit -m "feat: move Gmail sync to Vercel cron jobs"
git push origin main

# Vercel deployt automatisch
```

### Stap 3: Verificatie

```bash
# Test manual trigger
curl https://jouw-domain.vercel.app/api/cron/gmail-sync

# Expected response:
{
  "success": true,
  "message": "Gmail sync completed",
  "result": {
    "channels": 1,
    "processed": 5,
    "errors": 0
  }
}
```

## 📊 Performance

**Sync Frequentie:**

- **Voor**: Elke 5 minuten (via API server)
- **Na**: Elke **1 minuut** (via Vercel cron)

**Response Time:**

- **Gemiddelde delay**: 30 seconden (veel beter dan 2.5 minuten)
- **Real-time gevoel** voor gebruikers

## 🔍 Monitoring

### Vercel Function Logs

1. **Ga naar** Vercel Dashboard
2. **Selecteer** Functions tab
3. **Bekijk** logs van cron executions

### Expected Logs

```
🔄 Gmail sync API route triggered
Starting sync for 1 Gmail channels
Channel abc123 synced: 3 messages
✅ Gmail sync completed
```

## 🚨 Troubleshooting

### "Gmail sync disabled: credentials not configured"

**Oplossing:** Check environment variables in Vercel dashboard

### "Channel not found"

**Oplossing:** Verify Gmail kanaal is actief en OAuth tokens zijn geldig

### "Unauthorized" (401)

**Oplossing:**

- Als je `CRON_SECRET` gebruikt, call met: `Authorization: Bearer YOUR_SECRET`
- Of verwijder `CRON_SECRET` voor open access

### Cron Job Draait Niet

**Oplossing:**

1. Check `vercel.json` is correct geconfigureerd
2. Verify je bent op Pro plan (free heeft beperkte cron)
3. Check Vercel dashboard voor cron execution logs

## 🔒 Security

### Cron Endpoint Beveiliging

```bash
# Optioneel: beveilig cron endpoint
CRON_SECRET=jouw-secure-random-token

# Call met authorization:
curl -H "Authorization: Bearer jouw-secure-random-token" \
  https://jouw-domain.vercel.app/api/cron/gmail-sync
```

### Rate Limiting

- Vercel cron jobs hebben ingebouwde rate limiting
- Max 1 execution per minuut per endpoint

## 🎯 Expected Results

Na deze setup:

1. **Deploy** → Vercel toont nieuwe cron job in dashboard
2. **Wait 1 minute** → Eerste automatische sync
3. **Send test email** → Verschijnt binnen 1-2 minuten
4. **Check dashboard** → Nieuwe tickets zichtbaar

## 📚 Technical Details

### File Structure

```
apps/dashboard/
├── app/api/cron/gmail-sync/route.ts    # Cron endpoint
├── lib/gmail-sync.ts                   # Gmail sync service
└── vercel.json                         # Cron configuration
```

### Cron Schedule Syntax

```bash
* * * * *
│ │ │ │ └─── Day of week (0-7, 0 and 7 = Sunday)
│ │ │ └───── Month (1-12)
│ │ └─────── Day of month (1-31)
│ └───────── Hour (0-23)
└─────────── Minute (0-59)

# Voorbeelden:
"* * * * *"      # Elke minuut
"*/5 * * * *"    # Elke 5 minuten
"0 * * * *"      # Elk uur
```

## ✅ Migration Checklist

- [ ] Environment variables toegevoegd aan Vercel
- [ ] Code gepusht naar GitHub
- [ ] Vercel deployment succesvol
- [ ] Cron job verschijnt in Vercel dashboard
- [ ] Manual test van `/api/cron/gmail-sync` werkt
- [ ] Gmail kanaal OAuth tokens nog geldig
- [ ] Test email sent → ticket created binnen 2 minuten

---

**🎉 Resultaat:** Gmail sync werkt nu automatisch elke minuut via Vercel, zonder aparte API server!
