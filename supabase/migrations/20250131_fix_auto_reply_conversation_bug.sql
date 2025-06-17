-- Fix the auto reply conversation trigger that expects customer_id in conversations table
-- This migration fixes the bug where messages cannot be created due to v_conversation.customer_id reference

-- Drop the existing trigger that causes the issue
DROP TRIGGER IF EXISTS messages_auto_reply_trigger ON messages;

-- Create a fixed version of the trigger function
CREATE OR REPLACE FUNCTION trigger_auto_reply_on_message() RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on customer messages
  IF NEW.sender_type = 'customer' THEN
    -- Get the ticket_id from the conversation
    DECLARE
      v_ticket_id UUID;
    BEGIN
      SELECT ticket_id INTO v_ticket_id FROM conversations WHERE id = NEW.conversation_id;
      
      IF v_ticket_id IS NOT NULL THEN
        -- Check for first message auto-replies
        IF NOT EXISTS (
          SELECT 1 FROM messages 
          WHERE conversation_id = NEW.conversation_id 
            AND sender_type = 'customer' 
            AND id != NEW.id
        ) THEN
          PERFORM execute_auto_reply_rules('first_message', 
            v_ticket_id,
            NEW.id, NEW.conversation_id, NEW.content);
        END IF;
        
        -- Check for keyword-based auto-replies
        PERFORM execute_auto_reply_rules('keyword_match',
          v_ticket_id,
          NEW.id, NEW.conversation_id, NEW.content);
        
        -- Check for out-of-hours auto-replies
        PERFORM execute_auto_reply_rules('out_of_hours',
          v_ticket_id,
          NEW.id, NEW.conversation_id, NEW.content);
      END IF;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER messages_auto_reply_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_reply_on_message();

-- Also fix the send_auto_reply_message function to not reference non-existent fields
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
BEGIN
  -- Get template
  SELECT * INTO v_template FROM auto_reply_templates WHERE id = p_template_id;
  
  IF v_template IS NULL THEN
    RETURN NULL;
  END IF;
  
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
  
  RETURN v_message_id;
END;
$$ LANGUAGE plpgsql; 