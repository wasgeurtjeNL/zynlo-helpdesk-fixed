# Test Notification System

## How to Test Email Notifications

### 1. Prerequisites
- Ensure the app is running (`pnpm dev`)
- Make sure you're logged in to the dashboard
- Allow browser notifications when prompted

### 2. Testing Steps

#### Option A: Send a Test Email
1. Send an email to one of your configured Gmail addresses
2. Wait up to 5 minutes for the Gmail sync to pick it up
3. You should see:
   - A toast notification in the bottom-right corner
   - A browser notification (if permissions granted)
   - The ticket list automatically refreshes

#### Option B: Create Test Ticket via Database
You can manually insert a test ticket in Supabase:

```sql
-- Run this in Supabase SQL Editor
INSERT INTO tickets (subject, status, priority)
VALUES ('Test Notification ' || NOW(), 'new', 'normal')
RETURNING *;
```

### 3. What to Expect
- **Toast Duration**: 30 seconds (was 10 seconds)
- **Hover to Pause**: Mouse over the toast to pause auto-dismiss
- **Browser Notification**: Stays until you interact with it
- **Auto-refresh**: Ticket list updates without manual refresh

### 4. Notification Features

#### Toast Notifications (In-App)
- Display for 30 seconds by default
- Hover over notification to pause the timer
- Leave hover to resume (5 second countdown)
- Click X button to dismiss immediately
- Shadow effect on hover for better visibility

#### Browser Notifications
- Require user interaction to dismiss
- Click notification to focus the app window
- Shows ticket number and subject

### 5. Troubleshooting

#### Notifications Not Appearing?
1. Check browser console for errors
2. Verify notification permissions in browser settings
3. Ensure Realtime is enabled (check migration was applied)
4. Try refreshing the page

#### Realtime Not Working?
1. Check Supabase Dashboard > Database > Replication
2. Ensure `tickets` table is in the publication
3. Check WebSocket connection in browser Network tab

### 6. Debug Logs
The system logs several events:
- `Notification permission: granted/denied` - Permission status
- `New ticket received: {...}` - When a ticket arrives via Realtime
- Check browser console for any error messages 