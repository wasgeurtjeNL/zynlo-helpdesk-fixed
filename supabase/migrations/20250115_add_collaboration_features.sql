-- Add version field to tickets for optimistic locking
ALTER TABLE tickets ADD COLUMN version INTEGER DEFAULT 1;

-- Create typing_indicators table for real-time typing awareness
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  is_typing BOOLEAN DEFAULT true,
  last_typed_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 seconds'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(ticket_id, user_id)
);

-- Create index for efficient querying
CREATE INDEX idx_typing_indicators_ticket ON typing_indicators(ticket_id);
CREATE INDEX idx_typing_indicators_expires ON typing_indicators(expires_at);
CREATE INDEX idx_typing_indicators_active ON typing_indicators(ticket_id, is_typing) WHERE is_typing = true;

-- Enable realtime for typing indicators
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;

-- Enable RLS for typing indicators
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;

-- RLS policies for typing indicators
CREATE POLICY "Users can view typing indicators for tickets they can access" ON typing_indicators
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM tickets 
      WHERE assignee_id = auth.uid() 
      OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'agent'))
    )
  );

CREATE POLICY "Users can manage their own typing indicators" ON typing_indicators
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators 
  WHERE expires_at < NOW() OR (is_typing = false AND last_typed_at < NOW() - INTERVAL '5 minutes');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to set typing indicator
CREATE OR REPLACE FUNCTION set_typing_indicator(
  p_ticket_id UUID,
  p_user_id UUID,
  p_user_name TEXT,
  p_is_typing BOOLEAN DEFAULT true
)
RETURNS void AS $$
BEGIN
  -- Clean up expired indicators first
  PERFORM cleanup_expired_typing_indicators();

  IF p_is_typing THEN
    -- Insert or update typing indicator
    INSERT INTO typing_indicators (ticket_id, user_id, user_name, is_typing, last_typed_at, expires_at)
    VALUES (p_ticket_id, p_user_id, p_user_name, true, NOW(), NOW() + INTERVAL '30 seconds')
    ON CONFLICT (ticket_id, user_id) 
    DO UPDATE SET 
      is_typing = true,
      last_typed_at = NOW(),
      expires_at = NOW() + INTERVAL '30 seconds';
  ELSE
    -- Remove typing indicator or mark as not typing
    UPDATE typing_indicators 
    SET is_typing = false, last_typed_at = NOW()
    WHERE ticket_id = p_ticket_id AND user_id = p_user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update ticket with version check
CREATE OR REPLACE FUNCTION update_ticket_with_version_check(
  p_ticket_id UUID,
  p_expected_version INTEGER,
  p_subject TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status ticket_status DEFAULT NULL,
  p_priority ticket_priority DEFAULT NULL,
  p_assignee_id UUID DEFAULT NULL,
  p_tags TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  new_version INTEGER,
  conflict BOOLEAN,
  current_version INTEGER
) AS $$
DECLARE
  current_ver INTEGER;
  new_ver INTEGER;
BEGIN
  -- Get current version
  SELECT version INTO current_ver 
  FROM tickets 
  WHERE id = p_ticket_id;
  
  -- Check for version conflict
  IF current_ver != p_expected_version THEN
    RETURN QUERY SELECT false, current_ver, true, current_ver;
    RETURN;
  END IF;
  
  -- Calculate new version
  new_ver := current_ver + 1;
  
  -- Update ticket with new version
  UPDATE tickets 
  SET 
    version = new_ver,
    subject = COALESCE(p_subject, subject),
    description = COALESCE(p_description, description),
    status = COALESCE(p_status, status),
    priority = COALESCE(p_priority, priority),
    assignee_id = COALESCE(p_assignee_id, assignee_id),
    tags = COALESCE(p_tags, tags),
    updated_at = NOW()
  WHERE id = p_ticket_id;
  
  RETURN QUERY SELECT true, new_ver, false, current_ver;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active typing indicators for a ticket
CREATE OR REPLACE FUNCTION get_typing_indicators(p_ticket_id UUID)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  last_typed_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Clean up expired indicators first
  PERFORM cleanup_expired_typing_indicators();
  
  RETURN QUERY
  SELECT 
    ti.user_id,
    ti.user_name,
    ti.last_typed_at
  FROM typing_indicators ti
  WHERE ti.ticket_id = p_ticket_id 
    AND ti.is_typing = true 
    AND ti.expires_at > NOW()
  ORDER BY ti.last_typed_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to increment version on ticket updates (fallback)
CREATE OR REPLACE FUNCTION increment_ticket_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only increment if version wasn't explicitly set in the update
  IF OLD.version = NEW.version THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ticket_version_trigger 
  BEFORE UPDATE ON tickets
  FOR EACH ROW 
  EXECUTE FUNCTION increment_ticket_version();

-- Function to get ticket with current version for UI
CREATE OR REPLACE FUNCTION get_ticket_with_version(p_ticket_id UUID)
RETURNS TABLE (
  id UUID,
  number INTEGER,
  subject TEXT,
  description TEXT,
  status ticket_status,
  priority ticket_priority,
  customer_id UUID,
  assignee_id UUID,
  team_id UUID,
  tags TEXT[],
  metadata JSONB,
  version INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id, t.number, t.subject, t.description, t.status, t.priority,
    t.customer_id, t.assignee_id, t.team_id, t.tags, t.metadata,
    t.version, t.created_at, t.updated_at, t.resolved_at, t.closed_at
  FROM tickets t
  WHERE t.id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule cleanup function to run every minute
-- Note: This would typically be done with pg_cron extension in production
-- For local development, we'll handle cleanup in the application

-- Add comments for documentation
COMMENT ON TABLE typing_indicators IS 'Tracks real-time typing indicators for collaborative editing';
COMMENT ON COLUMN tickets.version IS 'Version number for optimistic locking and conflict detection';
COMMENT ON FUNCTION set_typing_indicator IS 'Sets or clears typing indicator for a user on a ticket';
COMMENT ON FUNCTION check_ticket_version_conflict IS 'Checks if ticket version has changed (conflict detection)';
COMMENT ON FUNCTION update_ticket_with_version_check IS 'Updates ticket with optimistic locking version check';
COMMENT ON FUNCTION get_typing_indicators IS 'Returns active typing indicators for a ticket';
COMMENT ON FUNCTION cleanup_expired_typing_indicators IS 'Removes expired typing indicators from the database'; 