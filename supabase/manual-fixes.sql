-- Manual fixes for console errors
-- Run this in Supabase SQL Editor if you're getting 404 errors for RPC functions

-- 1. Create get_ticket_active_users function (fixes 404 errors)
CREATE OR REPLACE FUNCTION get_ticket_active_users(p_ticket_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  status TEXT,
  is_typing BOOLEAN
) AS $$
BEGIN
  -- Check if user_presence table exists, if not return empty
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_presence') THEN
    RETURN;
  END IF;

  -- Return active users for the ticket
  RETURN QUERY
  SELECT DISTINCT
    u.id AS user_id,
    u.email,
    u.full_name,
    COALESCE(up.status, 'offline') AS status,
    COALESCE(ti.is_typing, false) AS is_typing
  FROM users u
  LEFT JOIN user_presence up ON u.id = up.user_id
  LEFT JOIN typing_indicators ti ON u.id = ti.user_id 
    AND ti.ticket_id = p_ticket_id 
    AND ti.expires_at > NOW()
  WHERE up.current_ticket_id = p_ticket_id
    AND up.status != 'offline'
    AND up.last_seen > NOW() - INTERVAL '5 minutes';
    
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error (missing tables, etc.), return empty
    RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create get_notification_stats function (fixes notification stats)
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS TABLE (
  total_count INTEGER,
  unread_count INTEGER,
  unseen_count INTEGER
) AS $$
BEGIN
  -- Check if notifications table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
    RETURN;
  END IF;

  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_count,
    COUNT(*) FILTER (WHERE is_read = false)::INTEGER as unread_count,
    COUNT(*) FILTER (WHERE is_seen = false)::INTEGER as unseen_count
  FROM notifications 
  WHERE user_id = p_user_id;
  
EXCEPTION
  WHEN OTHERS THEN
    -- If there's any error, return zeros
    RETURN QUERY SELECT 0::INTEGER, 0::INTEGER, 0::INTEGER;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Create basic notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_seen BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 4. Create basic user_presence table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_presence (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'offline',
  current_page TEXT,
  current_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create basic typing_indicators table if it doesn't exist
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  is_typing BOOLEAN DEFAULT true,
  last_typed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 seconds'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

-- Add RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for notifications
CREATE POLICY IF NOT EXISTS "Users can view their own notifications" ON notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "Users can update their own notifications" ON notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Basic RLS policies for user_presence
CREATE POLICY IF NOT EXISTS "Users can view all presence" ON user_presence
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can update own presence" ON user_presence
  FOR ALL USING (user_id = auth.uid());

-- Basic RLS policies for typing_indicators
CREATE POLICY IF NOT EXISTS "Users can view typing indicators" ON typing_indicators
  FOR SELECT USING (true);

CREATE POLICY IF NOT EXISTS "Users can manage own typing indicators" ON typing_indicators
  FOR ALL USING (user_id = auth.uid());

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_presence_ticket ON user_presence(current_ticket_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_ticket ON typing_indicators(ticket_id);
CREATE INDEX IF NOT EXISTS idx_typing_indicators_expires ON typing_indicators(expires_at); 