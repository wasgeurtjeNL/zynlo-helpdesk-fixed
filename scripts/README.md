# Email Testing Scripts

Deze scripts helpen je om de email integratie te testen zonder echte emails te sturen.

## 🚀 Quick Start

### Stap 1: Vind je Supabase credentials

1. Ga naar je Supabase dashboard
2. Klik op "Settings" → "API"
3. Kopieer:
   - **Project URL** (bijv. `https://xxxxx.supabase.co`)
   - **Service Role Key** (onder "Project API keys")

### Stap 2: Vind je gekoppelde Gmail adres

1. Open je Zynlo dashboard: http://localhost:3000
2. Ga naar "Kanalen" → "Email"
3. Noteer het email adres van je gekoppelde Gmail account

### Stap 3: Kies je test methode

## Methode A: PowerShell (Windows)

1. Open het bestand `scripts/test-email.ps1`
2. Vervang deze waarden:
   ```powershell
   $SUPABASE_URL = "YOUR_SUPABASE_URL"  # Jouw Supabase URL
   $SUPABASE_SERVICE_KEY = "YOUR_SERVICE_KEY"  # Jouw service key
   $TO_EMAIL = "support@yourcompany.com"  # Jouw gekoppelde Gmail adres
   ```

3. Run het script:
   ```powershell
   cd scripts
   .\test-email.ps1
   ```

## Methode B: Node.js

1. Installeer axios:
   ```bash
   cd scripts
   npm install axios
   ```

2. Open het bestand `scripts/test-email.js`
3. Vervang deze waarden:
   ```javascript
   const SUPABASE_URL = 'YOUR_SUPABASE_URL';
   const SUPABASE_SERVICE_KEY = 'YOUR_SERVICE_KEY';
   // En update de 'to' field met je Gmail adres
   ```

4. Run het script:
   ```bash
   node test-email.js
   ```

## Methode C: Manual Sync (Echte emails)

1. Stuur een echte email naar je gekoppelde Gmail adres
2. Ga naar http://localhost:3000/kanalen/email
3. Klik op de "Sync" knop (🔄) naast je Gmail account
4. De email wordt opgehaald en omgezet naar een ticket

## 🎯 Wat gebeurt er?

Als het script succesvol is:
1. Er wordt een nieuw ticket aangemaakt
2. Je ziet het ticket ID in de console
3. Het ticket verschijnt in je dashboard inbox

## 🐛 Troubleshooting

### "No active email channel found"
- Zorg dat je Gmail account actief is (groene status)
- Check of het email adres in het script overeenkomt met je gekoppelde account

### "Authentication failed"
- Controleer je Supabase service key
- Zorg dat je de service key gebruikt, niet de anon key

### "Failed to send test email"
- Check of je Supabase Edge Functions zijn gedeployed
- Controleer de Supabase logs voor meer details

## 📝 Test Variaties

Je kunt het script aanpassen om verschillende scenarios te testen:

1. **Reply op bestaand ticket:**
   ```javascript
   subject: 'Re: [Ticket #123] Original subject'
   ```

2. **Email met attachments:**
   ```javascript
   attachments: [{
     filename: 'screenshot.png',
     contentType: 'image/png',
     size: 1024
   }]
   ```

3. **Verschillende prioriteiten:**
   ```javascript
   subject: 'URGENT: Server is down!'
   ```

## 🔄 Automatische Sync

Voor productie wordt email automatisch gesynchroniseerd:
- Interval: Elke 5 minuten
- Manual sync: Via de "Sync" knop in het dashboard
- Webhook: Real-time via Gmail Push Notifications (toekomstige feature) 