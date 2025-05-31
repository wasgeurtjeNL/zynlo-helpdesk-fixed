# Fix for Ticket Messages Display Issues

## Problems Fixed

### 1. Empty Messages in Ticket List ("Geen berichten")

**Problem**: Tickets in the list were showing "Geen berichten" even when they had messages.

**Root Cause**: The `useTickets` hook was returning empty arrays for messages because it wasn't fetching message data.

**Solution**:
1. Created a stored procedure `get_tickets_with_last_message` that efficiently fetches tickets with their last public message in a single query
2. Updated `useTickets` hook to use this stored procedure instead of multiple queries
3. Updated both `TicketList` and `TicketListLoadMore` components to use the new `last_message` property

**Files Changed**:
- `supabase/migrations/20250530_get_tickets_with_last_message.sql` (new)
- `packages/supabase/src/hooks/useTickets.ts`
- `apps/dashboard/components/ticket-list.tsx`
- `apps/dashboard/components/ticket-list-load-more.tsx`

### 2. CSS/HTML in Message Previews

**Problem**: Message previews were showing CSS imports like "@import url(...)" instead of actual content.

**Root Cause**: The `stripHtmlTags` function wasn't removing `<style>` tags and their content.

**Solution**: Enhanced `stripHtmlTags` function to:
- Remove `<style>` and `<script>` tags with all their content
- Remove `@import` statements
- Clean up extra whitespace

### 3. useSelectedTicket Provider Error

**Problem**: Runtime error "useSelectedTicket must be used within a SelectedTicketProvider" when viewing ticket details.

**Root Cause**: `TicketDetail` component was using `useSelectedTicket` which requires a provider, but when accessed via direct route `/tickets/[number]`, it wasn't wrapped in the provider.

**Solution**: Changed `useSelectedTicket` to `useSelectedTicketSafe` which returns null values instead of throwing errors when used outside the provider.

**File Changed**:
- `apps/dashboard/components/ticket-detail.tsx`

## Database Migration

The stored procedure creates an efficient query that:
- Fetches tickets with pagination
- Includes customer and assignee data as JSON
- Gets the last non-internal message for each ticket
- Returns total count for pagination
- Uses a single database round-trip

This is much more efficient than the previous approach which would have required N+1 queries.

## Testing

To test the fixes:
1. Refresh the ticket list pages
2. Tickets should now show message previews instead of "Geen berichten"
3. Message previews should show clean text without CSS/HTML
4. Clicking on tickets should work without provider errors 