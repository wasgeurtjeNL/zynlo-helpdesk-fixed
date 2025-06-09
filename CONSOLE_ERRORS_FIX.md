# Console Errors Fix Guide

This document explains how to fix the console errors you're experiencing and provides the necessary database setup.

## Issues Identified

1. **401 Unauthorized errors** for `/api/notifications`
2. **404 Not Found errors** for `get_ticket_active_users` RPC function  
3. **Excessive iframe height logging** in MessageContent component

## Fixes Applied

### 1. MessageContent Component (✅ Fixed)
- Reduced iframe height check frequency from 1 second to 5 seconds
- Added condition to only log when height actually changes
- This will significantly reduce console spam

### 2. API Authentication Errors (✅ Improved)
- Added better error handling for 401 authentication errors
- Added retry logic that doesn't retry on authentication failures
- Added user validation before making API calls

### 3. Missing Database Functions (❌ Requires Manual Fix)

The `get_ticket_active_users` function doesn't exist in your database yet. You have two options:

#### Option A: Run Manual SQL (Recommended)
1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `supabase/manual-fixes.sql`
4. Run the script

#### Option B: Set up Supabase CLI and Run Migrations
1. Install Supabase CLI: `npm install -g supabase`
2. Link your project: `supabase link --project-ref YOUR_PROJECT_REF`
3. Push migrations: `supabase db push`

## Quick Fix (Immediate)

To immediately stop the console errors, run this SQL in your Supabase SQL Editor:

```sql
-- Quick fix for get_ticket_active_users function
CREATE OR REPLACE FUNCTION get_ticket_active_users(p_ticket_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  status TEXT,
  is_typing BOOLEAN
) AS $$
BEGIN
  -- Return empty for now (function exists but returns no data)
  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Quick fix for notification stats
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS TABLE (
  total_count INTEGER,
  unread_count INTEGER,
  unseen_count INTEGER
) AS $$
BEGIN
  -- Return zeros for now
  RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Verification

After applying the fixes:

1. **Console spam should stop** - No more repeated iframe height logs
2. **401 errors should be handled gracefully** - Errors won't retry endlessly
3. **404 RPC errors should disappear** - Functions will exist and return empty data

## Next Steps

1. Run the manual SQL fix above to stop immediate errors
2. Set up proper Supabase CLI for future development
3. Consider implementing the full presence and notification system when ready

## Need Help?

If you continue experiencing issues:
1. Check your Supabase project connection
2. Verify your authentication setup  
3. Ensure all required environment variables are set
4. Check browser network tab for specific error details 