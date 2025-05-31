-- Create whatsapp_templates table
CREATE TABLE IF NOT EXISTS whatsapp_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'PENDING',
  components JSONB NOT NULL DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure unique template names per project
  CONSTRAINT unique_template_name_per_project UNIQUE (project_id, name)
);

-- Add indexes
CREATE INDEX idx_whatsapp_templates_project_id ON whatsapp_templates(project_id);
CREATE INDEX idx_whatsapp_templates_status ON whatsapp_templates(status);
CREATE INDEX idx_whatsapp_templates_category ON whatsapp_templates(category);

-- Add RLS policies
ALTER TABLE whatsapp_templates ENABLE ROW LEVEL SECURITY;

-- Policy for reading templates (users can read templates for their projects)
CREATE POLICY "Users can read WhatsApp templates for their projects"
  ON whatsapp_templates
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = whatsapp_templates.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Policy for creating templates (only admins and agents can create)
CREATE POLICY "Admins and agents can create WhatsApp templates"
  ON whatsapp_templates
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = whatsapp_templates.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('admin', 'agent')
    )
  );

-- Policy for updating templates (only admins and agents can update)
CREATE POLICY "Admins and agents can update WhatsApp templates"
  ON whatsapp_templates
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = whatsapp_templates.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role IN ('admin', 'agent')
    )
  );

-- Policy for deleting templates (only admins can delete)
CREATE POLICY "Only admins can delete WhatsApp templates"
  ON whatsapp_templates
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = whatsapp_templates.project_id
      AND project_members.user_id = auth.uid()
      AND project_members.role = 'admin'
    )
  );

-- Add trigger to update updated_at
CREATE TRIGGER update_whatsapp_templates_updated_at
  BEFORE UPDATE ON whatsapp_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 