# HTML Email Rendering in Ticketsysteem

## Overzicht

Het ticketsysteem ondersteunt nu automatische detectie en veilige rendering van HTML-content in e-mailberichten. Dit zorgt ervoor dat HTML-emails correct worden weergegeven met klikbare links, opmaak en stijlen, terwijl de beveiliging tegen XSS-aanvallen gewaarborgd blijft.

## Functionaliteit

### Automatische HTML Detectie
De `detectHtmlContent()` functie detecteert automatisch of een bericht HTML bevat door te zoeken naar:
- HTML-tags zoals `<p>`, `<div>`, `<a>`, etc.
- DOCTYPE declaraties
- HTML entities zoals `&nbsp;`, `&lt;`, etc.

### Content Type Handling
Het systeem kijkt naar de `Content-Type` header van het bericht:
- **`text/html`**: Wordt altijd als HTML gerenderd
- **`text/plain`**: Wordt gecontroleerd op HTML-tags en kan optioneel als HTML worden weergegeven
- **Geen header**: Gebruikt automatische detectie

### Veiligheid

#### XSS Preventie
Alle HTML wordt gesanitized met DOMPurify voordat het wordt weergegeven:
- Alleen veilige tags en attributen worden toegestaan
- Scripts en gevaarlijke elementen worden verwijderd
- Inline styles worden gefilterd

#### Link Beveiliging
Alle links in HTML-emails:
- Openen automatisch in een nieuw tabblad (`target="_blank"`)
- Hebben `rel="noopener noreferrer"` voor beveiliging
- Worden visueel gemarkeerd met blauwe kleur en onderstreping

### Gebruikerscontroles

#### Safe Mode
Gebruikers kunnen schakelen tussen:
- **HTML Mode**: Toont opgemaakte HTML-content
- **Safe Mode**: Toont alleen platte tekst zonder opmaak

#### Raw View
Gebruikers kunnen de ruwe broncode bekijken om:
- De originele HTML te inspecteren
- Problemen op te sporen
- Verdachte content te identificeren

## Implementatie

### 1. HTML Content Utilities (`lib/html-content.ts`)

```typescript
// Detecteer of content HTML bevat
export function detectHtmlContent(content: string): boolean

// Bepaal of content als HTML moet worden gerenderd
export function shouldRenderAsHtml(
  content: string, 
  contentType?: string,
  forceDetection: boolean = true
): boolean

// Sanitize HTML content voor veilige weergave
export function sanitizeHtml(
  content: string, 
  options: HtmlContentOptions = {}
): string

// Bereid content voor op rendering
export function prepareMessageContent(
  content: string,
  contentType?: string,
  options: HtmlContentOptions = {}
): {
  isHtml: boolean
  content: string
  sanitized: boolean
}
```

### 2. MessageContent Component (`components/message-content.tsx`)

```tsx
<MessageContent 
  content={message.content}
  contentType={message.content_type}
  className="text-sm"
  showControls={true}
  safeMode={false}
  detectHtml={true}
  maxPreviewLength={200}
/>
```

**Props:**
- `content`: De te renderen content
- `contentType`: Optional Content-Type header
- `className`: Extra CSS classes
- `showControls`: Toon safe mode/raw view knoppen
- `safeMode`: Start in safe mode
- `detectHtml`: Automatische HTML detectie aan/uit
- `maxPreviewLength`: Max lengte voor plain text preview

### 3. Integratie in Ticket Detail

In `ticket-detail.tsx` wordt de `MessageContent` component gebruikt om berichten weer te geven:

```tsx
<MessageContent 
  content={message.content}
  contentType={message.content_type}
  className={cn(
    "text-sm",
    message.sender_type === 'agent' && !message.is_internal && "text-white"
  )}
  showControls={message.sender_type === 'customer'}
  safeMode={false}
/>
```

## Database Schema Update (Optioneel)

Om de Content-Type van berichten op te slaan, voeg een kolom toe aan de messages tabel:

```sql
ALTER TABLE messages 
ADD COLUMN content_type VARCHAR(50);
```

## Testen

Bezoek `/test-html-email` om de functionaliteit te testen met:
- Volledige HTML emails
- Platte tekst met HTML tags
- Pure platte tekst
- Custom content

## Configuratie

### Toegestane HTML Tags
Pas de lijst aan in `lib/html-content.ts`:

```typescript
const DEFAULT_ALLOWED_TAGS = [
  'a', 'abbr', 'b', 'blockquote', 'br', 'code', 'del', 'div', 'em', 
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hr', 'i', 'img', 'ins', 
  'li', 'ol', 'p', 'pre', 'q', 's', 'small', 'span', 'strong', 
  'sub', 'sup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 
  'tr', 'u', 'ul', 'style'
]
```

### Toegestane Attributen
```typescript
const DEFAULT_ALLOWED_ATTRIBUTES = [
  'href', 'title', 'target', 'src', 'alt', 'class', 'id', 'style', 
  'width', 'height', 'colspan', 'rowspan', 'align', 'valign'
]
```

## Best Practices

1. **Webhook Processing**: Sla de Content-Type header op bij het verwerken van inkomende emails
2. **Performance**: Cache gesanitized HTML voor grote berichten
3. **Monitoring**: Log wanneer HTML wordt gedetecteerd/gesanitized voor security auditing
4. **User Preferences**: Overweeg een gebruikersinstelling voor standaard safe mode

## Troubleshooting

### HTML wordt niet gedetecteerd
- Controleer of de content daadwerkelijk HTML tags bevat
- Verifieer dat `detectHtml` niet op `false` staat
- Check de Content-Type header

### Styling werkt niet
- Sommige email clients gebruiken inline styles die mogelijk worden gefilterd
- Voeg specifieke classes toe aan de toegestane attributen indien nodig

### Links werken niet
- Controleer of het `href` attribuut is toegestaan
- Verifieer dat de URL een toegestaan protocol gebruikt (http/https) 