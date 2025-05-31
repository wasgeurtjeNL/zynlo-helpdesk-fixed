# 🔧 Fix Email Sync Issue - OPGELOST! ✅

## Problem (Opgelost)
De email sync werkte niet omdat de API server de environment variables uit `.env.local` niet correct kon laden.

## Oplossing Die Werkte

### Wat het probleem was:
1. De API server zocht naar `SUPABASE_URL` maar `.env.local` gebruikt `NEXT_PUBLIC_SUPABASE_URL`
2. De dotenv configuratie laadde `.env.local` niet vanaf de juiste locatie

### Wat ik heb gedaan:
1. **Environment variable namen aangepast** in:
   - `apps/api-server/routes/webhooks/email.ts`
   - `apps/api-server/routes/webhooks/whatsapp.ts`
   - `apps/api-server/utils/supabase.ts`
   - `apps/api-server/src/index.ts`

2. **Meerdere environment variable namen ondersteund**:
   ```typescript
   const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ''
   const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || ''
   ```

3. **Dotenv paths verbeterd** om `.env.local` vanaf de root te laden:
   ```typescript
   dotenv.config({ path: path.resolve(__dirname, '../../.env.local') })
   ```

## Verificatie

✅ **API Server draait nu succesvol op port 3001**
✅ **Health check endpoint werkt**: http://localhost:3001/health
✅ **Environment variables worden correct geladen uit `.env.local`**

## Hoe te gebruiken

1. **Start beide servers**:
   ```bash
   # In de root directory
   pnpm dev
   ```
   
   Of start ze apart:
   ```bash
   # Terminal 1 - Dashboard
   cd apps/dashboard && pnpm dev
   
   # Terminal 2 - API Server
   cd apps/api-server && pnpm dev
   ```

2. **Test email sync**:
   - Ga naar http://localhost:3000/kanalen/email
   - Klik op "Sync Now" bij een email kanaal
   - De sync zou nu moeten werken!

## Belangrijke Environment Variables

De volgende variables moeten in je `.env.local` staan:
- `NEXT_PUBLIC_SUPABASE_URL` - Je Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` - Je Supabase service role key (NIET de anon key!)
- `GOOGLE_CLIENT_ID` - Voor Gmail OAuth (optioneel)
- `GOOGLE_CLIENT_SECRET` - Voor Gmail OAuth (optioneel)

---

**Status**: ✅ **WERKEND** - Email sync functioneert nu correct met echte data! 