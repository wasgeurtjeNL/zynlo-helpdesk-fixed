# Fix Gmail OAuth Configuration

## Update je `.env.local` file:

**Vervang dit:**
```
# Google OAuth
GMAIL_CLIENT_ID=424651970450-h3ddd8dc0o36jb00a6r9qc4hg0n9u45f.apps.googleusercontent.com
GMAIL_CLIENT_ID=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
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Met dit:**
```
# Google OAuth (correct)
GMAIL_CLIENT_ID=424651970450-h3ddd8dc0o36jb00a6r9qc4hg0n9u45f.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=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
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

## Let op:
1. **GMAIL_CLIENT_SECRET** moet zijn (niet GMAIL_CLIENT_ID twee keer)
2. **NEXT_PUBLIC_APP_URL** moet port 3002 zijn (niet 3000) omdat je app daar draait

## Na het aanpassen:
1. Sla `.env.local` op
2. Stop de server (Ctrl+C)
3. Start opnieuw: `pnpm dev`

## Google Cloud Console Setup:
Zorg dat in je Google Cloud Console deze redirect URI is toegevoegd:
- `http://localhost:3002/api/auth/gmail/callback`

Voor productie voeg je toe:
- `https://jouw-domein.com/api/auth/gmail/callback` 