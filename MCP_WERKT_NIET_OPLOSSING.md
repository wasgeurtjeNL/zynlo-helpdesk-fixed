# MCP Oplossing voor Zynlo Helpdesk

## 🚨 BELANGRIJK: Beveiligingsprobleem

Je Supabase token is **publiek zichtbaar** in je Git geschiedenis:
`sbp_eac9c580ff96d79eb1e0046656792174efbe4c0d`

**Doe dit NU:**

1. Ga naar https://app.supabase.com
2. Account Settings → Access Tokens
3. Verwijder deze token
4. Maak een nieuwe aan

## ✅ Wat ik heb gedaan

1. **Supabase MCP server globaal geïnstalleerd** (omdat npx problemen had)
2. **MCP configuratie aangepast** om de globale installatie te gebruiken
3. **Je token weer verwijderd** uit het bestand

## 📋 Stappen om MCP werkend te krijgen

### 1. Nieuwe Supabase Token

1. Ga naar [Supabase Dashboard](https://app.supabase.com)
2. Klik op je account (rechtsboven)
3. Ga naar "Access Tokens"
4. Maak een nieuwe "Personal Access Token"
5. Kopieer de token

### 2. Update .cursor/mcp.json

Vervang `YOUR_NEW_SUPABASE_ACCESS_TOKEN_HERE` met je nieuwe token:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "mcp-server-supabase",
      "env": {
        "SUPABASE_ACCESS_TOKEN": "PLAK_HIER_JE_NIEUWE_TOKEN"
      }
    },
    "task-master": {
      "command": "task-master-ai",
      "args": ["mcp"],
      "env": {
        "ANTHROPIC_API_KEY": "YOUR_ANTHROPIC_API_KEY",
        "OPENAI_API_KEY": "YOUR_OPENAI_API_KEY",
        "PERPLEXITY_API_KEY": "YOUR_PERPLEXITY_API_KEY"
      }
    }
  }
}
```

### 3. Herstart Cursor

**Dit is verplicht!**

1. Sluit Cursor **volledig** af (alle vensters)
2. Open Cursor opnieuw
3. MCP servers starten automatisch

### 4. Test of MCP werkt

In Cursor:

1. Open de Command Palette (Ctrl+Shift+P)
2. Zoek naar "MCP" commands
3. Of kijk in de Output panel (View → Output → MCP)

## 🔧 Problemen oplossen

### Als het nog steeds niet werkt:

**1. Check de Output:**

- View → Output
- Selecteer "MCP" uit dropdown
- Kijk naar foutmeldingen

**2. Test manueel:**

```powershell
# Test Supabase MCP
$env:SUPABASE_ACCESS_TOKEN="je_nieuwe_token"
mcp-server-supabase

# Test Task Master
task-master-ai mcp
```

**3. Als Task Master niet werkt:**

```powershell
# Installeer globaal
npm install -g task-master-ai
```

## 📝 Belangrijke notities

1. **NOOIT** tokens in Git committen
2. `.cursor/mcp.json` staat al in `.gitignore` ✅
3. Gebruik **altijd** environment variables voor tokens
4. Roteer tokens regelmatig

## 🚀 Volgende stappen

Als MCP werkt:

1. Test een Supabase query
2. Gebruik Task Master voor project management
3. Begin met de Zynlo Helpdesk development

## ❓ Hulp nodig?

- Check Cursor MCP documentatie
- Kijk in de Output panel voor errors
- Probeer de manuele test commando's

**Let op:** De npx versie van Supabase MCP had dependency problemen met GraphQL. Daarom gebruik ik nu de globale installatie.
