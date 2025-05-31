-- Seed data for development
-- This file contains initial data to help with development and testing

-- Insert default team
INSERT INTO teams (id, name, description) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Support Team', 'Default support team'),
  ('00000000-0000-0000-0000-000000000002', 'Sales Team', 'Sales and customer success team');

-- Insert test users (passwords are 'password123')
-- Note: In production, users should be created through Supabase Auth
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at) VALUES
  ('00000000-0000-0000-0000-000000000101', 'admin@zynlo.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000102', 'agent1@zynlo.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW()),
  ('00000000-0000-0000-0000-000000000103', 'agent2@zynlo.com', crypt('password123', gen_salt('bf')), NOW(), NOW(), NOW());

-- Insert user profiles
INSERT INTO users (id, email, full_name, team_id, role) VALUES
  ('00000000-0000-0000-0000-000000000101', 'admin@zynlo.com', 'Admin User', '00000000-0000-0000-0000-000000000001', 'admin'),
  ('00000000-0000-0000-0000-000000000102', 'agent1@zynlo.com', 'Support Agent 1', '00000000-0000-0000-0000-000000000001', 'agent'),
  ('00000000-0000-0000-0000-000000000103', 'agent2@zynlo.com', 'Sales Agent 1', '00000000-0000-0000-0000-000000000002', 'agent');

-- Insert test customers
INSERT INTO customers (id, email, name, phone) VALUES
  ('00000000-0000-0000-0000-000000000201', 'john.doe@example.com', 'John Doe', '+31612345678'),
  ('00000000-0000-0000-0000-000000000202', 'jane.smith@example.com', 'Jane Smith', '+31687654321'),
  ('00000000-0000-0000-0000-000000000203', 'bob.wilson@example.com', 'Bob Wilson', '+31698765432');

-- Insert test tickets
INSERT INTO tickets (id, subject, description, status, priority, customer_id, assignee_id, team_id) VALUES
  ('00000000-0000-0000-0000-000000000301', 'Cannot login to account', 'I forgot my password and cannot reset it', 'open', 'high', '00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000302', 'Billing question', 'I was charged twice for my subscription', 'new', 'urgent', '00000000-0000-0000-0000-000000000202', NULL, '00000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000303', 'Feature request', 'Would love to have dark mode', 'pending', 'low', '00000000-0000-0000-0000-000000000203', '00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000002');

-- Insert conversations
INSERT INTO conversations (id, ticket_id, channel) VALUES
  ('00000000-0000-0000-0000-000000000401', '00000000-0000-0000-0000-000000000301', 'email'),
  ('00000000-0000-0000-0000-000000000402', '00000000-0000-0000-0000-000000000302', 'chat'),
  ('00000000-0000-0000-0000-000000000403', '00000000-0000-0000-0000-000000000303', 'email');

-- Insert messages
INSERT INTO messages (conversation_id, content, sender_type, sender_id, sender_name) VALUES
  -- Conversation 1
  ('00000000-0000-0000-0000-000000000401', 'Hi, I cannot login to my account. I tried resetting my password but the email never arrives.', 'customer', '00000000-0000-0000-0000-000000000201', 'John Doe'),
  ('00000000-0000-0000-0000-000000000401', 'Hello John, I''m sorry to hear you''re having trouble. Let me help you with that. Can you please confirm the email address associated with your account?', 'agent', '00000000-0000-0000-0000-000000000102', 'Support Agent 1'),
  ('00000000-0000-0000-0000-000000000401', 'Yes, it''s john.doe@example.com', 'customer', '00000000-0000-0000-0000-000000000201', 'John Doe'),
  
  -- Conversation 2
  ('00000000-0000-0000-0000-000000000402', 'I just noticed I was charged twice for this month. Can you please check?', 'customer', '00000000-0000-0000-0000-000000000202', 'Jane Smith'),
  
  -- Conversation 3
  ('00000000-0000-0000-0000-000000000403', 'Love your product! Any plans for a dark mode?', 'customer', '00000000-0000-0000-0000-000000000203', 'Bob Wilson'),
  ('00000000-0000-0000-0000-000000000403', 'Thanks for the suggestion! We''re actually working on dark mode and it should be available in the next release.', 'agent', '00000000-0000-0000-0000-000000000103', 'Sales Agent 1');

-- Insert some webhook logs for testing
INSERT INTO webhook_logs (channel, payload, processed) VALUES
  ('email', '{"from": "test@example.com", "subject": "Test email", "body": "This is a test"}', true),
  ('whatsapp', '{"from": "+31612345678", "message": "Hello, I need help", "timestamp": "2024-01-01T10:00:00Z"}', false);

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('attachments', 'attachments', false),
  ('avatars', 'avatars', true);

-- Set up storage policies
CREATE POLICY "Authenticated users can upload attachments" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can view attachments" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated; 