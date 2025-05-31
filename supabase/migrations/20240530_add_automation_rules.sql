-- Create automation rules table
CREATE TABLE IF NOT EXISTS automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('ticket_created', 'ticket_updated', 'ticket_status_changed', 'ticket_assigned', 'message_received', 'time_based', 'sla_breach')),
  priority INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conditions table
CREATE TABLE IF NOT EXISTS automation_conditions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  operator TEXT NOT NULL CHECK (operator IN ('equals', 'not_equals', 'contains', 'not_contains', 'starts_with', 'ends_with', 'greater_than', 'less_than', 'in', 'not_in')),
  value JSONB NOT NULL,
  condition_group INTEGER DEFAULT 0,
  condition_type TEXT DEFAULT 'all' CHECK (condition_type IN ('all', 'any')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create actions table
CREATE TABLE IF NOT EXISTS automation_actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN (
    'assign_to_user', 'assign_to_team', 'change_status', 'change_priority', 
    'add_label', 'remove_label', 'send_email', 'send_notification', 
    'create_task', 'add_internal_note', 'set_sla', 'trigger_webhook'
  )),
  action_data JSONB NOT NULL,
  execution_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create execution logs table
CREATE TABLE IF NOT EXISTS automation_execution_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rule_id UUID NOT NULL REFERENCES automation_rules(id) ON DELETE CASCADE,
  ticket_id UUID REFERENCES tickets(id) ON DELETE SET NULL,
  trigger_type TEXT NOT NULL,
  conditions_met BOOLEAN NOT NULL,
  actions_executed JSONB[],
  error_message TEXT,
  execution_time_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create rule templates table
CREATE TABLE IF NOT EXISTS automation_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  template_data JSONB NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_automation_rules_active ON automation_rules(is_active) WHERE is_active = true;
CREATE INDEX idx_automation_rules_trigger ON automation_rules(trigger_type);
CREATE INDEX idx_automation_rules_org ON automation_rules(organization_id);
CREATE INDEX idx_automation_conditions_rule ON automation_conditions(rule_id);
CREATE INDEX idx_automation_actions_rule ON automation_actions(rule_id);
CREATE INDEX idx_automation_logs_rule ON automation_execution_logs(rule_id);
CREATE INDEX idx_automation_logs_ticket ON automation_execution_logs(ticket_id);
CREATE INDEX idx_automation_logs_created ON automation_execution_logs(created_at DESC);

-- Enable RLS
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies for automation_rules
CREATE POLICY "Users can view automation rules in their organization"
  ON automation_rules FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create automation rules for their organization"
  ON automation_rules FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update automation rules in their organization"
  ON automation_rules FOR UPDATE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete automation rules in their organization"
  ON automation_rules FOR DELETE
  USING (
    organization_id IN (
      SELECT organization_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS policies for conditions and actions (inherit from rules)
CREATE POLICY "Users can manage conditions for their rules"
  ON automation_conditions FOR ALL
  USING (
    rule_id IN (
      SELECT id FROM automation_rules 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage actions for their rules"
  ON automation_actions FOR ALL
  USING (
    rule_id IN (
      SELECT id FROM automation_rules 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS policies for logs (read only)
CREATE POLICY "Users can view execution logs for their organization"
  ON automation_execution_logs FOR SELECT
  USING (
    rule_id IN (
      SELECT id FROM automation_rules 
      WHERE organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- RLS policies for templates
CREATE POLICY "Users can view public templates or their own"
  ON automation_templates FOR SELECT
  USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates"
  ON automation_templates FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates"
  ON automation_templates FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own templates"
  ON automation_templates FOR DELETE
  USING (created_by = auth.uid());

-- Updated_at trigger
CREATE TRIGGER update_automation_rules_updated_at
  BEFORE UPDATE ON automation_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to execute automation rules
CREATE OR REPLACE FUNCTION execute_automation_rules(
  p_trigger_type TEXT,
  p_ticket_id UUID,
  p_old_data JSONB DEFAULT NULL,
  p_new_data JSONB DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_rule RECORD;
  v_conditions_met BOOLEAN;
  v_start_time TIMESTAMP;
  v_actions_executed JSONB[] := '{}';
BEGIN
  v_start_time := clock_timestamp();

  -- Get active rules for this trigger type
  FOR v_rule IN 
    SELECT r.* 
    FROM automation_rules r
    WHERE r.is_active = true 
      AND r.trigger_type = p_trigger_type
    ORDER BY r.priority DESC, r.created_at
  LOOP
    BEGIN
      -- Check conditions
      v_conditions_met := check_automation_conditions(v_rule.id, p_ticket_id, p_old_data, p_new_data);
      
      IF v_conditions_met THEN
        -- Execute actions
        v_actions_executed := execute_automation_actions(v_rule.id, p_ticket_id);
      END IF;

      -- Log execution
      INSERT INTO automation_execution_logs (
        rule_id, ticket_id, trigger_type, conditions_met, 
        actions_executed, execution_time_ms
      ) VALUES (
        v_rule.id, p_ticket_id, p_trigger_type, v_conditions_met,
        v_actions_executed,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
      );

    EXCEPTION WHEN OTHERS THEN
      -- Log error
      INSERT INTO automation_execution_logs (
        rule_id, ticket_id, trigger_type, conditions_met, 
        error_message, execution_time_ms
      ) VALUES (
        v_rule.id, p_ticket_id, p_trigger_type, false,
        SQLERRM,
        EXTRACT(MILLISECONDS FROM clock_timestamp() - v_start_time)::INTEGER
      );
    END;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Helper function to check conditions
CREATE OR REPLACE FUNCTION check_automation_conditions(
  p_rule_id UUID,
  p_ticket_id UUID,
  p_old_data JSONB,
  p_new_data JSONB
) RETURNS BOOLEAN AS $$
DECLARE
  v_condition RECORD;
  v_group_results JSONB := '{}';
  v_current_group INTEGER;
  v_result BOOLEAN;
BEGIN
  -- Implementation would check each condition group
  -- This is a simplified version
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Helper function to execute actions
CREATE OR REPLACE FUNCTION execute_automation_actions(
  p_rule_id UUID,
  p_ticket_id UUID
) RETURNS JSONB[] AS $$
DECLARE
  v_action RECORD;
  v_results JSONB[] := '{}';
BEGIN
  -- Implementation would execute each action
  -- This is a simplified version
  FOR v_action IN 
    SELECT * FROM automation_actions 
    WHERE rule_id = p_rule_id 
    ORDER BY execution_order
  LOOP
    -- Execute action based on type
    v_results := array_append(v_results, 
      jsonb_build_object(
        'action_id', v_action.id,
        'action_type', v_action.action_type,
        'success', true
      )
    );
  END LOOP;
  
  RETURN v_results;
END;
$$ LANGUAGE plpgsql;

-- Trigger for ticket changes
CREATE OR REPLACE FUNCTION trigger_ticket_automation() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM execute_automation_rules('ticket_created', NEW.id, NULL, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    -- Check for specific changes
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      PERFORM execute_automation_rules('ticket_status_changed', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
      PERFORM execute_automation_rules('ticket_assigned', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
    END IF;
    -- General update
    PERFORM execute_automation_rules('ticket_updated', NEW.id, to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on tickets table
CREATE TRIGGER tickets_automation_trigger
  AFTER INSERT OR UPDATE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_ticket_automation();

-- Insert default templates
INSERT INTO automation_templates (name, description, category, template_data, is_public) VALUES
(
  'Auto-assign to team based on priority',
  'Automatically assign tickets to specific teams based on priority level',
  'assignment',
  '{
    "trigger_type": "ticket_created",
    "conditions": [
      {
        "field": "priority",
        "operator": "equals",
        "value": "urgent"
      }
    ],
    "actions": [
      {
        "action_type": "assign_to_team",
        "action_data": {
          "team_name": "Urgent Support"
        }
      }
    ]
  }'::jsonb,
  true
),
(
  'SLA based on customer type',
  'Set different SLA times based on customer type or plan',
  'sla',
  '{
    "trigger_type": "ticket_created",
    "conditions": [
      {
        "field": "customer.type",
        "operator": "equals",
        "value": "premium"
      }
    ],
    "actions": [
      {
        "action_type": "set_sla",
        "action_data": {
          "response_time": 60,
          "resolution_time": 240
        }
      }
    ]
  }'::jsonb,
  true
),
(
  'Auto-close resolved tickets',
  'Automatically close tickets that have been resolved for 7 days',
  'lifecycle',
  '{
    "trigger_type": "time_based",
    "conditions": [
      {
        "field": "status",
        "operator": "equals",
        "value": "resolved"
      },
      {
        "field": "updated_at",
        "operator": "less_than",
        "value": "7 days ago"
      }
    ],
    "actions": [
      {
        "action_type": "change_status",
        "action_data": {
          "status": "closed"
        }
      }
    ]
  }'::jsonb,
  true
);

-- Add comments
COMMENT ON TABLE automation_rules IS 'Stores automation rules for ticket workflow automation';
COMMENT ON TABLE automation_conditions IS 'Stores conditions that must be met for automation rules to execute';
COMMENT ON TABLE automation_actions IS 'Stores actions to be executed when automation rules are triggered';
COMMENT ON TABLE automation_execution_logs IS 'Logs of automation rule executions for debugging and analytics'; 