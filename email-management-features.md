# Email Management Features

## Overview
This document describes the new email management features added to the helpdesk ticketing system.

## Features Implemented

### 1. ✅ Delete Tickets
- **Location**: Ticket detail view (three dots menu)
- **How it works**:
  - Click the three dots menu (⋮) in the ticket header
  - Select "Verwijder ticket" (Delete ticket)
  - Confirm the deletion in the popup dialog
  - The ticket and all related messages/conversations are permanently deleted
  - User is redirected to the inbox after successful deletion

### 2. ✅ Auto-Update Status on Reply
- **How it works**:
  - When an agent sends a reply to a customer (not internal note), the ticket status automatically changes to "resolved"
  - This helps agents quickly process tickets without manually updating status
  - The `resolved_at` timestamp is also set automatically

### 3. ✅ New Ticket Notifications
- **Browser Notifications**:
  - On first visit, users are prompted to allow browser notifications
  - When a new ticket arrives, a browser notification appears (if permission granted)
  - Shows ticket number and subject

- **In-App Toast Notifications**:
  - A toast notification appears in the bottom-right corner for new tickets
  - Shows ticket number, subject, and timestamp
  - Auto-dismisses after 10 seconds
  - Can be manually dismissed with the X button

## Technical Implementation

### Database Changes
- Added `useDeleteTicket` hook that handles cascading deletion:
  1. Deletes all messages in the conversation
  2. Deletes the conversation
  3. Deletes the ticket itself

### Modified Hooks
- **`useSendMessage`**: Now accepts `ticketId` parameter and updates ticket status to 'resolved' when agents reply
- **`useRealtimeTickets`**: Subscribes to real-time ticket inserts via Supabase

### New Components
- **`NotificationProvider`**: Manages notification state and browser permissions
- **`NotificationToasts`**: Renders the toast notifications UI

### UI Updates
- Added delete option in ticket detail "more" menu
- Added notification permission request on app load
- Added toast notification system with animations

## Usage Notes

### For Agents
1. **Deleting Tickets**: Use with caution - deletion is permanent
2. **Status Updates**: No need to manually change status after replying - it's automatic
3. **Notifications**: Allow browser notifications to never miss a new ticket

### Security Considerations
- Delete operations require authentication
- Cascading deletes ensure no orphaned data
- Browser notifications only show basic ticket info (no sensitive data)

## Future Enhancements
Consider adding:
- Soft delete (archive) instead of hard delete
- Configurable auto-status rules
- Notification preferences per user
- Sound alerts for new tickets
- Desktop app integration for better notifications 