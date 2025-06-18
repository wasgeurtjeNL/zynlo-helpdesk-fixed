-- Final fix for auto-reply trigger - handles missing customer_id properly
-- This migration ensures auto-replies work again by properly joining with tickets table

-- Drop the broken trigger
DROP TRIGGER IF EXISTS messages_auto_reply_trigger ON messages;

-- Drop and recreate the trigger function with proper error handling
CREATE OR REPLACE FUNCTION trigger_auto_reply_on_message() RETURNS TRIGGER AS $$
DECLARE
  v_ticket_id UUID;
  v_ticket RECORD;
  v_customer RECORD;
BEGIN
  -- Only trigger on customer messages
  IF NEW.sender_type = 'customer' THEN
    -- Get the ticket_id from conversation
    SELECT ticket_id INTO v_ticket_id FROM conversations WHERE id = NEW.conversation_id;
    
    IF v_ticket_id IS NOT NULL THEN
      -- Get ticket details
      SELECT * INTO v_ticket FROM tickets WHERE id = v_ticket_id;
      
      -- Get customer details
      IF v_ticket.customer_id IS NOT NULL THEN
        SELECT * INTO v_customer FROM customers WHERE id = v_ticket.customer_id;
      END IF;
      
      -- Check for first message auto-replies
      IF NOT EXISTS (
        SELECT 1 FROM messages 
        WHERE conversation_id = NEW.conversation_id 
          AND sender_type = 'customer' 
          AND id != NEW.id
      ) THEN
        -- Debug log
        RAISE NOTICE 'Auto-reply: First message detected for ticket % conversation %', v_ticket.number, NEW.conversation_id;
        
        -- Execute auto-reply rules
        PERFORM execute_auto_reply_rules(
          'first_message', 
          v_ticket_id,
          NEW.id, 
          NEW.conversation_id, 
          NEW.content
        );
      END IF;
      
      -- Check for keyword-based auto-replies
      PERFORM execute_auto_reply_rules(
        'keyword_match',
        v_ticket_id,
        NEW.id, 
        NEW.conversation_id, 
        NEW.content
      );
      
      -- Check for out-of-hours auto-replies
      PERFORM execute_auto_reply_rules(
        'out_of_hours',
        v_ticket_id,
        NEW.id, 
        NEW.conversation_id, 
        NEW.content
      );
    END IF;
  END IF;
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the trigger
  RAISE NOTICE 'Auto-reply trigger error: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER messages_auto_reply_trigger
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_reply_on_message();

-- Also ensure the execute_auto_reply_rules function handles missing data gracefully
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
  v_message_sent UUID;
BEGIN
  v_start_time := clock_timestamp();

  -- Get ticket and customer info
  SELECT * INTO v_ticket FROM tickets WHERE id = p_ticket_id;
  IF v_ticket.customer_id IS NOT NULL THEN
    SELECT * INTO v_customer FROM customers WHERE id = v_ticket.customer_id;
  END IF;
  SELECT * INTO v_conversation FROM conversations WHERE id = p_conversation_id;

  -- Debug log
  RAISE NOTICE 'Execute auto-reply: type=%, ticket=%, conversation=%', p_trigger_type, v_ticket.number, p_conversation_id;

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
      
      RAISE NOTICE 'Auto-reply rule % should_send=% conditions_met=%', v_rule.name, v_should_send, v_conditions_met;
      
      IF v_should_send AND v_conditions_met THEN
        -- Get template for the rule (prefer customer's language or default to first template)
        SELECT * INTO v_template 
        FROM auto_reply_templates 
        WHERE rule_id = v_rule.id 
        ORDER BY CASE WHEN language = COALESCE(v_customer.metadata->>'language', 'nl') THEN 0 ELSE 1 END,
                 execution_order
        LIMIT 1;
        
        IF v_template IS NOT NULL THEN
          RAISE NOTICE 'Sending auto-reply with template %', v_template.id;
          
          -- Send the auto-reply
          v_message_sent := send_auto_reply_message(
            p_ticket_id,
            p_conversation_id,
            v_template.id,
            v_customer,
            v_ticket
          );
          
          RAISE NOTICE 'Auto-reply message created: %', v_message_sent;
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
      RAISE NOTICE 'Auto-reply rule % error: %', v_rule.name, SQLERRM;
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

-- Test the fix by creating a test message for ticket 617
DO $$
DECLARE
  v_test_conversation_id UUID;
  v_test_message_id UUID;
BEGIN
  -- Get conversation for ticket 617
  SELECT id INTO v_test_conversation_id FROM conversations WHERE ticket_id = (SELECT id FROM tickets WHERE number = 617);
  
  IF v_test_conversation_id IS NOT NULL THEN
    -- Create a test customer message to trigger auto-reply
    INSERT INTO messages (
      conversation_id,
      content,
      sender_type,
      sender_id,
      metadata
    ) VALUES (
      v_test_conversation_id,
      'Test message to trigger auto-reply',
      'customer',
      'test@example.com',
      '{"test": true}'::jsonb
    ) RETURNING id INTO v_test_message_id;
    
    RAISE NOTICE 'Test message created: % for conversation %', v_test_message_id, v_test_conversation_id;
    
    -- Check if auto-reply was created
    PERFORM pg_sleep(1);
    IF EXISTS (
      SELECT 1 FROM messages 
      WHERE conversation_id = v_test_conversation_id 
      AND sender_type = 'system' 
      AND metadata->>'auto_reply' = 'true'
      AND created_at > NOW() - INTERVAL '5 seconds'
    ) THEN
      RAISE NOTICE 'SUCCESS: Auto-reply was created!';
      -- Clean up test message
      DELETE FROM messages WHERE id = v_test_message_id;
    ELSE
      RAISE NOTICE 'FAILED: No auto-reply created';
    END IF;
  END IF;
END $$; 