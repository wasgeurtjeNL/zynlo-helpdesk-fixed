-- Create activity_logs table to track all ticket events and actions
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name TEXT,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'commented', 'assigned', 'status_changed', 'mentioned', etc.
  action_data JSONB DEFAULT '{}', -- Additional data about the action
  description TEXT NOT NULL, -- Human readable description
  metadata JSONB DEFAULT '{}', -- Extra metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Indexes
  INDEX(ticket_id),
  INDEX(user_id),
  INDEX(action_type),
  INDEX(created_at DESC)
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'mention', 'assignment', 'comment', 'status_change', 'due_date', etc.
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  action_url TEXT, -- URL to navigate when notification is clicked
  data JSONB DEFAULT '{}', -- Additional notification data
  is_read BOOLEAN DEFAULT false,
  is_seen BOOLEAN DEFAULT false, -- Seen in notification center but not necessarily clicked
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Related entities (optional, for easy joining)
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  activity_log_id UUID REFERENCES activity_logs(id) ON DELETE SET NULL,
  
  -- Indexes
  INDEX(user_id),
  INDEX(type),
  INDEX(is_read),
  INDEX(created_at DESC),
  INDEX(ticket_id),
  INDEX(user_id, is_read) -- Composite for unread notifications
);

-- Create notification_preferences table for user settings
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'mention', 'assignment', 'comment', etc.
  channel TEXT NOT NULL, -- 'in_app', 'email', 'push'
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, notification_type, channel),
  INDEX(user_id),
  INDEX(notification_type)
);

-- Enable realtime for notifications and activity logs
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

-- Enable RLS
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS policies for activity_logs
CREATE POLICY "Users can view activity logs for accessible tickets" ON activity_logs
  FOR SELECT
  USING (
    ticket_id IN (
      SELECT id FROM tickets 
      WHERE assignee_id = auth.uid() 
      OR auth.uid() IN (SELECT id FROM users WHERE role IN ('admin', 'agent'))
    )
  );

CREATE POLICY "Authenticated users can create activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON notifications
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can create notifications" ON notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- RLS policies for notification_preferences
CREATE POLICY "Users can manage their own notification preferences" ON notification_preferences
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Function to create activity log entry
CREATE OR REPLACE FUNCTION create_activity_log(
  p_ticket_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_user_name TEXT DEFAULT NULL,
  p_action_type TEXT,
  p_description TEXT,
  p_action_data JSONB DEFAULT '{}',
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
  calculated_user_name TEXT;
BEGIN
  -- Get user name if not provided and user_id exists
  IF p_user_name IS NULL AND p_user_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email) INTO calculated_user_name
    FROM users WHERE id = p_user_id;
  ELSE
    calculated_user_name := p_user_name;
  END IF;

  -- Insert activity log
  INSERT INTO activity_logs (
    ticket_id, user_id, user_name, action_type, 
    description, action_data, metadata
  ) VALUES (
    p_ticket_id, p_user_id, calculated_user_name, p_action_type,
    p_description, p_action_data, p_metadata
  ) RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_action_url TEXT DEFAULT NULL,
  p_data JSONB DEFAULT '{}',
  p_ticket_id UUID DEFAULT NULL,
  p_related_user_id UUID DEFAULT NULL,
  p_activity_log_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  -- Insert notification
  INSERT INTO notifications (
    user_id, type, title, message, action_url, data,
    ticket_id, related_user_id, activity_log_id
  ) VALUES (
    p_user_id, p_type, p_title, p_message, p_action_url, p_data,
    p_ticket_id, p_related_user_id, p_activity_log_id
  ) RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION mark_notifications_as_read(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL,
  p_mark_all BOOLEAN DEFAULT false
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_mark_all THEN
    -- Mark all unread notifications as read
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id AND is_read = false;
  ELSIF p_notification_ids IS NOT NULL THEN
    -- Mark specific notifications as read
    UPDATE notifications 
    SET is_read = true, read_at = NOW()
    WHERE user_id = p_user_id 
    AND id = ANY(p_notification_ids)
    AND is_read = false;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark notifications as seen (viewed in notification center)
CREATE OR REPLACE FUNCTION mark_notifications_as_seen(
  p_user_id UUID,
  p_notification_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_notification_ids IS NOT NULL THEN
    UPDATE notifications 
    SET is_seen = true
    WHERE user_id = p_user_id 
    AND id = ANY(p_notification_ids)
    AND is_seen = false;
  ELSE
    -- Mark all notifications as seen
    UPDATE notifications 
    SET is_seen = true
    WHERE user_id = p_user_id AND is_seen = false;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user notification stats
CREATE OR REPLACE FUNCTION get_notification_stats(p_user_id UUID)
RETURNS TABLE (
  total_count INTEGER,
  unread_count INTEGER,
  unseen_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_count,
    COUNT(*) FILTER (WHERE is_read = false)::INTEGER as unread_count,
    COUNT(*) FILTER (WHERE is_seen = false)::INTEGER as unseen_count
  FROM notifications 
  WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get activity feed for ticket
CREATE OR REPLACE FUNCTION get_ticket_activity_feed(
  p_ticket_id UUID,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  user_name TEXT,
  action_type TEXT,
  description TEXT,
  action_data JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.id,
    al.user_id,
    al.user_name,
    al.action_type,
    al.description,
    al.action_data,
    al.metadata,
    al.created_at
  FROM activity_logs al
  WHERE al.ticket_id = p_ticket_id
  ORDER BY al.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create activity logs for ticket changes
CREATE OR REPLACE FUNCTION ticket_activity_trigger()
RETURNS TRIGGER AS $$
DECLARE
  log_description TEXT;
  user_name_val TEXT;
BEGIN
  -- Get user name for the activity
  IF NEW.assignee_id IS NOT NULL THEN
    SELECT COALESCE(full_name, email) INTO user_name_val
    FROM users WHERE id = NEW.assignee_id;
  END IF;

  -- Handle different types of changes
  IF TG_OP = 'INSERT' THEN
    log_description := 'Ticket aangemaakt';
    PERFORM create_activity_log(
      NEW.id, 
      NEW.assignee_id, 
      user_name_val,
      'created',
      log_description,
      jsonb_build_object('status', NEW.status, 'priority', NEW.priority)
    );
  ELSIF TG_OP = 'UPDATE' THEN
    -- Status change
    IF OLD.status != NEW.status THEN
      log_description := format('Status gewijzigd van %s naar %s', OLD.status, NEW.status);
      PERFORM create_activity_log(
        NEW.id,
        NEW.assignee_id,
        user_name_val,
        'status_changed',
        log_description,
        jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status)
      );
    END IF;

    -- Assignment change
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      IF NEW.assignee_id IS NULL THEN
        log_description := 'Ticket niet meer toegewezen';
      ELSE
        log_description := format('Ticket toegewezen aan %s', user_name_val);
      END IF;
      
      PERFORM create_activity_log(
        NEW.id,
        NEW.assignee_id,
        user_name_val,
        'assigned',
        log_description,
        jsonb_build_object('old_assignee_id', OLD.assignee_id, 'new_assignee_id', NEW.assignee_id)
      );
    END IF;

    -- Priority change
    IF OLD.priority != NEW.priority THEN
      log_description := format('Prioriteit gewijzigd van %s naar %s', OLD.priority, NEW.priority);
      PERFORM create_activity_log(
        NEW.id,
        NEW.assignee_id,
        user_name_val,
        'priority_changed',
        log_description,
        jsonb_build_object('old_priority', OLD.priority, 'new_priority', NEW.priority)
      );
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for ticket activity logging
CREATE TRIGGER ticket_activity_log_trigger
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION ticket_activity_trigger();

-- Insert default notification preferences for new users
CREATE OR REPLACE FUNCTION create_default_notification_preferences()
RETURNS TRIGGER AS $$
DECLARE
  pref_types TEXT[] := ARRAY['mention', 'assignment', 'comment', 'status_change'];
  pref_type TEXT;
BEGIN
  -- Create default preferences for both in_app and email channels
  FOREACH pref_type IN ARRAY pref_types
  LOOP
    INSERT INTO notification_preferences (user_id, notification_type, channel, enabled)
    VALUES 
      (NEW.id, pref_type, 'in_app', true),
      (NEW.id, pref_type, 'email', pref_type IN ('mention', 'assignment')); -- Email only for important ones
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for default notification preferences
CREATE TRIGGER create_user_notification_preferences_trigger
  AFTER INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION create_default_notification_preferences();

-- Add comments for documentation
COMMENT ON TABLE activity_logs IS 'Tracks all ticket events and agent actions for activity feed';
COMMENT ON TABLE notifications IS 'Stores user notifications with delivery status';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification types and channels';
COMMENT ON FUNCTION create_activity_log IS 'Creates a new activity log entry for ticket events';
COMMENT ON FUNCTION create_notification IS 'Creates a new notification for a user';
COMMENT ON FUNCTION get_ticket_activity_feed IS 'Gets paginated activity feed for a ticket'; 