# Database Structure - Zynlo Helpdesk

## Overview
Dit document beschrijft de complete database structuur van het Zynlo Helpdesk systeem. Alle tabellen, relaties, enums en stored procedures zijn hier gedocumenteerd voor referentie tijdens development.

## Enums (Custom Types)

### ticket_status
- `new` - Nieuw ticket, nog niet bekeken
- `open` - Ticket is geopend en wordt behandeld
- `pending` - Wacht op reactie van klant
- `resolved` - Opgelost, wacht op bevestiging
- `closed` - Definitief gesloten

### ticket_priority
- `low` - Lage prioriteit
- `normal` - Normale prioriteit (default)
- `high` - Hoge prioriteit
- `urgent` - Urgente prioriteit

### channel_type
- `email` - Email kanaal
- `whatsapp` - WhatsApp Business
- `chat` - Live chat widget
- `phone` - Telefoon
- `api` - API/webhook

### sender_type
- `customer` - Klant/eindgebruiker
- `agent` - Support medewerker
- `system` - Systeem berichten

## Tables

### 1. teams
Bevat alle support teams binnen de organisatie.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Team naam |
| description | text | YES | NULL | Team beschrijving |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)

---

### 2. users
Support agents en andere gebruikers van het systeem.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | - | Primary key (Supabase Auth ID) |
| email | text | NO | - | Email adres |
| full_name | text | YES | NULL | Volledige naam |
| avatar_url | text | YES | NULL | Avatar URL |
| role | text | YES | 'agent' | Gebruikersrol |
| team_id | uuid | YES | NULL | FK naar teams |
| is_active | boolean | YES | true | Account actief |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_users_email (email)
- INDEX idx_users_team_id (team_id)

**Foreign Keys:**
- team_id → teams(id) ON DELETE SET NULL

---

### 3. customers
Klanten die tickets aanmaken.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| email | text | YES | NULL | Email adres |
| name | text | YES | NULL | Naam |
| phone | text | YES | NULL | Telefoonnummer |
| external_id | text | YES | NULL | ID in extern systeem |
| metadata | jsonb | YES | NULL | Extra klantgegevens |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX idx_customers_email (email) WHERE email IS NOT NULL
- INDEX idx_customers_external_id (external_id)

---

### 4. tickets
Hoofdtabel voor support tickets.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| number | serial | NO | - | Ticket nummer |
| subject | text | NO | - | Onderwerp |
| description | text | YES | NULL | Beschrijving |
| status | ticket_status | YES | 'new' | Status |
| priority | ticket_priority | YES | 'normal' | Prioriteit |
| customer_id | uuid | YES | NULL | FK naar customers |
| assignee_id | uuid | YES | NULL | FK naar users (agent) |
| team_id | uuid | YES | NULL | FK naar teams |
| tags | text[] | YES | NULL | Tags array |
| metadata | jsonb | YES | NULL | Extra metadata |
| resolved_at | timestamptz | YES | NULL | Oplos datum |
| closed_at | timestamptz | YES | NULL | Sluit datum |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE INDEX tickets_number_key (number)
- INDEX idx_tickets_status (status)
- INDEX idx_tickets_assignee_id (assignee_id)
- INDEX idx_tickets_customer_id (customer_id)
- INDEX idx_tickets_created_at (created_at)

**Foreign Keys:**
- customer_id → customers(id) ON DELETE SET NULL
- assignee_id → users(id) ON DELETE SET NULL
- team_id → teams(id) ON DELETE SET NULL

---

### 5. conversations
Conversatie threads binnen een ticket.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| ticket_id | uuid | YES | NULL | FK naar tickets |
| channel | channel_type | NO | - | Communicatie kanaal |
| external_id | text | YES | NULL | Externe conversatie ID |
| metadata | jsonb | YES | NULL | Kanaal-specifieke data |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_conversations_ticket_id (ticket_id)
- INDEX idx_conversations_external_id (external_id)

**Foreign Keys:**
- ticket_id → tickets(id) ON DELETE CASCADE

---

### 6. messages
Individuele berichten binnen conversaties.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| conversation_id | uuid | YES | NULL | FK naar conversations |
| content | text | NO | - | Bericht inhoud |
| sender_type | sender_type | NO | - | Type afzender |
| sender_id | text | NO | - | ID van afzender |
| sender_name | text | YES | NULL | Naam van afzender |
| is_internal | boolean | YES | false | Interne notitie |
| attachments | jsonb[] | YES | NULL | Bijlagen array |
| metadata | jsonb | YES | NULL | Extra metadata |
| created_at | timestamptz | YES | now() | Verzend datum |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_messages_conversation_id (conversation_id)
- INDEX idx_messages_created_at (created_at)

**Foreign Keys:**
- conversation_id → conversations(id) ON DELETE CASCADE

---

### 7. webhook_logs
Logging van inkomende webhooks.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| channel | text | NO | - | Webhook kanaal |
| payload | jsonb | NO | - | Request payload |
| headers | jsonb | YES | NULL | Request headers |
| processed | boolean | YES | false | Verwerkt status |
| error | text | YES | NULL | Error message |
| created_at | timestamptz | YES | now() | Ontvangst datum |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_webhook_logs_channel (channel)
- INDEX idx_webhook_logs_created_at (created_at)

---

### 8. channels
Communicatie kanalen configuratie.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Kanaal naam |
| type | channel_type | NO | - | Type kanaal |
| icon | text | YES | NULL | Icon identifier |
| color | text | YES | NULL | Kleur code |
| is_active | boolean | YES | true | Kanaal actief |
| settings | jsonb | YES | {} | Kanaal instellingen |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_channels_type (type)
- INDEX idx_channels_is_active (is_active)

---

### 9. labels
Labels/tags voor ticket categorisatie.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | Label naam |
| color | text | YES | #6B7280 | Kleur code |
| description | text | YES | NULL | Beschrijving |
| parent_id | uuid | YES | NULL | Parent label (hierarchie) |
| is_active | boolean | YES | true | Label actief |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_labels_parent_id (parent_id)
- INDEX idx_labels_is_active (is_active)

**Foreign Keys:**
- parent_id → labels(id) ON DELETE CASCADE

---

### 10. ticket_labels
Junction table voor ticket-label relaties.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| ticket_id | uuid | NO | - | FK naar tickets |
| label_id | uuid | NO | - | FK naar labels |
| created_at | timestamptz | YES | now() | Toegevoegd op |

**Indexes:**
- PRIMARY KEY (ticket_id, label_id)
- INDEX idx_ticket_labels_label_id (label_id)

**Foreign Keys:**
- ticket_id → tickets(id) ON DELETE CASCADE
- label_id → labels(id) ON DELETE CASCADE

---

### 11. saved_views
Opgeslagen filters/weergaven.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| name | text | NO | - | View naam |
| description | text | YES | NULL | Beschrijving |
| user_id | uuid | YES | NULL | Eigenaar |
| team_id | uuid | YES | NULL | Team eigenaar |
| is_shared | boolean | YES | false | Gedeeld met team |
| filters | jsonb | NO | {} | Filter criteria |
| sort_order | jsonb | YES | {"field": "created_at", "direction": "desc"} | Sorteer volgorde |
| columns | jsonb | YES | ["number", "subject", "customer", "status", "assignee", "updated_at"] | Zichtbare kolommen |
| is_default | boolean | YES | false | Standaard view |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_saved_views_user_id (user_id)
- INDEX idx_saved_views_team_id (team_id)

**Foreign Keys:**
- user_id → users(id) ON DELETE CASCADE
- team_id → teams(id) ON DELETE CASCADE

---

### 12. user_mentions
@mentions in berichten.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | - | Genoemde gebruiker |
| message_id | uuid | YES | NULL | Bericht met mention |
| ticket_id | uuid | YES | NULL | Gerelateerd ticket |
| is_read | boolean | YES | false | Gelezen status |
| created_at | timestamptz | YES | now() | Mention datum |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_user_mentions_user_id (user_id)
- INDEX idx_user_mentions_is_read (is_read)

**Foreign Keys:**
- user_id → users(id) ON DELETE CASCADE
- message_id → messages(id) ON DELETE CASCADE
- ticket_id → tickets(id) ON DELETE CASCADE

---

### 13. user_favorites
Favoriete tickets per gebruiker.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| user_id | uuid | NO | - | Gebruiker |
| ticket_id | uuid | NO | - | Favoriet ticket |
| created_at | timestamptz | YES | now() | Toegevoegd op |

**Indexes:**
- PRIMARY KEY (user_id, ticket_id)
- INDEX idx_user_favorites_user_id (user_id)

**Foreign Keys:**
- user_id → users(id) ON DELETE CASCADE
- ticket_id → tickets(id) ON DELETE CASCADE

---

### 14. spam_filters
Spam filter regels.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| rule_type | text | NO | - | Type regel (email/domain/keyword/pattern) |
| value | text | NO | - | Filter waarde |
| is_active | boolean | YES | true | Filter actief |
| created_by | uuid | YES | NULL | Aangemaakt door |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- INDEX idx_spam_filters_rule_type (rule_type)

**Foreign Keys:**
- created_by → users(id)

---

### 15. organization_settings
Organisatie-brede instellingen.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| id | uuid | NO | gen_random_uuid() | Primary key |
| setting_key | text | NO | - | Instelling sleutel |
| setting_value | jsonb | NO | - | Instelling waarde |
| category | text | NO | - | Categorie |
| updated_by | uuid | YES | NULL | Laatst gewijzigd door |
| created_at | timestamptz | YES | now() | Aanmaak datum |
| updated_at | timestamptz | YES | now() | Laatste update |

**Indexes:**
- PRIMARY KEY (id)
- UNIQUE (setting_key)
- INDEX idx_organization_settings_category (category)

**Foreign Keys:**
- updated_by → users(id)

---

## Stored Procedures

### create_ticket_with_message
Maakt atomair een ticket, conversatie en eerste bericht aan.

**Parameters:**
- `p_subject` (text) - Ticket onderwerp
- `p_content` (text) - Eerste bericht
- `p_customer_email` (text) - Klant email
- `p_customer_name` (text) - Klant naam
- `p_channel` (channel_type) - Communicatie kanaal
- `p_priority` (ticket_priority) - Prioriteit (optioneel)
- `p_metadata` (jsonb) - Extra metadata (optioneel)

**Returns:** JSON object met:
```json
{
  "ticket_id": "uuid",
  "ticket_number": 12345,
  "conversation_id": "uuid",
  "message_id": "uuid",
  "customer_id": "uuid"
}
```

---

### assign_ticket
Wijst een ticket toe aan een agent.

**Parameters:**
- `p_ticket_id` (uuid) - Ticket ID
- `p_agent_id` (uuid) - Agent ID

**Effect:**
- Update ticket assignee_id
- Zet status naar 'open' als het 'new' was
- Update updated_at timestamp

---

### get_ticket_stats
Haalt statistieken op voor dashboard.

**Parameters:**
- `p_team_id` (uuid) - Team filter (optioneel)
- `p_agent_id` (uuid) - Agent filter (optioneel)
- `p_date_from` (date) - Start datum (optioneel)
- `p_date_to` (date) - Eind datum (optioneel)

**Returns:** JSON object met:
```json
{
  "total_tickets": 150,
  "open_tickets": 45,
  "avg_resolution_time": "4.5 hours",
  "tickets_by_status": {...},
  "tickets_by_priority": {...},
  "tickets_by_channel": {...}
}
```

---

### search_tickets
Geavanceerd zoeken in tickets.

**Parameters:**
- `p_query` (text) - Zoekterm
- `p_status` (ticket_status[]) - Status filter (optioneel)
- `p_assignee_id` (uuid) - Assignee filter (optioneel)
- `p_customer_id` (uuid) - Customer filter (optioneel)
- `p_limit` (int) - Max resultaten (default: 50)
- `p_offset` (int) - Pagination offset (default: 0)

**Returns:** Array van ticket records met joins.

---

### merge_tickets
Voegt duplicate tickets samen.

**Parameters:**
- `p_primary_ticket_id` (uuid) - Hoofdticket
- `p_duplicate_ticket_ids` (uuid[]) - Array van duplicates

**Effect:**
- Verplaatst alle conversaties naar hoofdticket
- Sluit duplicate tickets
- Voegt merge notitie toe

---

### get_inbox_counts
Haalt inbox tellingen op voor een gebruiker.

**Parameters:**
- `p_user_id` (uuid) - Gebruiker ID

**Returns:** JSON object met:
```json
{
  "nieuw": 24,
  "toegewezen": 72,
  "gesloten": 156,
  "spam": 3,
  "aan_mij_toegewezen": 2,
  "vermeld": 0,
  "favorieten": 5
}
```

---

### mark_ticket_as_spam
Markeert een ticket als spam.

**Parameters:**
- `p_ticket_id` (uuid) - Ticket ID
- `p_is_spam` (boolean) - Spam status (default: true)

**Effect:**
- Update metadata van alle berichten
- Sluit ticket indien gemarkeerd als spam

---

### toggle_favorite
Toggle favoriet status van een ticket.

**Parameters:**
- `p_user_id` (uuid) - Gebruiker ID
- `p_ticket_id` (uuid) - Ticket ID

**Returns:** boolean - true als toegevoegd, false als verwijderd

---

## Row Level Security (RLS)

Alle tabellen hebben RLS enabled met de volgende basis policies:

1. **Agents kunnen alles zien** binnen hun team
2. **Klanten kunnen alleen eigen tickets zien**
3. **Systeem/service accounts hebben volledige toegang**

## Triggers

### update_updated_at_column()
Automatisch update van `updated_at` column bij elke wijziging.
Toegepast op: teams, users, customers, tickets, conversations, channels, labels, saved_views, spam_filters, organization_settings

## Best Practices

1. **Gebruik stored procedures** voor complexe operaties
2. **Vermijd N+1 queries** - gebruik joins waar mogelijk
3. **Index foreign keys** voor betere join performance
4. **Gebruik JSONB** voor flexibele metadata
5. **Timestamp alles** voor audit trail
6. **Soft deletes** overwegen voor kritieke data
7. **Gebruik transactions** voor multi-table updates

## Query Voorbeelden

### Haal open tickets op met laatste bericht:
```sql
SELECT 
  t.*,
  c.name as customer_name,
  u.full_name as assignee_name,
  last_msg.content as last_message,
  last_msg.created_at as last_message_at
FROM tickets t
LEFT JOIN customers c ON t.customer_id = c.id
LEFT JOIN users u ON t.assignee_id = u.id
LEFT JOIN LATERAL (
  SELECT m.content, m.created_at
  FROM messages m
  JOIN conversations conv ON m.conversation_id = conv.id
  WHERE conv.ticket_id = t.id
  ORDER BY m.created_at DESC
  LIMIT 1
) last_msg ON true
WHERE t.status IN ('new', 'open', 'pending')
ORDER BY t.created_at DESC;
```

### Dashboard stats voor agent:
```sql
SELECT * FROM get_ticket_stats(
  p_agent_id := 'agent-uuid',
  p_date_from := CURRENT_DATE - INTERVAL '30 days'
);
```

### Inbox counts voor sidebar:
```sql
SELECT * FROM get_inbox_counts('user-uuid');
``` 