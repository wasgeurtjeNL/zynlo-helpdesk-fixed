# 🔄 Automatische Gmail Sync - Complete Setup

Dit document beschrijft het **volledig geautomatiseerde Gmail sync systeem** dat elke minuut draait zonder handmatige interventie.

## 🏗️ Systeem Architectuur

Het Gmail sync systeem gebruikt een **redundante, multi-layer approach** voor maximale betrouwbaarheid:

```
📅 Database Cron Job (pg_cron)          📅 Vercel Cron Job
        ↓ (elke minuut)                         ↓ (elke minuut)
📊 System Logs Table              →     🔗 Internal Trigger API
        ↓                                       ↓ (controleert logs)
⚡ Edge Function Call                    ⚡ Gmail Sync Edge Function
        ↓                                       ↓
📧 Gmail API → 🎫 Tickets               📧 Gmail API → 🎫 Tickets
```

## 📁 Bestanden & Componenten

### **1. Database Layer**

- `supabase/migrations/20250616000000_add_gmail_sync_cron.sql` - Database cron job & system_logs
- `public.trigger_gmail_sync()` - PostgreSQL functie die elke minuut wordt aangeroepen
- `public.system_logs` - Tracking van alle cron job executions

### **2. Edge Function**

- `supabase/functions/gmail-sync/index.ts` - Gmail sync logica
- Deployed naar: `https://[project-id].supabase.co/functions/v1/gmail-sync`

### **3. Internal Trigger System**

- `apps/dashboard/app/api/internal/cron-trigger/route.ts` - Trigger handler
- Monitort `system_logs` en roept Edge Function aan

### **4. Vercel Configuration**

- `apps/dashboard/vercel.json` - Cron job configuratie
- Roept elke minuut `/api/internal/cron-trigger` aan

## ⚙️ Environment Variables

### **Supabase Edge Function Secrets**

Via Supabase Dashboard → Edge Functions → gmail-sync → Settings:

```bash
SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
GOOGLE_CLIENT_ID=[your-google-client-id]
GOOGLE_CLIENT_SECRET=[your-google-client-secret]
```

### **Next.js App (Vercel)**

```bash
NEXT_PUBLIC_SUPABASE_URL=https://[project-id].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[service-role-key]
```

## 🚀 Deployment Checklist

### **1. Edge Function**

```bash
npx supabase functions deploy gmail-sync
```

### **2. Database Migration**

```bash
npx supabase db push
# OF via MCP: apply_migration met add_gmail_sync_cron
```

### **3. Vercel Deployment**

```bash
vercel --prod
```

### **4. Environment Variables**

- ✅ Supabase Edge Function secrets configured
- ✅ Vercel environment variables set
- ✅ Google OAuth credentials valid

## 📊 Monitoring & Logging

### **Database Logs**

```sql
-- Bekijk recente cron job logs
SELECT * FROM public.system_logs
WHERE message LIKE '%Gmail sync%'
ORDER BY created_at DESC
LIMIT 10;

-- Check cron job status
SELECT * FROM cron.job
WHERE jobname = 'gmail-sync-every-minute';
```

### **Edge Function Logs**

Via Supabase Dashboard → Edge Functions → gmail-sync → Logs

### **Vercel Function Logs**

Via Vercel Dashboard → Functions → `/api/internal/cron-trigger`

### **Performance Metrics**

```sql
-- Gmail sync success rate (last 24h)
SELECT
  level,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM created_at - LAG(created_at) OVER (ORDER BY created_at))) as avg_interval_seconds
FROM public.system_logs
WHERE message LIKE '%Gmail sync%'
  AND created_at > NOW() - INTERVAL '24 hours'
GROUP BY level;
```

## 🔧 Troubleshooting

### **Cron Job Niet Actief**

```sql
-- Check of pg_cron extensie is enabled
SELECT * FROM pg_extension WHERE extname = 'pg_cron';

-- Restart cron job
SELECT cron.unschedule('gmail-sync-every-minute');
SELECT cron.schedule('gmail-sync-every-minute', '* * * * *', 'SELECT public.trigger_gmail_sync();');
```

### **Edge Function Fails**

1. Check environment variables in Supabase Dashboard
2. Verify Google OAuth credentials
3. Check Gmail channel tokens in database

### **No Tickets Created**

1. Verify Gmail channel is `is_active = true`
2. Check OAuth tokens are not expired
3. Verify email filters (might be going to spam)

### **Manual Testing**

```bash
# Test database cron function
curl -X POST https://[project-id].supabase.co/rest/v1/rpc/trigger_gmail_sync \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json"

# Test Edge Function directly
curl -X POST https://[project-id].supabase.co/functions/v1/gmail-sync \
  -H "Authorization: Bearer [service-role-key]" \
  -H "Content-Type: application/json" \
  -d '{"trigger": "manual_test"}'

# Test internal trigger
curl -X GET https://[your-domain]/api/internal/cron-trigger
```

## 📈 Performance & Scaling

### **Current Setup**

- **Frequency**: Elke minuut (60 secunden)
- **Average Delay**: ~30 seconden (emails → tickets)
- **Max Processing**: 50 emails per sync
- **Timeout**: 30 seconden per function call

### **Optimalisatie Tips**

1. **Increase Frequency**: Verander cron naar `*/30 * * * * *` (elke 30 sec)
2. **Batch Processing**: Verhoog `maxResults` in Gmail API calls
3. **Parallel Channels**: Process multiple Gmail accounts simultaneously
4. **Smart Filtering**: Use Gmail search operators voor betere filtering

## 🔄 Workflow Overzicht

### **Elke Minuut:**

1. **00:00** - Database cron job triggered → log entry
2. **00:01** - Vercel cron job roept internal trigger aan
3. **00:02** - Internal trigger detecteert nieuwe log entry
4. **00:03** - Edge Function wordt aangeroepen
5. **00:04** - Gmail API wordt gecontroleerd voor nieuwe emails
6. **00:05** - Nieuwe emails worden geconverteerd naar tickets
7. **00:06** - Success/error wordt gelogd

### **Redundancy:**

- Als database cron faalt → Vercel cron blijft draaien
- Als Vercel cron faalt → Database cron blijft loggen
- Als Edge Function faalt → Error wordt gelogd voor debugging
- Als Gmail API faalt → Retry logic in Edge Function

## ✅ Success Criteria

Het systeem werkt correct als:

1. **Database cron job** logt elke minuut
2. **Edge Function** wordt succesvol aangeroepen
3. **Nieuwe emails** worden binnen 1-2 minuten omgezet naar tickets
4. **Error rate** < 5% in system_logs
5. **OAuth tokens** blijven geldig en worden automatisch gerefreshed

---

**💡 Tip:** Monitor de `public.system_logs` tabel regelmatig om de system health te controleren. Een gezond systeem toont consistent `level: 'info'` logs elke minuut.
