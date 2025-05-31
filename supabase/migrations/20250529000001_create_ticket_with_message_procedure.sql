-- Create the missing stored procedure for creating tickets with messages
CREATE OR REPLACE FUNCTION create_ticket_with_message(
  p_subject TEXT,
  p_content TEXT,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_channel TEXT DEFAULT 'email',
  p_priority TEXT DEFAULT 'normal'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_customer_id UUID;
  v_ticket_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Find or create customer
  SELECT id INTO v_customer_id
  FROM customers 
  WHERE email = p_customer_email;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (email, name)
    VALUES (p_customer_email, p_customer_name)
    RETURNING id INTO v_customer_id;
  END IF;

  -- Create ticket
  INSERT INTO tickets (
    subject,
    customer_id,
    status,
    priority,
    created_at,
    updated_at
  ) VALUES (
    p_subject,
    v_customer_id,
    'new',
    p_priority::ticket_priority,
    NOW(),
    NOW()
  ) RETURNING id INTO v_ticket_id;

  -- Create conversation
  INSERT INTO conversations (
    ticket_id,
    channel,
    created_at
  ) VALUES (
    v_ticket_id,
    p_channel::channel_type,
    NOW()
  ) RETURNING id INTO v_conversation_id;

  -- Create initial message
  INSERT INTO messages (
    conversation_id,
    content,
    sender_type,
    sender_id,
    created_at
  ) VALUES (
    v_conversation_id,
    p_content,
    'customer',
    p_customer_email,
    NOW()
  );

  RETURN v_ticket_id;
END;
$$; 