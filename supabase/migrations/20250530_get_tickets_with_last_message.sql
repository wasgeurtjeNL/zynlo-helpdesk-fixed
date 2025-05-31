-- Create stored procedure to get tickets with their last message
CREATE OR REPLACE FUNCTION get_tickets_with_last_message(
  p_status ticket_status DEFAULT NULL,
  p_offset INT DEFAULT 0,
  p_limit INT DEFAULT 25
) RETURNS TABLE (
  -- Ticket fields
  id UUID,
  number INT,
  subject TEXT,
  description TEXT,
  status ticket_status,
  priority ticket_priority,
  customer_id UUID,
  assignee_id UUID,
  team_id UUID,
  tags TEXT[],
  metadata JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  -- Customer fields
  customer JSONB,
  -- Assignee fields
  assignee JSONB,
  -- Last message fields
  last_message JSONB,
  -- Total count for pagination
  total_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH ticket_count AS (
    SELECT COUNT(*) AS cnt
    FROM tickets t
    WHERE (p_status IS NULL OR t.status = p_status)
  ),
  ticket_messages AS (
    SELECT DISTINCT ON (c.ticket_id)
      c.ticket_id,
      jsonb_build_object(
        'id', m.id,
        'content', m.content,
        'content_type', m.content_type,
        'created_at', m.created_at,
        'sender_type', m.sender_type,
        'sender_id', m.sender_id,
        'sender_name', m.sender_name,
        'is_internal', m.is_internal
      ) AS last_message_data
    FROM conversations c
    INNER JOIN messages m ON m.conversation_id = c.id
    WHERE NOT m.is_internal -- Only show public messages in the list
    ORDER BY c.ticket_id, m.created_at DESC
  )
  SELECT 
    -- Ticket fields
    t.id,
    t.number,
    t.subject,
    t.description,
    t.status,
    t.priority,
    t.customer_id,
    t.assignee_id,
    t.team_id,
    t.tags,
    t.metadata,
    t.created_at,
    t.updated_at,
    t.resolved_at,
    t.closed_at,
    -- Customer as JSON
    CASE 
      WHEN cust.id IS NOT NULL THEN
        jsonb_build_object(
          'id', cust.id,
          'name', cust.name,
          'email', cust.email
        )
      ELSE NULL
    END AS customer,
    -- Assignee as JSON
    CASE 
      WHEN u.id IS NOT NULL THEN
        jsonb_build_object(
          'id', u.id,
          'email', u.email,
          'full_name', u.full_name
        )
      ELSE NULL
    END AS assignee,
    -- Last message
    tm.last_message_data AS last_message,
    -- Total count
    tc.cnt AS total_count
  FROM tickets t
  CROSS JOIN ticket_count tc
  LEFT JOIN customers cust ON cust.id = t.customer_id
  LEFT JOIN users u ON u.id = t.assignee_id
  LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id
  WHERE (p_status IS NULL OR t.status = p_status)
  ORDER BY t.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Add comment for documentation
COMMENT ON FUNCTION get_tickets_with_last_message IS 'Efficiently fetch tickets with their last public message for the ticket list view'; 