# 🔄 Realtime Updates voor Inbox

## 📋 Overzicht

De inbox heeft nu realtime updates geïmplementeerd met:

- **Supabase Realtime** voor instant updates wanneer nieuwe tickets/berichten binnenkomen
- **Fallback polling** elke 30 seconden als backup
- **Visuele notificaties** wanneer nieuwe tickets binnenkomen

## 🎯 Wat is er veranderd?

1. **InboxRefreshWrapper** toegevoegd aan `InboxLayout`

   - Activeert realtime subscriptions voor tickets en messages tabellen
   - Implementeert 30-seconden polling als fallback

2. **InboxRefreshControls** in de header

   - Refresh button rechtsboven in de ticket lijst
   - Toont "Nieuwe tickets" badge bij nieuwe items

3. **Automatische UI updates**
   - Nieuwe emails verschijnen direct zonder page refresh
   - Ticket counts worden real-time bijgewerkt
   - Toast notificaties bij nieuwe tickets

## 🧪 Testen van Realtime Updates

### Stap 1: Verifieer Realtime in Database

```bash
# Voer de migration uit om realtime te activeren
npm run supabase db push

# Of via Supabase Dashboard:
# 1. Ga naar Database → Replication
# 2. Zorg dat 'tickets' en 'messages' tabellen zijn aangevinkt
```

### Stap 2: Test Realtime Connectie

```bash
# Run het test script
node scripts/test-realtime.js

# Dit zal:
# - Verbinden met Supabase
# - Subscriben op tickets en messages
# - Live updates tonen in console
```

### Stap 3: Test in Browser

1. Open de inbox pagina (/inbox/nieuw)
2. Open browser console (F12)
3. Zoek naar logs die beginnen met `[Realtime]`
4. Je zou moeten zien:
   ```
   [Realtime] Starting realtime inbox subscriptions...
   [Realtime] Ticket subscription status: SUBSCRIBED
   [Realtime] Message subscription status: SUBSCRIBED
   ```

### Stap 4: Trigger een Update

**Optie A: Via Gmail Sync**

1. Stuur een email naar het gekoppelde Gmail account
2. Wacht tot de Gmail sync het oppikt (of trigger handmatig)
3. De nieuwe ticket zou direct moeten verschijnen

**Optie B: Via Database (voor testing)**

```sql
-- Maak een test ticket
INSERT INTO tickets (subject, status, priority, channel, created_at)
VALUES ('Test Realtime Ticket', 'new', 'normal', 'email', NOW());

-- Of maak een test message voor bestaande ticket
INSERT INTO messages (ticket_id, content, sender_type, created_at)
VALUES ('<existing-ticket-id>', 'Test realtime message', 'customer', NOW());
```

## 🔍 Debugging

### Console Logs

De applicatie logt verschillende events:

- `[Realtime]` - Realtime subscription events
- `[Polling]` - Fallback polling events

### Veelvoorkomende Problemen

**1. Geen realtime updates**

- Check of tabellen zijn ingeschakeld voor replication in Supabase
- Verifieer dat je online bent
- Check browser console voor errors

**2. Polling werkt niet**

- Refresh button zou elke 30 seconden moeten draaien
- Check of queries correct worden geïnvalideerd

**3. Notifications verschijnen niet**

- Browser notificaties moeten toegestaan zijn
- Toast notificaties verschijnen rechtsonder

## 🚀 Performance

- Realtime updates: < 100ms latency
- Polling interval: 30 seconden (configureerbaar)
- Query invalidation is geoptimaliseerd voor specifieke keys

## 🔧 Configuratie

In `InboxLayout`:

```tsx
<InboxRefreshWrapper
  enableRealtime={true}      // Schakel realtime in/uit
  refreshInterval={30000}    // Polling interval in ms
>
```

## 📝 Toekomstige Verbeteringen

- [ ] Configureerbare polling intervals per gebruiker
- [ ] Desktop notificaties voor nieuwe tickets
- [ ] Sound alerts optie
- [ ] Realtime presence (zie wie online is)
- [ ] Optimistic updates voor snellere UX
