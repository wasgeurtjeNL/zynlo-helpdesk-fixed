-- Fix cascade deletes for tickets
-- Drop existing foreign key constraints and recreate with CASCADE

-- First, update conversations foreign key to cascade on delete
ALTER TABLE conversations 
DROP CONSTRAINT IF EXISTS conversations_ticket_id_fkey;

ALTER TABLE conversations
ADD CONSTRAINT conversations_ticket_id_fkey 
FOREIGN KEY (ticket_id) 
REFERENCES tickets(id) 
ON DELETE CASCADE;

-- Update messages foreign key to cascade on delete
ALTER TABLE messages
DROP CONSTRAINT IF EXISTS messages_conversation_id_fkey;

ALTER TABLE messages
ADD CONSTRAINT messages_conversation_id_fkey
FOREIGN KEY (conversation_id)
REFERENCES conversations(id)
ON DELETE CASCADE;

-- Update ticket_labels foreign key to cascade on delete
ALTER TABLE ticket_labels
DROP CONSTRAINT IF EXISTS ticket_labels_ticket_id_fkey;

ALTER TABLE ticket_labels
ADD CONSTRAINT ticket_labels_ticket_id_fkey
FOREIGN KEY (ticket_id)
REFERENCES tickets(id)
ON DELETE CASCADE;

-- Update message_attachments foreign key to cascade on delete
ALTER TABLE message_attachments
DROP CONSTRAINT IF EXISTS message_attachments_message_id_fkey;

ALTER TABLE message_attachments
ADD CONSTRAINT message_attachments_message_id_fkey
FOREIGN KEY (message_id)
REFERENCES messages(id)
ON DELETE CASCADE;

-- Update message_drafts foreign key to cascade on delete
ALTER TABLE message_drafts
DROP CONSTRAINT IF EXISTS message_drafts_ticket_id_fkey;

ALTER TABLE message_drafts
ADD CONSTRAINT message_drafts_ticket_id_fkey
FOREIGN KEY (ticket_id)
REFERENCES tickets(id)
ON DELETE CASCADE;

-- Create or replace RLS policy for deleting tickets
DROP POLICY IF EXISTS "Agents can delete tickets" ON tickets;
CREATE POLICY "Agents can delete tickets" ON tickets
FOR DELETE
TO authenticated
USING (
  -- User must be an active agent
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('agent', 'admin')
    AND users.is_active = true
  )
);

-- Create or replace RLS policy for deleting conversations (handled by cascade)
DROP POLICY IF EXISTS "Agents can delete conversations" ON conversations;
CREATE POLICY "Agents can delete conversations" ON conversations
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('agent', 'admin')
    AND users.is_active = true
  )
);

-- Create or replace RLS policy for deleting messages (handled by cascade)
DROP POLICY IF EXISTS "Agents can delete messages" ON messages;
CREATE POLICY "Agents can delete messages" ON messages
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role IN ('agent', 'admin')
    AND users.is_active = true
  )
); 