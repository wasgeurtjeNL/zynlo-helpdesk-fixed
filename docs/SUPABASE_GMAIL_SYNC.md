# Gmail Sync met Supabase Edge Functions

Deze oplossing gebruikt **Supabase Edge Functions** en **database cron jobs** voor automatische Gmail synchronisatie. Dit is betrouwbaarder dan Vercel cron jobs omdat het volledig binnen de Supabase infrastructuur draait.

## 🏗️ Architectuur

```
Database Cron Job (elke minuut)
    ↓
PostgreSQL trigger_gmail_sync() functie
    ↓
HTTP POST naar Supabase Edge Function
    ↓
Gmail API calls + Database updates
```

## 📁 Bestanden

- `supabase/functions/gmail-sync/index.ts` - Edge Function voor Gmail sync
- `supabase/migrations/20241222000000_add_gmail_sync_cron.sql` - Database migration met cron job
- `apps/dashboard/app/api/sync/gmail-manual/route.ts` - Handmatige sync API route

## ⚙️ Setup

### 1. Environment Variables

Voeg deze toe aan je Supabase project settings:

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. Deploy Edge Function

```bash
# Deploy de Gmail sync Edge Function
npx supabase functions deploy gmail-sync

# Of als je de Supabase CLI globaal hebt geïnstalleerd:
supabase functions deploy gmail-sync
```

### 3. Run Database Migration

```bash
# Apply de migration die de cron job instelt
npx supabase db push

# Of:
supabase db push
```

### 4. Verificatie

Na deployment kun je controleren of alles werkt:

```sql
-- Check of de cron job is aangemaakt
SELECT * FROM cron.job WHERE jobname = 'gmail-sync-job';

-- Check system logs
SELECT * FROM public.system_logs ORDER BY created_at DESC LIMIT 10;

-- Test handmatige sync
SELECT manual_gmail_sync();
```

## 🔄 Hoe het werkt

### Automatische Sync

1. **Database Cron Job** draait elke minuut
2. Roept `trigger_gmail_sync()` PostgreSQL functie aan
3. Deze functie maakt HTTP POST naar Edge Function
4. Edge Function:
   - Haalt alle actieve Gmail channels op
   - Verwerkt OAuth token refresh indien nodig
   - Zoekt nieuwe emails via Gmail API
   - Maakt tickets/conversations/messages aan
   - Update `last_sync` timestamp

### Handmatige Sync

Via de API route: `POST /api/sync/gmail-manual`

```bash
curl -X POST http://localhost:3000/api/sync/gmail-manual
```

## 📊 Monitoring

### System Logs

De `system_logs` tabel bevat alle sync activiteiten:

```sql
-- Recente sync logs
SELECT level, message, metadata, created_at
FROM system_logs
WHERE message LIKE '%Gmail%'
ORDER BY created_at DESC;

-- Error logs
SELECT * FROM system_logs
WHERE level = 'error'
ORDER BY created_at DESC;
```

### Edge Function Logs

Check logs in Supabase Dashboard:

1. Ga naar **Edge Functions** tab
2. Klik op `gmail-sync` functie
3. Bekijk **Logs** sectie

## 🚀 Voordelen van deze oplossing

### ✅ Betrouwbaarheid

- Draait volledig binnen Supabase infrastructuur
- Geen afhankelijkheid van externe deployment platforms
- Automatische error handling en logging

### ✅ Performance

- Direct verbinding tussen database en Gmail API
- Geen extra HTTP hops via external platforms
- Efficiënte OAuth token management

### ✅ Schaalbaarheid

- Edge Functions schalen automatisch
- Database cron jobs zijn stabiel en betrouwbaar
- Geen cold start problemen

### ✅ Observability

- Uitgebreide logging in `system_logs` tabel
- Edge Function logs in Supabase Dashboard
- Easy debugging via SQL queries

## 🔧 Troubleshooting

### Cron Job werkt niet

```sql
-- Check of pg_cron extension is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Check cron job status
SELECT * FROM cron.job WHERE jobname = 'gmail-sync-job';

-- Manual trigger test
SELECT manual_gmail_sync();
```

### OAuth Problemen

```sql
-- Check channel OAuth status
SELECT
  id,
  name,
  settings->>'oauth_token' as has_token,
  settings->>'refresh_token' as has_refresh,
  last_sync
FROM channels
WHERE type = 'email' AND provider = 'gmail';
```

### Edge Function Fouten

1. Check Environment Variables in Supabase Dashboard
2. Bekijk Edge Function logs
3. Test handmatig via API route

## 📋 Maintenance

### Reguliere Checks

```sql
-- Sync frequency check (laatste 24 uur)
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as sync_count
FROM system_logs
WHERE message = 'Gmail sync triggered via cron'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY hour
ORDER BY hour DESC;

-- Error rate check
SELECT
  level,
  COUNT(*) as count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM system_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
  AND message LIKE '%Gmail%'
GROUP BY level;
```

### Cleanup Old Logs

```sql
-- Clean up logs older than 30 days
DELETE FROM system_logs
WHERE created_at < NOW() - INTERVAL '30 days';
```

## 🔄 Migration van Vercel naar Supabase

Als je van de Vercel cron job oplossing migreert:

1. **Deploy de nieuwe Edge Function**
2. **Run de database migration**
3. **Verwijder oude Vercel cron config**:
   ```bash
   # Verwijder/comment uit apps/dashboard/vercel.json:
   # "crons": [
   #   {
   #     "path": "/api/cron/gmail-sync",
   #     "schedule": "* * * * *"
   #   }
   # ]
   ```
4. **Test de nieuwe oplossing**
5. **Monitor gedurende enkele uren**

## 🎯 Performance Metrics

Deze oplossing moet de volgende performance bereiken:

- **Sync Frequency**: Elke minuut
- **Average Delay**: ~30 seconden (van email ontvangst tot ticket)
- **Reliability**: >99% success rate
- **OAuth Token Refresh**: Automatisch
- **Error Recovery**: Zelf-herstellend

## 📞 Support

Voor problemen:

1. Check `system_logs` tabel voor errors
2. Bekijk Edge Function logs in Supabase Dashboard
3. Test handmatige sync via API route
4. Controleer OAuth token status in database
