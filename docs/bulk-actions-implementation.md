# Bulk Actions Implementation Guide

## Overview
The bulk actions functionality has been fully implemented in the ticketing system, allowing users to perform operations on multiple tickets at once. This follows the Trengo-inspired UI design.

## Features Implemented

### 1. **Bulk Close Tickets** ✅
- Updates selected tickets' status to 'closed'
- Sets the `closed_at` timestamp automatically
- Shows loading state during operation
- Success toast notification after completion

### 2. **Bulk Assign Tickets** ✅
- Opens a modal to select an agent
- Option to remove assignment (select "Geen")
- Updates tickets' `assignee_id` field
- Changes status from 'new' to 'open' if assigning to someone
- Shows loading state during operation
- Success toast notification after completion

### 3. **Bulk Delete Tickets** ✅
- Shows confirmation dialog before deletion
- Cascading deletion (messages → conversations → ticket)
- Shows loading state during operation
- Success toast notification after completion

### 4. **Bulk Mark as Spam** ✅
- Shows confirmation dialog
- Uses database function `mark_ticket_as_spam`
- Sets `is_spam = true` column
- Automatically closes tickets marked as spam
- Records who marked it as spam and when
- Updates inbox counts to exclude spam tickets

## Database Changes

### New Columns Added to `tickets` table:
- `is_spam` (BOOLEAN) - Whether ticket is marked as spam
- `marked_as_spam_at` (TIMESTAMPTZ) - When it was marked
- `marked_as_spam_by` (UUID) - User who marked it

### New Database Function:
```sql
mark_ticket_as_spam(p_ticket_id UUID, p_is_spam BOOLEAN DEFAULT true)
```

### Updated Functions:
- `get_inbox_counts` - Now excludes spam tickets from counts and adds separate spam count

## Implementation Details

### New Hooks Created:
```typescript
// In packages/supabase/src/hooks/useTickets.ts

useBulkUpdateTickets()     // For closing tickets
useBulkAssignTickets()     // For assigning tickets
useBulkMarkAsSpam()        // For marking as spam
```

### Components Updated:
1. **TicketList** (`apps/dashboard/components/ticket-list.tsx`)
   - Added bulk action handlers
   - Added assign modal UI
   - Updated dropdown menu with loading states

2. **TicketListLoadMore** (`apps/dashboard/components/ticket-list-load-more.tsx`)
   - Same updates as TicketList for consistency

## UI/UX Features

### Visual Design:
- Circular checkboxes (Trengo-style)
- Hover-to-show checkboxes
- Green checkmark when selected
- Dropdown menu for bulk actions
- Loading spinners during operations
- 30-second toast notifications

### Interaction Flow:
1. Hover over ticket to show checkbox
2. Select one or more tickets
3. Click dropdown arrow next to "Met geselecteerd (X)"
4. Choose action from dropdown
5. Confirm if needed (delete/spam)
6. See success notification

## Usage Examples

### Close Multiple Tickets:
1. Select tickets using checkboxes
2. Click dropdown → "Sluiten"
3. Tickets are closed immediately

### Assign to Agent:
1. Select tickets
2. Click dropdown → "Toewijzen"
3. Select agent from modal
4. Click "Toewijzen" button

### Mark as Spam:
1. Select tickets
2. Click dropdown → "Markeer als spam"
3. Confirm in dialog
4. Tickets are marked as spam and closed

## Error Handling

- All operations have try-catch blocks
- Error toast notifications on failure
- Detailed console logging for debugging
- Proper cleanup on component unmount

## Performance Considerations

- Batch operations process up to 10 tickets at a time
- Query invalidation refreshes only affected data
- Optimistic UI updates considered for future

## Migration Required

Run the following migration to add spam functionality:
```bash
supabase migration up 20250602_add_spam_functionality
```

## Testing

1. Select multiple tickets
2. Test each bulk action
3. Verify database updates
4. Check inbox counts update
5. Test error scenarios (network failure)

## Future Enhancements

- Bulk update priority
- Bulk add labels/tags
- Bulk merge similar tickets
- Undo functionality
- Keyboard shortcuts 