-- Create presence status enum
CREATE TYPE presence_status AS ENUM ('online', 'away', 'busy', 'offline');

-- Create user presence table
CREATE TABLE IF NOT EXISTS user_presence (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status presence_status NOT NULL DEFAULT 'offline',
  last_seen TIMESTAMPTZ DEFAULT NOW(),
  current_page TEXT,
  current_ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Create typing indicators table
CREATE TABLE IF NOT EXISTS typing_indicators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  is_typing BOOLEAN DEFAULT true,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 seconds',
  UNIQUE(user_id, ticket_id)
);

-- Create activity logs table for collaboration awareness
CREATE TABLE IF NOT EXISTS collaboration_activity (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('viewing', 'editing', 'commenting', 'status_change', 'assignment')),
  activity_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_presence_user_id ON user_presence(user_id);
CREATE INDEX idx_user_presence_status ON user_presence(status);
CREATE INDEX idx_user_presence_ticket ON user_presence(current_ticket_id);
CREATE INDEX idx_typing_indicators_ticket ON typing_indicators(ticket_id);
CREATE INDEX idx_typing_indicators_expires ON typing_indicators(expires_at);
CREATE INDEX idx_collaboration_activity_ticket ON collaboration_activity(ticket_id);
CREATE INDEX idx_collaboration_activity_user ON collaboration_activity(user_id);
CREATE INDEX idx_collaboration_activity_created ON collaboration_activity(created_at DESC);

-- Function to automatically update presence timestamp
CREATE OR REPLACE FUNCTION update_presence_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.last_seen = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for presence updates
CREATE TRIGGER update_user_presence_timestamp
BEFORE UPDATE ON user_presence
FOR EACH ROW
EXECUTE FUNCTION update_presence_timestamp();

-- Function to clean up expired typing indicators
CREATE OR REPLACE FUNCTION cleanup_expired_typing_indicators()
RETURNS void AS $$
BEGIN
  DELETE FROM typing_indicators WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to update user presence
CREATE OR REPLACE FUNCTION update_user_presence(
  p_user_id UUID,
  p_status presence_status,
  p_current_page TEXT DEFAULT NULL,
  p_current_ticket_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS user_presence AS $$
DECLARE
  v_presence user_presence;
BEGIN
  INSERT INTO user_presence (
    user_id,
    status,
    current_page,
    current_ticket_id,
    metadata
  ) VALUES (
    p_user_id,
    p_status,
    p_current_page,
    p_current_ticket_id,
    p_metadata
  )
  ON CONFLICT (user_id) DO UPDATE SET
    status = EXCLUDED.status,
    current_page = EXCLUDED.current_page,
    current_ticket_id = EXCLUDED.current_ticket_id,
    metadata = EXCLUDED.metadata,
    last_seen = NOW(),
    updated_at = NOW()
  RETURNING * INTO v_presence;
  
  RETURN v_presence;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get active users on a ticket
CREATE OR REPLACE FUNCTION get_ticket_active_users(p_ticket_id UUID)
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  full_name TEXT,
  status presence_status,
  is_typing BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT
    u.id AS user_id,
    u.email,
    u.full_name,
    COALESCE(up.status, 'offline'::presence_status) AS status,
    COALESCE(ti.is_typing, false) AS is_typing
  FROM users u
  LEFT JOIN user_presence up ON u.id = up.user_id
  LEFT JOIN typing_indicators ti ON u.id = ti.user_id AND ti.ticket_id = p_ticket_id AND ti.expires_at > NOW()
  WHERE up.current_ticket_id = p_ticket_id
    AND up.status != 'offline'
    AND up.last_seen > NOW() - INTERVAL '5 minutes';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for presence tables
ALTER PUBLICATION supabase_realtime ADD TABLE user_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE typing_indicators;
ALTER PUBLICATION supabase_realtime ADD TABLE collaboration_activity;

-- RLS policies for presence
ALTER TABLE user_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE collaboration_activity ENABLE ROW LEVEL SECURITY;

-- Users can view presence of users in their organization
CREATE POLICY "Users can view presence in their organization" ON user_presence
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = auth.uid()
      AND u2.id = user_presence.user_id
    )
  );

-- Users can update their own presence
CREATE POLICY "Users can update own presence" ON user_presence
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Similar policies for typing indicators
CREATE POLICY "Users can view typing indicators in their organization" ON typing_indicators
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = auth.uid()
      AND u2.id = typing_indicators.user_id
    )
  );

CREATE POLICY "Users can manage own typing indicators" ON typing_indicators
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Collaboration activity policies
CREATE POLICY "Users can view activity in their organization" ON collaboration_activity
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u1
      JOIN users u2 ON u1.organization_id = u2.organization_id
      WHERE u1.id = auth.uid()
      AND u2.id = collaboration_activity.user_id
    )
  );

CREATE POLICY "Users can create own activity" ON collaboration_activity
  FOR INSERT
  WITH CHECK (user_id = auth.uid()); 