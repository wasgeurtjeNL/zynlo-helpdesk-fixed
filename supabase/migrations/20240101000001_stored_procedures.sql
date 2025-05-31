-- Stored procedure to create a ticket with conversation and initial message
CREATE OR REPLACE FUNCTION create_ticket_with_message(
    p_subject TEXT,
    p_content TEXT,
    p_customer_email TEXT,
    p_customer_name TEXT,
    p_channel channel_type,
    p_priority ticket_priority DEFAULT 'normal',
    p_metadata JSONB DEFAULT '{}'
) RETURNS JSON AS $$
DECLARE
    v_customer_id UUID;
    v_ticket_id UUID;
    v_conversation_id UUID;
    v_message_id UUID;
BEGIN
    -- Get or create customer
    INSERT INTO customers (email, name)
    VALUES (p_customer_email, p_customer_name)
    ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, customers.name),
        updated_at = NOW()
    RETURNING id INTO v_customer_id;

    -- Create ticket
    INSERT INTO tickets (subject, description, customer_id, priority, metadata)
    VALUES (p_subject, p_content, v_customer_id, p_priority, p_metadata)
    RETURNING id INTO v_ticket_id;

    -- Create conversation
    INSERT INTO conversations (ticket_id, channel)
    VALUES (v_ticket_id, p_channel)
    RETURNING id INTO v_conversation_id;

    -- Create initial message
    INSERT INTO messages (conversation_id, content, sender_type, sender_id, sender_name)
    VALUES (v_conversation_id, p_content, 'customer', v_customer_id::TEXT, p_customer_name)
    RETURNING id INTO v_message_id;

    -- Return created IDs
    RETURN json_build_object(
        'ticket_id', v_ticket_id,
        'conversation_id', v_conversation_id,
        'message_id', v_message_id,
        'customer_id', v_customer_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored procedure to assign ticket to agent
CREATE OR REPLACE FUNCTION assign_ticket(
    p_ticket_id UUID,
    p_agent_id UUID
) RETURNS VOID AS $$
BEGIN
    UPDATE tickets
    SET 
        assignee_id = p_agent_id,
        status = CASE 
            WHEN status = 'new' THEN 'open'
            ELSE status
        END,
        updated_at = NOW()
    WHERE id = p_ticket_id;

    -- Log assignment as internal message
    INSERT INTO messages (
        conversation_id,
        content,
        sender_type,
        sender_id,
        is_internal
    )
    SELECT 
        c.id,
        'Ticket assigned to ' || u.full_name,
        'system',
        'system',
        true
    FROM conversations c
    JOIN tickets t ON t.id = c.ticket_id
    JOIN users u ON u.id = p_agent_id
    WHERE t.id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored procedure to get ticket statistics
CREATE OR REPLACE FUNCTION get_ticket_stats(
    p_team_id UUID DEFAULT NULL,
    p_agent_id UUID DEFAULT NULL,
    p_date_from TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
    p_date_to TIMESTAMPTZ DEFAULT NOW()
) RETURNS JSON AS $$
DECLARE
    v_stats JSON;
BEGIN
    WITH ticket_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE status = 'new') AS new_count,
            COUNT(*) FILTER (WHERE status = 'open') AS open_count,
            COUNT(*) FILTER (WHERE status = 'pending') AS pending_count,
            COUNT(*) FILTER (WHERE status = 'resolved') AS resolved_count,
            COUNT(*) FILTER (WHERE status = 'closed') AS closed_count,
            COUNT(*) AS total_count,
            AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/3600)::NUMERIC(10,2) AS avg_resolution_hours
        FROM tickets
        WHERE created_at BETWEEN p_date_from AND p_date_to
            AND (p_team_id IS NULL OR team_id = p_team_id)
            AND (p_agent_id IS NULL OR assignee_id = p_agent_id)
    ),
    priority_counts AS (
        SELECT
            COUNT(*) FILTER (WHERE priority = 'urgent') AS urgent_count,
            COUNT(*) FILTER (WHERE priority = 'high') AS high_count,
            COUNT(*) FILTER (WHERE priority = 'normal') AS normal_count,
            COUNT(*) FILTER (WHERE priority = 'low') AS low_count
        FROM tickets
        WHERE created_at BETWEEN p_date_from AND p_date_to
            AND (p_team_id IS NULL OR team_id = p_team_id)
            AND (p_agent_id IS NULL OR assignee_id = p_agent_id)
    )
    SELECT json_build_object(
        'status', row_to_json(tc.*),
        'priority', row_to_json(pc.*),
        'period', json_build_object(
            'from', p_date_from,
            'to', p_date_to
        )
    ) INTO v_stats
    FROM ticket_counts tc, priority_counts pc;

    RETURN v_stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored procedure to search tickets
CREATE OR REPLACE FUNCTION search_tickets(
    p_query TEXT,
    p_status ticket_status[] DEFAULT NULL,
    p_assignee_id UUID DEFAULT NULL,
    p_customer_id UUID DEFAULT NULL,
    p_limit INT DEFAULT 50,
    p_offset INT DEFAULT 0
) RETURNS TABLE (
    id UUID,
    number INT,
    subject TEXT,
    status ticket_status,
    priority ticket_priority,
    customer_name TEXT,
    assignee_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    last_message_at TIMESTAMPTZ,
    message_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    WITH ticket_messages AS (
        SELECT 
            c.ticket_id,
            COUNT(m.id) AS message_count,
            MAX(m.created_at) AS last_message_at
        FROM conversations c
        LEFT JOIN messages m ON m.conversation_id = c.id
        GROUP BY c.ticket_id
    )
    SELECT 
        t.id,
        t.number,
        t.subject,
        t.status,
        t.priority,
        cust.name AS customer_name,
        u.full_name AS assignee_name,
        t.created_at,
        t.updated_at,
        tm.last_message_at,
        COALESCE(tm.message_count, 0) AS message_count
    FROM tickets t
    LEFT JOIN customers cust ON cust.id = t.customer_id
    LEFT JOIN users u ON u.id = t.assignee_id
    LEFT JOIN ticket_messages tm ON tm.ticket_id = t.id
    WHERE 
        (p_query IS NULL OR p_query = '' OR 
         t.subject ILIKE '%' || p_query || '%' OR
         t.description ILIKE '%' || p_query || '%' OR
         t.number::TEXT = p_query)
        AND (p_status IS NULL OR t.status = ANY(p_status))
        AND (p_assignee_id IS NULL OR t.assignee_id = p_assignee_id)
        AND (p_customer_id IS NULL OR t.customer_id = p_customer_id)
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Stored procedure to merge duplicate tickets
CREATE OR REPLACE FUNCTION merge_tickets(
    p_primary_ticket_id UUID,
    p_duplicate_ticket_ids UUID[]
) RETURNS VOID AS $$
BEGIN
    -- Move all conversations to primary ticket
    UPDATE conversations
    SET ticket_id = p_primary_ticket_id
    WHERE ticket_id = ANY(p_duplicate_ticket_ids);

    -- Add merge note to primary ticket
    INSERT INTO messages (
        conversation_id,
        content,
        sender_type,
        sender_id,
        is_internal
    )
    SELECT 
        c.id,
        'Merged tickets: ' || array_to_string(
            ARRAY(SELECT number::TEXT FROM tickets WHERE id = ANY(p_duplicate_ticket_ids)),
            ', '
        ),
        'system',
        'system',
        true
    FROM conversations c
    WHERE c.ticket_id = p_primary_ticket_id
    LIMIT 1;

    -- Close duplicate tickets
    UPDATE tickets
    SET 
        status = 'closed',
        closed_at = NOW(),
        metadata = jsonb_set(
            COALESCE(metadata, '{}'),
            '{merged_into}',
            to_jsonb(p_primary_ticket_id)
        )
    WHERE id = ANY(p_duplicate_ticket_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 