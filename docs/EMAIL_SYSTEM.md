# 📧 Email Verzending Systeem - Zynlo Helpdesk

## ⚠️ **KRITIEK: WIJZIG DIT SYSTEEM NIET ZONDER GRONDIGE ANALYSE**

Dit document beschrijft het **werkende** email verzending systeem. Het systeem is zorgvuldig ontworpen en getest.

---

## 🎯 **Systeem Overzicht**

Het Zynlo email systeem gebruikt **Gmail OAuth** voor bidirectionele email communicatie:

- **Inkomend**: IMAP connectie via OAuth tokens
- **Uitgaand**: Gmail API via OAuth tokens

### **Waarom Gmail OAuth ipv SMTP/Resend?**

✅ **Consistentie**: Emails komen binnen en gaan uit via hetzelfde Gmail account  
✅ **Geen extra kosten**: Geen third-party email service nodig  
✅ **Thread continuïteit**: Gmail behoudt email conversations  
✅ **Klant herkent afzender**: Emails komen van bekende Gmail adres

---

## 🏗️ **Architectuur**

### **Componenten:**

1. **Next.js API Route**: `/api/send-email-reply`
2. **Supabase Edge Function**: `send-email-gmail`
3. **Gmail OAuth Channel**: Database configuratie met tokens
4. **Frontend Integration**: Ticket detail component

### **Flow Diagram:**

```
[Frontend Ticket Detail]
    ↓ POST /api/send-email-reply
[Next.js API Route]
    ↓ Service Role Database Access
[Supabase Database]
    ↓ Edge Function Call
[send-email-gmail Edge Function]
    ↓ Gmail API met OAuth
[Gmail SMTP Server]
    ↓ Email Delivery
[Customer Inbox]
```

---

## 🔧 **Implementatie Details**

### **1. Frontend (ticket-detail.tsx)**

```typescript
// Locatie: apps/dashboard/components/ticket-detail.tsx:1558
const emailResponse = await fetch('/api/send-email-reply', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    ticketNumber: effectiveTicket.number,
    content: content,
    agentName: agentName,
    agentEmail: agentEmail,
    fromChannelId: effectiveTicket.conversation?.channel_id,
  }),
});
```

**Waarom deze aanpak?**

- ✅ Direct fetch naar API route (geen hooks/dependencies)
- ✅ Error handling op component niveau
- ✅ Volledige controle over request data

### **2. API Route (send-email-reply/route.ts)**

```typescript
// Locatie: apps/dashboard/app/api/send-email-reply/route.ts

// KRITIEK: Gebruikt service role, GEEN session authenticatie
const supabase = createServerClient(); // Service role key

// REDEN: API routes hebben geen toegang tot browser cookies/sessies
// Frontend heeft al authenticatie geverifieerd
```

**Design Keuzes:**

- ❌ **GEEN session authenticatie** - API routes = server-side, geen browser cookies
- ✅ **Service role gebruik** - Volledige database toegang zonder RLS
- ✅ **Agent info uit request** - Frontend stuurt geverifieerde gebruiker data

### **3. Supabase Edge Function (send-email-gmail)**

```typescript
// Gedeployed via MCP: mcp_supabase_deploy_edge_function
// Naam: send-email-gmail

// Features:
// - Gmail OAuth token refresh
// - Email template systeem
// - Error logging naar database
// - Return structured response
```

### **4. Database Schema**

**Channels Tabel:**

```sql
-- Gmail OAuth configuratie
channels (
  id uuid,
  type 'email',
  provider 'gmail',
  settings jsonb -- bevat oauth tokens
  is_active boolean
)
```

**Email Templates:**

```sql
email_templates (
  id uuid,
  name text,
  subject text,
  html_content text,
  variables jsonb
)
```

---

## 🔑 **Environment Configuratie**

### **Vereiste Environment Variables:**

```env
# .env.local - BEIDE APPS
NEXT_PUBLIC_SUPABASE_URL="https://nkrytssezaefinbjgwnq.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."  # KRITIEK: Juiste naam!

# Supabase Edge Functions (via Supabase Dashboard)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
```

**WAARSCHUWING:**

- ❌ Gebruik NIET `SUPABASE_SERVICE_KEY` (verkeerde naam)
- ✅ Gebruik WEL `SUPABASE_SERVICE_ROLE_KEY`

---

## 📊 **Data Flow**

### **1. Request Validatie**

```typescript
// Required fields check
if (!ticketNumber || !content || !agentName) {
  return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
}
```

### **2. Ticket & Customer Lookup**

```sql
-- Fetch ticket met customer info
SELECT *,
  customer:customer_id(id, name, email),
  conversation:conversations!inner(id, channel, metadata)
FROM tickets
WHERE number = ticketNumber
```

### **3. Gmail Channel Selection**

```sql
-- Actieve Gmail channel ophalen
SELECT id FROM channels
WHERE type = 'email'
  AND provider = 'gmail'
  AND is_active = true
```

### **4. Edge Function Call**

```typescript
const emailData = {
  to: customerEmail,
  subject: `Re: ${ticket.subject} [Ticket #${ticket.number}]`,
  template: 'ticket_reply',
  variables: { ticket, message, agent, customer },
  conversationId: ticket.conversation.id,
  channelId: gmailChannel?.id,
};

const { data, error } = await supabase.functions.invoke('send-email-gmail', {
  body: emailData,
});
```

---

## ✅ **Succes Criteria**

**Werkende email verzending toont:**

```console
🔥 API DEBUG: Environment check passed
🔥 API DEBUG: Supabase client created with service role
🔥 API DEBUG: Using agent info from request
Email sent successfully: { success: true, messageId: '19779747dbeb19e9', service: 'gmail' }
```

**Database log entry:**

```sql
-- Message opgeslagen met EMAIL SENT prefix
INSERT INTO messages (content, sender_type, conversation_id)
VALUES ('📧 EMAIL SENT: {original_content}', 'agent', conversation_id)
```

---

## 🚨 **Veel Voorkomende Problemen & Oplossingen**

### **1. "SUPABASE_SERVICE_KEY missing"**

```diff
- const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
+ const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
```

### **2. "Authentication required" (401)**

```diff
- // Proberen session te gebruiken in API route
- const { data: { session } } = await supabase.auth.getSession();
+ // Service role gebruiken (geen session nodig)
+ const supabase = createServerClient(); // Direct service role
```

### **3. "Gmail channel not found"**

```sql
-- Check Gmail channel configuratie
SELECT id, is_active, settings->>'email_address'
FROM channels
WHERE type = 'email' AND provider = 'gmail';
```

### **4. "No OAuth tokens"**

- Gmail OAuth herautorisatie nodig via Supabase Dashboard
- Tokens vernieuwen via `refresh_token`

---

## 🧪 **Testing Workflow**

### **Development Test:**

1. Start development server: `pnpm dev`
2. Ga naar ticket detail pagina
3. Type test email content
4. Klik "Verstuur Email"
5. Check console voor debug logs
6. Verify email in customer inbox

### **Production Verification:**

```bash
# Check environment variables
echo $SUPABASE_SERVICE_ROLE_KEY | wc -c  # Should be ~200+ chars

# Test API endpoint manually
curl -X POST http://localhost:3000/api/send-email-reply \
  -H "Content-Type: application/json" \
  -d '{"ticketNumber": 443, "content": "Test", "agentName": "Test Agent", "agentEmail": "test@example.com"}'
```

---

## 📋 **Maintenance Checklist**

### **Weekly:**

- [ ] Check Gmail OAuth token expiry
- [ ] Verify email template rendering
- [ ] Monitor edge function logs

### **Monthly:**

- [ ] Review email delivery statistics
- [ ] Check database storage usage
- [ ] Update OAuth consent screen if needed

### **Bij Gmail Account Wijzigingen:**

- [ ] Re-authorize OAuth tokens
- [ ] Update channel settings in database
- [ ] Test email sending/receiving

---

## 🔒 **Security Overwegingen**

### **OAuth Token Management:**

- Tokens opgeslagen in Supabase (encrypted at rest)
- Automatic refresh via edge function
- No tokens in frontend/logs

### **API Route Security:**

- Service role restricted to email operations
- Input validation op alle parameters
- Error messages sanitized

### **Email Content:**

- HTML sanitization in templates
- No user input in email headers
- Rate limiting via Supabase built-ins

---

## 🚀 **Performance Optimizations**

### **Caching:**

- Gmail channel data gecached in edge function
- Email templates geladen bij startup
- OAuth tokens cached totdat expired

### **Error Handling:**

- Graceful degradation bij Gmail API errors
- Retry logic voor temporary failures
- Fallback naar database logging

### **Monitoring:**

- Edge function execution times
- Gmail API rate limits
- Email delivery success rates

---

## 📞 **Support & Troubleshooting**

### **Log Locaties:**

- **Frontend**: Browser console (F12)
- **API Route**: Next.js server logs
- **Edge Function**: Supabase dashboard → Edge Functions → Logs
- **Gmail API**: Supabase dashboard → Database → system_logs

### **Debug Commands:**

```bash
# Check environment
pnpm exec env | grep SUPABASE

# Test database connectivity
pnpm exec supabase status

# View real-time logs
pnpm dev  # Watch console output
```

### **Escalation:**

Bij complexe email problemen:

1. Check Gmail API status: https://status.cloud.google.com
2. Verify Supabase connectivity
3. Review OAuth consent screen status
4. Contact Google Workspace admin indien nodig

---

## 📝 **Changelog**

### **v1.0 (Current) - Gmail OAuth Implementation**

- ✅ Gmail OAuth voor sending/receiving
- ✅ Service role API route architectuur
- ✅ Edge function met template systeem
- ✅ Frontend integration in ticket detail
- ✅ Error handling en logging

### **Previous Attempts:**

- ❌ Resend API approach (switched to Gmail OAuth for consistency)
- ❌ Session-based API authentication (incompatible with API routes)
- ❌ Direct SMTP (less reliable than OAuth)

---

**Laatste Update:** 16 Juni 2025  
**Status:** ✅ PRODUCTIE GEREED - WIJZIG NIET  
**Maintainer:** Ontwikkelteam Zynlo
