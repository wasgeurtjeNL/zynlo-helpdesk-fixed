# Bulk Actions for Tickets - Trengo Style

## Overview
The ticketing system now supports bulk actions on multiple tickets at once, with a UI design inspired by Trengo.

## UI Changes
- **Circular checkboxes**: Replaced square checkboxes with circular ones for a cleaner look
- **Hover-to-show**: Checkboxes only appear on hover unless already selected
- **Dropdown menu**: Bulk actions are now in a dropdown instead of multiple buttons
- **Cleaner design**: More subtle header styling and better visual hierarchy

## How to Use

### 1. Select Tickets
- Hover over a ticket to reveal the circular checkbox
- Click the checkbox to select the ticket
- Click the main checkbox in the header to select all visible tickets

### 2. Available Actions
When one or more tickets are selected, a dropdown menu appears with:
- **"Met geselecteerd (X)"** - Shows number of selected tickets
- Click the dropdown arrow to reveal actions:

#### ✅ Toewijzen (Assign)
- Assign selected tickets to a team member
- *Coming soon*

#### ✅ Sluiten (Close)
- Close multiple tickets at once
- *Coming soon*

#### 🗑️ Verwijderen (Delete)
- **Permanently delete selected tickets**
- Shows confirmation dialog before deletion
- Deletes all associated messages and conversations
- Updates ticket counts automatically
- Shows loading spinner during operation
- Success toast notification after completion

#### 🚫 Markeer als spam (Mark as Spam)
- Mark tickets as spam and move to spam folder
- *Coming soon*

### 3. Visual Feedback
- Selected tickets have a light gray background
- Hover effects on all interactive elements
- Green checkmark when selected
- Loading spinner during delete operations
- Success/error toast notifications (30 seconds duration)

## Implementation Details

### Components Updated:
- `TicketList` - Regular paginated ticket list
- `TicketListLoadMore` - Infinite scroll ticket list

### Key Features:
- Trengo-inspired circular checkboxes
- Hover-to-reveal checkbox behavior
- Dropdown menu for bulk actions
- Confirmation dialogs for destructive actions
- Proper error handling with toast notifications
- Automatic query invalidation to refresh lists
- Responsive design matching the existing UI

### Delete Operation:
The delete operation cascades through:
1. Delete all messages in the ticket
2. Delete all conversations
3. Delete the ticket itself

This ensures no orphaned data remains in the database.

### Toast Notifications:
- Uses `sonner` for toast notifications
- 30-second duration for better visibility
- Success messages for completed operations
- Error messages with details if something fails 