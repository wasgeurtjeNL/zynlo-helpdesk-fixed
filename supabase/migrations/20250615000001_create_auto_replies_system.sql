-- Create auto-replies system for Zynlo ticketing system
-- This migration creates tables for managing automatic replies

-- Create auto_reply_rules table
CREATE TABLE IF NOT EXISTS auto_reply_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('first_message', 'keyword_match', 'out_of_hours', 'channel_specific', 'priority_based')),
  priority INTEGER DEFAULT 0,
  channel_types TEXT[] DEFAULT '{}', -- Array of channel types ['email', 'whatsapp', 'chat']
  business_hours JSONB DEFAULT '{"enabled": false}', -- Business hours configuration
  keywords TEXT[] DEFAULT '{}', -- Keywords that trigger the auto-reply
  keyword_match_type TEXT DEFAULT 'any' CHECK (keyword_match_type IN ('any', 'all', 'exact')),
  created_by UUID REFERENCES auth.users(id),
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create auto_reply_conditions table
CREATE TABLE IF NOT EXISTS auto_reply_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES auto_reply_rules(id) ON DELETE CASCADE,
  field TEXT NOT NULL, -- customer.type, ticket.priority, message.content, etc.
  operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'in', 'not_in')),
  value JSONB NOT NULL,
  condition_group INTEGER DEFAULT 0,
  condition_type TEXT DEFAULT 'all' CHECK (condition_type IN ('all', 'any')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create auto_reply_templates table  
CREATE TABLE IF NOT EXISTS auto_reply_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES auto_reply_rules(id) ON DELETE CASCADE,
  language TEXT DEFAULT 'nl',
  subject_template TEXT,
  content_template TEXT NOT NULL,
  content_type TEXT DEFAULT 'text/html' CHECK (content_type IN ('text/plain', 'text/html')),
  variables JSONB DEFAULT '{}', -- Available template variables
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create auto_reply_execution_logs table
CREATE TABLE IF NOT EXISTS auto_reply_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES auto_reply_rules(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  conditions_met BOOLEAN NOT NULL,
  template_used UUID REFERENCES auto_reply_templates(id),
  sent_message_id UUID REFERENCES messages(id) ON DELETE SET NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  response_sent BOOLEAN DEFAULT false,
  error_message TEXT,
  execution_time_ms INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_auto_reply_rules_active ON auto_reply_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_auto_reply_rules_trigger ON auto_reply_rules(trigger_type);
CREATE INDEX idx_auto_reply_rules_org ON auto_reply_rules(organization_id);
CREATE INDEX idx_auto_reply_conditions_rule ON auto_reply_conditions(rule_id);
CREATE INDEX idx_auto_reply_templates_rule ON auto_reply_templates(rule_id);
CREATE INDEX idx_auto_reply_logs_rule ON auto_reply_execution_logs(rule_id);
CREATE INDEX idx_auto_reply_logs_ticket ON auto_reply_execution_logs(ticket_id);
CREATE INDEX idx_auto_reply_logs_created ON auto_reply_execution_logs(created_at DESC);

-- Enable RLS
ALTER TABLE auto_reply_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reply_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reply_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE auto_reply_execution_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for auto_reply_rules
CREATE POLICY "Users can view auto reply rules in their organization"
  ON auto_reply_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create auto reply rules for their organization"
  ON auto_reply_rules FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update auto reply rules in their organization"
  ON auto_reply_rules FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete auto reply rules in their organization"
  ON auto_reply_rules FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS policies for conditions and templates (inherit from rules)
CREATE POLICY "Users can manage conditions for their auto reply rules"
  ON auto_reply_conditions FOR ALL
  USING (
    rule_id IN (
      SELECT id FROM auto_reply_rules 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage templates for their auto reply rules"
  ON auto_reply_templates FOR ALL
  USING (
    rule_id IN (
      SELECT id FROM auto_reply_rules 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS policies for logs (read only)
CREATE POLICY "Users can view auto reply logs for their organization"
  ON auto_reply_execution_logs FOR SELECT
  USING (
    rule_id IN (
      SELECT id FROM auto_reply_rules 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_auto_reply_rules_updated_at
  BEFORE UPDATE ON auto_reply_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_auto_reply_templates_updated_at
  BEFORE UPDATE ON auto_reply_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to check if it's business hours
CREATE OR REPLACE FUNCTION is_business_hours(
  business_hours_config JSONB,
  check_time TIMESTAMPTZ DEFAULT NOW()
) RETURNS BOOLEAN AS $$
DECLARE
  day_of_week INTEGER;
  current_time TIME;
  start_time TIME;
  end_time TIME;
  day_config JSONB;
BEGIN
  -- If business hours are not enabled, return true
  IF NOT (business_hours_config->>'enabled')::BOOLEAN THEN
    RETURN true;
  END IF;
  
  -- Get day of week (0 = Sunday, 1 = Monday, etc.)
  day_of_week := EXTRACT(DOW FROM check_time);
  current_time := check_time::TIME;
  
  -- Get day configuration
  CASE day_of_week
    WHEN 0 THEN day_config := business_hours_config->'sunday';
    WHEN 1 THEN day_config := business_hours_config->'monday';
    WHEN 2 THEN day_config := business_hours_config->'tuesday';
    WHEN 3 THEN day_config := business_hours_config->'wednesday';
    WHEN 4 THEN day_config := business_hours_config->'thursday';
    WHEN 5 THEN day_config := business_hours_config->'friday';
    WHEN 6 THEN day_config := business_hours_config->'saturday';
  END CASE;
  
  -- If day config doesn't exist or is not enabled, it's outside business hours
  IF day_config IS NULL OR NOT (day_config->>'enabled')::BOOLEAN THEN
    RETURN false;
  END IF;
  
  -- Check time range
  start_time := (day_config->>'start')::TIME;
  end_time := (day_config->>'end')::TIME;
  
  RETURN current_time BETWEEN start_time AND end_time;
END;
$$ LANGUAGE plpgsql;

-- Function to execute auto-reply rules
CREATE OR REPLACE FUNCTION execute_auto_reply_rules(
  p_trigger_type TEXT,
  p_ticket_id UUID,
  p_message_id UUID DEFAULT NULL,
  p_conversation_id UUID DEFAULT NULL,
  p_message_content TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_rule RECORD;
  v_conditions_met BOOLEAN;
  v_start_time TIMESTAMP;
  v_template RECORD;
  v_should_send BOOLEAN;
  v_customer RECORD;
  v_ticket RECORD;
  v_conversation RECORD;
BEGIN
  v_start_time := clock_timestamp();

  -- Get ticket and customer info
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  SELECT * INTO v_customer FROM customers WHERE id = v_ticket.customer_id;
  SELECT * INTO v_conversation FROM conversations WHERE id = p_conversation_id;

  -- Get active auto-reply rules for this trigger type
  FOR v_rule IN 
    SELECT r.* 
    FROM auto_reply_rules r
    WHERE r.is_active = true 
      AND r.trigger_type = p_trigger_type
      AND (r.channel_types = '{}' OR v_conversation.channel = ANY(r.channel_types))
    ORDER BY r.priority DESC, r.created_at
  LOOP
    BEGIN
      v_should_send := true;
      
      -- Check business hours if rule has business hours restrictions
      IF p_trigger_type = 'out_of_hours' THEN
        v_should_send := NOT is_business_hours(v_rule.business_hours);
      ELSIF v_rule.business_hours->>'enabled' = 'true' THEN
        v_should_send := is_business_hours(v_rule.business_hours);
      END IF;
      
      -- Check keyword matching if applicable
      IF p_trigger_type = 'keyword_match' AND array_length(v_rule.keywords, 1) > 0 THEN
        v_should_send := false;
        
        IF v_rule.keyword_match_type = 'any' THEN
          -- Check if any keyword is found
          FOR i IN 1..array_length(v_rule.keywords, 1) LOOP
            IF p_message_content ILIKE '%' || v_rule.keywords[i] || '%' THEN
              v_should_send := true;
              EXIT;
            END IF;
          END LOOP;
        ELSIF v_rule.keyword_match_type = 'all' THEN
          -- Check if all keywords are found
          v_should_send := true;
          FOR i IN 1..array_length(v_rule.keywords, 1) LOOP
            IF p_message_content NOT ILIKE '%' || v_rule.keywords[i] || '%' THEN
              v_should_send := false;
              EXIT;
            END IF;
          END LOOP;
        ELSIF v_rule.keyword_match_type = 'exact' THEN
          -- Check for exact match
          IF LOWER(p_message_content) = ANY(SELECT LOWER(keyword) FROM unnest(v_rule.keywords) AS keyword) THEN
            v_should_send := true;
          END IF;
        END IF;
      END IF;
      
      -- Check additional conditions
      v_conditions_met := check_auto_reply_conditions(v_rule.id, p_ticket_id, p_message_id);
      
      IF v_should_send AND v_conditions_met THEN
        -- Get template for the rule (prefer customer's language or default to first template)
        SELECT * INTO v_template 
        FROM auto_reply_templates 
        WHERE rule_id = v_rule.id 
        ORDER BY CASE WHEN language = COALESCE(v_customer.metadata->>'language', 'nl') THEN 0 ELSE 1 END,
                 execution_order
        LIMIT 1;
        
        IF v_template IS NOT NULL THEN
          -- Send the auto-reply
          PERFORM send_auto_reply_message(
            p_ticket_id,
            p_conversation_id,
            v_template.id,
            v_customer,
            v_ticket
          );
        END IF;
      END IF;

      -- Log execution
      INSERT INTO auto_reply_execution_logs (
        rule_id, ticket_id, message_id, conversation_id, trigger_type, 
        conditions_met, template_used, response_sent, execution_time_ms
      ) VALUES (
        v_rule.id, p_ticket_id, p_message_id, p_conversation_id, p_trigger_type,
        v_conditions_met AND v_should_send,
        v_template.id,
        v_conditions_met AND v_should_send AND v_template IS NOT NULL,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
      );

    EXCEPTION WHEN OTHERS THEN
      -- Log error
      INSERT INTO auto_reply_execution_logs (
        rule_id, ticket_id, message_id, conversation_id, trigger_type, 
        conditions_met, error_message, execution_time_ms
      ) VALUES (
        v_rule.id, p_ticket_id, p_message_id, p_conversation_id, p_trigger_type,
        false, SQLERRM,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
      );
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check conditions
CREATE OR REPLACE FUNCTION check_auto_reply_conditions(
  p_rule_id UUID,
  p_ticket_id UUID,
  p_message_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_condition RECORD;
  v_ticket RECORD;
  v_customer RECORD;
  v_message RECORD;
  v_result BOOLEAN := true;
BEGIN
  -- Get related data
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  SELECT * INTO v_customer FROM customers WHERE id = v_ticket.customer_id;
  
  IF p_message_id IS NOT NULL THEN
    SELECT * INTO v_message FROM messages WHERE id = p_message_id;
  END IF;
  
  -- Check each condition
  FOR v_condition IN 
    SELECT * FROM auto_reply_conditions 
    WHERE rule_id = p_rule_id 
    ORDER BY condition_group, id
  LOOP
    -- Simplified condition checking - can be expanded
    CASE v_condition.field
      WHEN 'ticket.status' THEN
        v_result := v_result AND (v_ticket.status::TEXT = v_condition.value->>0);
      WHEN 'ticket.priority' THEN
        v_result := v_result AND (v_ticket.priority::TEXT = v_condition.value->>0);
      WHEN 'customer.email' THEN
        v_result := v_result AND (v_customer.email = v_condition.value->>0);
      ELSE
        -- Default to true for unknown conditions
        v_result := v_result AND true;
    END CASE;
    
    -- If any condition fails and we're using AND logic, return false
    IF NOT v_result AND v_condition.condition_type = 'all' THEN
      RETURN false;
    END IF;
  END LOOP;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- Helper function to send auto-reply message
CREATE OR REPLACE FUNCTION send_auto_reply_message(
  p_ticket_id UUID,
  p_conversation_id UUID,
  p_template_id UUID,
  p_customer RECORD,
  p_ticket RECORD
) RETURNS UUID AS $$
DECLARE
  v_template RECORD;
  v_processed_content TEXT;
  v_processed_subject TEXT;
  v_message_id UUID;
  v_conversation RECORD;
BEGIN
  -- Get template
  SELECT * INTO v_template FROM auto_reply_templates WHERE id = p_template_id;
  
  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Get conversation info
  SELECT * INTO v_conversation FROM conversations WHERE id = p_conversation_id;
  
  -- Process template variables
  v_processed_content := v_template.content_template;
  v_processed_subject := COALESCE(v_template.subject_template, 'Re: ' || p_ticket.subject);
  
  -- Replace common variables
  v_processed_content := REPLACE(v_processed_content, '{{customer.name}}', COALESCE(p_customer.name, 'Klant'));
  v_processed_content := REPLACE(v_processed_content, '{{ticket.number}}', p_ticket.number::TEXT);
  v_processed_content := REPLACE(v_processed_content, '{{ticket.subject}}', p_ticket.subject);
  
  v_processed_subject := REPLACE(v_processed_subject, '{{customer.name}}', COALESCE(p_customer.name, 'Klant'));
  v_processed_subject := REPLACE(v_processed_subject, '{{ticket.number}}', p_ticket.number::TEXT);
  v_processed_subject := REPLACE(v_processed_subject, '{{ticket.subject}}', p_ticket.subject);
  
  -- Create message record
  INSERT INTO messages (
    conversation_id,
    content,
    sender_type,
    sender_id,
    sender_name,
    is_internal,
    content_type,
    metadata
  ) VALUES (
    p_conversation_id,
    v_processed_content,
    'system',
    'auto-reply-system',
    'Zynlo Auto-Reply',
    false,
    v_template.content_type,
    jsonb_build_object(
      'auto_reply', true,
      'template_id', p_template_id,
      'processed_subject', v_processed_subject
    )
  ) RETURNING id INTO v_message_id;
  
  -- For email conversations, we would trigger actual email sending here
  -- For now, we just log it
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new messages to check auto-reply rules
CREATE OR REPLACE FUNCTION trigger_auto_reply_on_message() RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on customer messages
  IF NEW.sender_type = 'customer' THEN
    -- Check for first message auto-replies
    IF NOT EXISTS (
      SELECT 1 FROM messages 
      WHERE conversation_id = NEW.conversation_id 
        AND sender_type = 'customer' 
        AND id != NEW.id
    ) THEN
      PERFORM execute_auto_reply_rules('first_message', 
        (SELECT ticket_id FROM conversations WHERE id = NEW.conversation_id),
        NEW.id, NEW.conversation_id, NEW.content);
    END IF;
    
    -- Check for keyword-based auto-replies
    PERFORM execute_auto_reply_rules('keyword_match',
      (SELECT ticket_id FROM conversations WHERE id = NEW.conversation_id),
      NEW.id, NEW.conversation_id, NEW.content);
    
    -- Check for out-of-hours auto-replies
    PERFORM execute_auto_reply_rules('out_of_hours',
      (SELECT ticket_id FROM conversations WHERE id = NEW.conversation_id),
      NEW.id, NEW.conversation_id, NEW.content);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER messages_auto_reply_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_reply_on_message();

-- Insert default auto-reply templates
INSERT INTO auto_reply_rules (name, description, trigger_type, is_active, created_by, organization_id, business_hours) VALUES
(
  'Welcome Auto-Reply',
  'Automatic welcome message for first customer contact',
  'first_message',
  true,
  NULL,
  NULL,
  '{"enabled": false}'
),
(
  'Out of Hours Auto-Reply',
  'Automatic response when customers contact outside business hours',
  'out_of_hours',
  false,
  NULL,
  NULL,
  '{
    "enabled": true,
    "monday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "tuesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "wednesday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "thursday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "friday": {"enabled": true, "start": "09:00", "end": "17:00"},
    "saturday": {"enabled": false},
    "sunday": {"enabled": false}
  }'
);

-- Insert corresponding templates
DO $$
DECLARE
  welcome_rule_id UUID;
  out_of_hours_rule_id UUID;
BEGIN
  SELECT id INTO welcome_rule_id FROM auto_reply_rules WHERE name = 'Welcome Auto-Reply';
  SELECT id INTO out_of_hours_rule_id FROM auto_reply_rules WHERE name = 'Out of Hours Auto-Reply';
  
  INSERT INTO auto_reply_templates (rule_id, language, subject_template, content_template, content_type) VALUES
  (
    welcome_rule_id,
    'nl',
    'Welkom bij Zynlo Support - Ticket #{{ticket.number}}',
    '<p>Hallo {{customer.name}},</p>
    <p>Bedankt voor uw bericht! We hebben uw verzoek ontvangen en een ticket aangemaakt met nummer <strong>#{{ticket.number}}</strong>.</p>
    <p>Een van onze medewerkers zal zo spoedig mogelijk contact met u opnemen. Voor dringende zaken kunt u ons bellen op +31 20 123 4567.</p>
    <p>Met vriendelijke groet,<br>
    Het Zynlo Support Team</p>',
    'text/html'
  ),
  (
    welcome_rule_id,
    'en',
    'Welcome to Zynlo Support - Ticket #{{ticket.number}}',
    '<p>Hello {{customer.name}},</p>
    <p>Thank you for your message! We have received your request and created ticket <strong>#{{ticket.number}}</strong>.</p>
    <p>One of our team members will contact you as soon as possible. For urgent matters, you can call us at +31 20 123 4567.</p>
    <p>Best regards,<br>
    The Zynlo Support Team</p>',
    'text/html'
  ),
  (
    out_of_hours_rule_id,
    'nl',
    'Buiten kantooruren - Ticket #{{ticket.number}}',
    '<p>Hallo {{customer.name}},</p>
    <p>Bedankt voor uw bericht! U heeft contact opgenomen buiten onze kantooruren.</p>
    <p>Onze kantooruren zijn:</p>
    <ul>
      <li>Maandag t/m vrijdag: 09:00 - 17:00</li>
      <li>Weekend: Gesloten</li>
    </ul>
    <p>We hebben uw verzoek ontvangen en ticket <strong>#{{ticket.number}}</strong> aangemaakt. Een van onze medewerkers zal tijdens kantooruren contact met u opnemen.</p>
    <p>Voor acute problemen kunt u ons bellen op +31 20 123 4567.</p>
    <p>Met vriendelijke groet,<br>
    Het Zynlo Support Team</p>',
    'text/html'
  );
END $$;

-- Add comments
COMMENT ON TABLE auto_reply_rules IS 'Stores auto-reply rules for automated responses';
COMMENT ON TABLE auto_reply_conditions IS 'Stores conditions that must be met for auto-reply rules to execute';
COMMENT ON TABLE auto_reply_templates IS 'Stores message templates for auto-replies with multi-language support';
COMMENT ON TABLE auto_reply_execution_logs IS 'Logs of auto-reply rule executions for debugging and analytics'; 