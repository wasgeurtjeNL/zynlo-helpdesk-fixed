-- Create organization quotas table
CREATE TABLE IF NOT EXISTS organization_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Quota limits
  max_tickets INTEGER DEFAULT 1000,
  max_active_tickets INTEGER DEFAULT 100,
  max_users INTEGER DEFAULT 10,
  max_storage_gb INTEGER DEFAULT 10,
  max_attachments_per_ticket INTEGER DEFAULT 10,
  max_attachment_size_mb INTEGER DEFAULT 25,
  
  -- Current usage
  current_tickets INTEGER DEFAULT 0,
  current_active_tickets INTEGER DEFAULT 0,
  current_users INTEGER DEFAULT 0,
  current_storage_bytes BIGINT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(organization_id)
);

-- Create user quotas table
CREATE TABLE IF NOT EXISTS user_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Quota limits (per hour/day)
  max_tickets_per_hour INTEGER DEFAULT 50,
  max_tickets_per_day INTEGER DEFAULT 200,
  max_messages_per_hour INTEGER DEFAULT 100,
  max_api_calls_per_hour INTEGER DEFAULT 1000,
  
  -- Current usage
  tickets_created_this_hour INTEGER DEFAULT 0,
  tickets_created_today INTEGER DEFAULT 0,
  messages_sent_this_hour INTEGER DEFAULT 0,
  api_calls_this_hour INTEGER DEFAULT 0,
  
  -- Reset timestamps
  hour_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 hour',
  day_reset_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '1 day',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Create quota violations log
CREATE TABLE IF NOT EXISTS quota_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id),
  quota_type TEXT NOT NULL, -- 'tickets', 'storage', 'users', etc.
  limit_value INTEGER NOT NULL,
  attempted_value INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'create_ticket', 'upload_file', etc.
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_org_quotas_org_id ON organization_quotas(organization_id);
CREATE INDEX idx_user_quotas_user_id ON user_quotas(user_id);
CREATE INDEX idx_quota_violations_user_id ON quota_violations(user_id);
CREATE INDEX idx_quota_violations_created_at ON quota_violations(created_at DESC);

-- Function to check organization quota
CREATE OR REPLACE FUNCTION check_organization_quota(
  p_organization_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_quota organization_quotas%ROWTYPE;
BEGIN
  SELECT * INTO v_quota FROM organization_quotas WHERE organization_id = p_organization_id;
  
  IF NOT FOUND THEN
    -- Create default quota if not exists
    INSERT INTO organization_quotas (organization_id) VALUES (p_organization_id);
    RETURN TRUE;
  END IF;
  
  CASE p_quota_type
    WHEN 'tickets' THEN
      RETURN (v_quota.current_tickets + p_increment) <= v_quota.max_tickets;
    WHEN 'active_tickets' THEN
      RETURN (v_quota.current_active_tickets + p_increment) <= v_quota.max_active_tickets;
    WHEN 'users' THEN
      RETURN (v_quota.current_users + p_increment) <= v_quota.max_users;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check user quota
CREATE OR REPLACE FUNCTION check_user_quota(
  p_user_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS BOOLEAN AS $$
DECLARE
  v_quota user_quotas%ROWTYPE;
BEGIN
  SELECT * INTO v_quota FROM user_quotas WHERE user_id = p_user_id;
  
  IF NOT FOUND THEN
    -- Create default quota if not exists
    INSERT INTO user_quotas (user_id) VALUES (p_user_id);
    RETURN TRUE;
  END IF;
  
  -- Reset counters if needed
  IF v_quota.hour_reset_at < NOW() THEN
    UPDATE user_quotas SET
      tickets_created_this_hour = 0,
      messages_sent_this_hour = 0,
      api_calls_this_hour = 0,
      hour_reset_at = NOW() + INTERVAL '1 hour'
    WHERE user_id = p_user_id;
    v_quota.tickets_created_this_hour = 0;
    v_quota.messages_sent_this_hour = 0;
    v_quota.api_calls_this_hour = 0;
  END IF;
  
  IF v_quota.day_reset_at < NOW() THEN
    UPDATE user_quotas SET
      tickets_created_today = 0,
      day_reset_at = NOW() + INTERVAL '1 day'
    WHERE user_id = p_user_id;
    v_quota.tickets_created_today = 0;
  END IF;
  
  CASE p_quota_type
    WHEN 'tickets_hour' THEN
      RETURN (v_quota.tickets_created_this_hour + p_increment) <= v_quota.max_tickets_per_hour;
    WHEN 'tickets_day' THEN
      RETURN (v_quota.tickets_created_today + p_increment) <= v_quota.max_tickets_per_day;
    WHEN 'messages_hour' THEN
      RETURN (v_quota.messages_sent_this_hour + p_increment) <= v_quota.max_messages_per_hour;
    WHEN 'api_calls_hour' THEN
      RETURN (v_quota.api_calls_this_hour + p_increment) <= v_quota.max_api_calls_per_hour;
    ELSE
      RETURN FALSE;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment quota usage
CREATE OR REPLACE FUNCTION increment_quota_usage(
  p_user_id UUID,
  p_organization_id UUID,
  p_quota_type TEXT,
  p_increment INTEGER DEFAULT 1
) RETURNS VOID AS $$
BEGIN
  -- Update organization quota
  IF p_organization_id IS NOT NULL THEN
    CASE p_quota_type
      WHEN 'tickets' THEN
        UPDATE organization_quotas 
        SET current_tickets = current_tickets + p_increment,
            updated_at = NOW()
        WHERE organization_id = p_organization_id;
      WHEN 'active_tickets' THEN
        UPDATE organization_quotas 
        SET current_active_tickets = current_active_tickets + p_increment,
            updated_at = NOW()
        WHERE organization_id = p_organization_id;
    END CASE;
  END IF;
  
  -- Update user quota
  IF p_user_id IS NOT NULL THEN
    CASE p_quota_type
      WHEN 'tickets' THEN
        UPDATE user_quotas 
        SET tickets_created_this_hour = tickets_created_this_hour + p_increment,
            tickets_created_today = tickets_created_today + p_increment,
            updated_at = NOW()
        WHERE user_id = p_user_id;
      WHEN 'messages' THEN
        UPDATE user_quotas 
        SET messages_sent_this_hour = messages_sent_this_hour + p_increment,
            updated_at = NOW()
        WHERE user_id = p_user_id;
      WHEN 'api_calls' THEN
        UPDATE user_quotas 
        SET api_calls_this_hour = api_calls_this_hour + p_increment,
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END CASE;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to check quota before creating ticket
CREATE OR REPLACE FUNCTION check_ticket_quota_before_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_org_id UUID;
  v_can_create BOOLEAN;
BEGIN
  -- Get user and organization from the ticket
  v_user_id := NEW.created_by;
  v_org_id := NEW.organization_id;
  
  -- Check organization quota
  IF v_org_id IS NOT NULL THEN
    v_can_create := check_organization_quota(v_org_id, 'active_tickets', 1);
    IF NOT v_can_create THEN
      INSERT INTO quota_violations (
        organization_id, quota_type, limit_value, attempted_value, action
      ) VALUES (
        v_org_id, 'active_tickets', 
        (SELECT max_active_tickets FROM organization_quotas WHERE organization_id = v_org_id),
        (SELECT current_active_tickets + 1 FROM organization_quotas WHERE organization_id = v_org_id),
        'create_ticket'
      );
      RAISE EXCEPTION 'Organization ticket quota exceeded';
    END IF;
  END IF;
  
  -- Check user quota
  IF v_user_id IS NOT NULL THEN
    v_can_create := check_user_quota(v_user_id, 'tickets_hour', 1);
    IF NOT v_can_create THEN
      INSERT INTO quota_violations (
        user_id, quota_type, limit_value, attempted_value, action
      ) VALUES (
        v_user_id, 'tickets_hour',
        (SELECT max_tickets_per_hour FROM user_quotas WHERE user_id = v_user_id),
        (SELECT tickets_created_this_hour + 1 FROM user_quotas WHERE user_id = v_user_id),
        'create_ticket'
      );
      RAISE EXCEPTION 'User hourly ticket quota exceeded';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER check_ticket_quota_before_insert_trigger
  BEFORE INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION check_ticket_quota_before_insert();

-- Trigger to increment quota after ticket creation
CREATE OR REPLACE FUNCTION increment_ticket_quota_after_insert()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment quotas
  PERFORM increment_quota_usage(NEW.created_by, NEW.organization_id, 'tickets', 1);
  PERFORM increment_quota_usage(NEW.created_by, NEW.organization_id, 'active_tickets', 1);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER increment_ticket_quota_after_insert_trigger
  AFTER INSERT ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION increment_ticket_quota_after_insert();

-- Trigger to update quota when ticket is closed
CREATE OR REPLACE FUNCTION update_ticket_quota_on_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Decrement active tickets when ticket is closed/resolved
  IF OLD.status IN ('new', 'open', 'pending') AND NEW.status IN ('closed', 'resolved', 'archived') THEN
    UPDATE organization_quotas 
    SET current_active_tickets = GREATEST(0, current_active_tickets - 1)
    WHERE organization_id = NEW.organization_id;
  -- Increment active tickets when ticket is reopened
  ELSIF OLD.status IN ('closed', 'resolved', 'archived') AND NEW.status IN ('new', 'open', 'pending') THEN
    UPDATE organization_quotas 
    SET current_active_tickets = current_active_tickets + 1
    WHERE organization_id = NEW.organization_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ticket_quota_on_status_change_trigger
  AFTER UPDATE OF status ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_ticket_quota_on_status_change();

-- Add RLS policies
ALTER TABLE organization_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE quota_violations ENABLE ROW LEVEL SECURITY;

-- Policies for organization admins
CREATE POLICY "Organization admins can view their quotas" ON organization_quotas
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );

-- Policies for users
CREATE POLICY "Users can view their own quotas" ON user_quotas
  FOR SELECT USING (user_id = auth.uid());

-- Policies for quota violations (admins only)
CREATE POLICY "Organization admins can view violations" ON quota_violations
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  ); 