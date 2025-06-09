-- Ensure presence system functions exist
-- This is a safety migration to ensure required functions are available

-- Function to get active users on a ticket
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

-- Function to get notification stats (if missing)
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