# Cursor AI Tips & Tricks

## 🧠 Effectief Werken met Cursor AI

### Quick Commands

```typescript
//? Leg uit wat deze functie doet
function complexFunction() {
  // ... code
}

//? Refactor deze functie naar TypeScript met proper types
function oldFunction(data) {
  return data.map(item => item.value);
}

//? Voeg error handling toe aan deze async functie
async function fetchData() {
  const response = await fetch('/api/data');
  return response.json();
}

//? Optimaliseer deze query voor performance
const slowQuery = `
  SELECT * FROM tickets 
  WHERE status = 'open' 
  AND created_at > NOW() - INTERVAL '30 days'
`;

//? Genereer unit tests voor deze functie
function calculateTicketPriority(ticket) {
  // ... logic
}
```

### Prompt Patterns

#### 1. Code Generation
```typescript
// Genereer een React component voor een ticket lijst met:
// - Filtering op status
// - Sortering op datum
// - Pagination
// - Loading states
// - Error handling
```

#### 2. Debugging
```typescript
// Deze functie geeft een unexpected result
// Input: [1, 2, 3]
// Expected: 6
// Actual: undefined
// Wat is het probleem?
function sum(numbers) {
  numbers.reduce((acc, num) => acc + num);
}
```

#### 3. Refactoring
```typescript
// Refactor deze code naar een meer maintainable structuur
// met proper separation of concerns
if (user.role === 'admin') {
  // 50 lines of admin logic
} else if (user.role === 'agent') {
  // 50 lines of agent logic
} else {
  // 50 lines of customer logic
}
```

#### 4. Documentation
```typescript
// Genereer JSDoc documentatie voor deze functie
// inclusief examples
function mergeTickets(primaryId: string, duplicateIds: string[]) {
  // ... implementation
}
```

### Best Practices

#### 1. Context Geven
```typescript
// GOED: Specifieke context
// In een Next.js app met Supabase, maak een server action
// die tickets ophaalt met RLS policies

// SLECHT: Vage instructie
// Maak een functie die data ophaalt
```

#### 2. Incrementeel Werken
```typescript
// Stap 1: Basis structuur
//? Maak een basis Express router voor webhooks

// Stap 2: Specifieke endpoint
//? Voeg een POST /webhooks/whatsapp endpoint toe met signature verification

// Stap 3: Error handling
//? Voeg proper error handling en logging toe
```

#### 3. Type Safety
```typescript
// Vraag altijd om TypeScript types
//? Converteer deze JavaScript functie naar TypeScript
//? met proper types voor alle parameters en return values
```

### Supabase Specifieke Patterns

#### 1. Database Queries
```typescript
//? Schrijf een Supabase query die:
// - Alle open tickets ophaalt
// - Met customer en assignee data (joins)
// - Gesorteerd op priority en created_at
// - Met pagination (limit/offset)
```

#### 2. RLS Policies
```sql
--? Genereer RLS policies voor de messages tabel waarbij:
-- - Agents kunnen alle messages in hun team zien
-- - Customers kunnen alleen hun eigen messages zien
-- - Admins kunnen alles zien
```

#### 3. Edge Functions
```typescript
//? Maak een Supabase Edge Function die:
// - Een webhook payload ontvangt
// - De data valideert met Zod
// - Een ticket aanmaakt in de database
// - Een notification stuurt
```

### Debugging Patterns

#### 1. Error Analysis
```typescript
// Error: Cannot read property 'id' of undefined
// Stack trace: [paste here]
//? Analyseer deze error en geef mogelijke oplossingen
```

#### 2. Performance
```typescript
//? Deze query is traag (5+ seconden)
// Hoe kan ik dit optimaliseren?
const query = supabase
  .from('tickets')
  .select('*, customer(*), messages(*)')
  .order('created_at', { ascending: false });
```

### Testing Patterns

#### 1. Unit Tests
```typescript
//? Genereer Vitest unit tests voor deze hook
// Test alle edge cases en error scenarios
function useTickets(status?: TicketStatus) {
  // ... implementation
}
```

#### 2. Integration Tests
```typescript
//? Schrijf een integration test die:
// - Een ticket aanmaakt via de API
// - Verifieert dat het in de database staat
// - Checkt dat realtime updates werken
```

### Code Review Patterns

```typescript
//? Review deze code voor:
// - Security issues
// - Performance problems
// - Best practices
// - Potential bugs
function handleWebhook(req, res) {
  const data = req.body;
  db.insert('webhooks', data);
  res.send('OK');
}
```

### Refactoring Patterns

#### 1. Extract Components
```typescript
//? Deze component is te groot (200+ lines)
// Split het op in kleinere, herbruikbare componenten
function TicketDashboard() {
  // ... lots of code
}
```

#### 2. Extract Hooks
```typescript
//? Extract de state logic naar custom hooks
function ComplexComponent() {
  const [tickets, setTickets] = useState([]);
  const [filter, setFilter] = useState({});
  const [sort, setSort] = useState('date');
  // ... more state and logic
}
```

### AI Pair Programming Tips

1. **Start Klein**: Begin met kleine, specifieke taken
2. **Itereer**: Bouw features incrementeel op
3. **Valideer**: Test gegenereerde code altijd
4. **Leer**: Begrijp wat de AI genereert
5. **Context**: Geef relevante context mee
6. **Patterns**: Gebruik consistente patterns

### Common Pitfalls

1. **Te Vage Prompts**
   - ❌ "Maak het beter"
   - ✅ "Voeg error handling toe voor network failures"

2. **Geen Context**
   - ❌ "Maak een form"
   - ✅ "Maak een React Hook Form met Zod validatie voor ticket creation"

3. **Te Grote Stappen**
   - ❌ "Bouw een complete ticketing system"
   - ✅ "Maak een API endpoint voor ticket creation"

### Keyboard Shortcuts

- `Cmd/Ctrl + K`: Open Cursor command palette
- `Cmd/Ctrl + L`: Open chat
- `Cmd/Ctrl + Shift + L`: Chat met selectie
- `Cmd/Ctrl + I`: Inline edit

### Advanced Patterns

#### 1. Multi-file Refactoring
```
//? Refactor de authentication logic:
// - Extract naar een separate service
// - Update alle imports
// - Voeg proper TypeScript types toe
// Files: auth.ts, api/*, components/*
```

#### 2. Architecture Decisions
```
//? Ik wil realtime updates toevoegen aan tickets
// Wat zijn de trade-offs tussen:
// 1. Supabase Realtime
// 2. Server-Sent Events
// 3. Polling
// Voor een app met 1000+ concurrent users?
```

---

💡 **Pro Tip**: Behandel Cursor AI als een junior developer. Geef duidelijke instructies, review de output, en itereer waar nodig! 