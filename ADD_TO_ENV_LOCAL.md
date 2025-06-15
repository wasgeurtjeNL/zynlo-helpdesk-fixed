# Voeg deze regels toe aan je .env.local file:

```env
# Google OAuth (voor api-server compatibility)
GOOGLE_CLIENT_ID=424651970450-h3ddd8dc0o36jb00a6r9qc4hg0n9u45f.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
```

## Waarom?
- De **dashboard app** gebruikt `GMAIL_CLIENT_ID` en `GMAIL_CLIENT_SECRET`
- De **api-server** gebruikt `GOOGLE_CLIENT_ID` en `GOOGLE_CLIENT_SECRET`
- Door beide toe te voegen werken beide apps

## Stappen:
1. Open `.env.local` in de root directory
2. Voeg de bovenstaande regels toe (onderaan is prima)
3. Sla het bestand op
4. **Kopieer het opnieuw naar api-server:**
   ```bash
   copy .env.local apps\api-server\.env.local
   ```
5. Herstart de server met `pnpm dev` 