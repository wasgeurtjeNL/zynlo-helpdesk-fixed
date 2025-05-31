-- Create email_templates table for storing reusable email templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'support',
  variables TEXT[] DEFAULT '{}',
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_email_templates_user_id ON email_templates(user_id);
CREATE INDEX idx_email_templates_category ON email_templates(category);
CREATE INDEX idx_email_templates_public ON email_templates(is_public) WHERE is_public = true;

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own templates and public templates"
  ON email_templates FOR SELECT
  USING (auth.uid() = user_id OR is_public = true);

CREATE POLICY "Users can create their own templates"
  ON email_templates FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own templates"
  ON email_templates FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own templates"
  ON email_templates FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER update_email_templates_updated_at
  BEFORE UPDATE ON email_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create some default templates
INSERT INTO email_templates (user_id, name, subject, content, category, variables, is_public) VALUES
-- Welcome template
(
  (SELECT id FROM auth.users LIMIT 1),
  'Welcome Email',
  'Welcome to {{company_name}} Support',
  '<p>Hi {{customer_name}},</p><p>Welcome to our support system! We''re here to help you with any questions or issues you may have.</p><p>Your ticket #{{ticket_number}} has been created and we''ll get back to you as soon as possible.</p><p>Best regards,<br>{{agent_name}}<br>{{company_name}} Support Team</p>',
  'welcome',
  ARRAY['{{customer_name}}', '{{company_name}}', '{{ticket_number}}', '{{agent_name}}'],
  true
),
-- Support response template
(
  (SELECT id FROM auth.users LIMIT 1),
  'Support Response',
  'Re: {{ticket_subject}} - Ticket #{{ticket_number}}',
  '<p>Hi {{customer_name}},</p><p>Thank you for contacting us regarding your issue.</p><p>[Your response here]</p><p>Please let us know if you need any further assistance.</p><p>Best regards,<br>{{agent_name}}<br>{{company_name}} Support Team</p>',
  'support',
  ARRAY['{{customer_name}}', '{{ticket_subject}}', '{{ticket_number}}', '{{agent_name}}', '{{company_name}}'],
  true
),
-- Issue resolved template
(
  (SELECT id FROM auth.users LIMIT 1),
  'Issue Resolved',
  'Resolved: {{ticket_subject}} - Ticket #{{ticket_number}}',
  '<p>Hi {{customer_name}},</p><p>Great news! We''ve resolved the issue you reported.</p><p>[Explain solution here]</p><p>We''re marking this ticket as resolved. If you experience any further issues, please don''t hesitate to reach out.</p><p>Best regards,<br>{{agent_name}}<br>{{company_name}} Support Team</p>',
  'closing',
  ARRAY['{{customer_name}}', '{{ticket_subject}}', '{{ticket_number}}', '{{agent_name}}', '{{company_name}}'],
  true
);

-- Add comment
COMMENT ON TABLE email_templates IS 'Stores reusable email templates with variable substitution support';
COMMENT ON COLUMN email_templates.variables IS 'Array of variable placeholders used in the template (e.g., {{customer_name}})'; 