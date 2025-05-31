-- Add spam-related columns to tickets table
ALTER TABLE tickets
ADD COLUMN IF NOT EXISTS is_spam BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS marked_as_spam_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS marked_as_spam_by UUID REFERENCES users(id);

-- Create index for spam filtering
CREATE INDEX IF NOT EXISTS idx_tickets_is_spam ON tickets(is_spam);

-- Create function to mark tickets as spam
CREATE OR REPLACE FUNCTION mark_ticket_as_spam(
    p_ticket_id UUID,
    p_is_spam BOOLEAN DEFAULT true
)
RETURNS VOID AS $$
BEGIN
    UPDATE tickets
    SET 
        is_spam = p_is_spam,
        marked_as_spam_at = CASE 
            WHEN p_is_spam THEN NOW() 
            ELSE NULL 
        END,
        marked_as_spam_by = CASE 
            WHEN p_is_spam THEN auth.uid() 
            ELSE NULL 
        END,
        status = CASE 
            WHEN p_is_spam THEN 'closed'::ticket_status 
            ELSE status 
        END,
        closed_at = CASE 
            WHEN p_is_spam AND closed_at IS NULL THEN NOW() 
            ELSE closed_at 
        END,
        updated_at = NOW()
    WHERE id = p_ticket_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update get_inbox_counts function to include spam count
CREATE OR REPLACE FUNCTION get_inbox_counts(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_counts JSON;
BEGIN
    WITH counts AS (
        SELECT
            COUNT(*) FILTER (WHERE status = 'new' AND NOT COALESCE(is_spam, false)) AS nieuw,
            COUNT(*) FILTER (WHERE status = 'open' AND assignee_id IS NOT NULL AND NOT COALESCE(is_spam, false)) AS toegewezen,
            COUNT(*) FILTER (WHERE status = 'closed' AND NOT COALESCE(is_spam, false)) AS gesloten,
            COUNT(*) FILTER (WHERE COALESCE(is_spam, false)) AS spam,
            COUNT(*) FILTER (WHERE assignee_id = p_user_id AND status NOT IN ('closed', 'resolved') AND NOT COALESCE(is_spam, false)) AS aan_mij_toegewezen,
            COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM user_mentions um 
                WHERE um.ticket_id = tickets.id 
                AND um.user_id = p_user_id
                AND NOT um.is_read
            ) AND NOT COALESCE(is_spam, false)) AS vermeld,
            COUNT(*) FILTER (WHERE EXISTS (
                SELECT 1 FROM user_favorites uf 
                WHERE uf.ticket_id = tickets.id 
                AND uf.user_id = p_user_id
            ) AND NOT COALESCE(is_spam, false)) AS favorieten
        FROM tickets
    )
    SELECT json_build_object(
        'nieuw', nieuw,
        'toegewezen', toegewezen,
        'gesloten', gesloten,
        'spam', spam,
        'aan_mij_toegewezen', aan_mij_toegewezen,
        'vermeld', vermeld,
        'favorieten', favorieten
    ) INTO v_counts
    FROM counts;

    RETURN v_counts;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON COLUMN tickets.is_spam IS 'Whether this ticket has been marked as spam';
COMMENT ON COLUMN tickets.marked_as_spam_at IS 'Timestamp when the ticket was marked as spam';
COMMENT ON COLUMN tickets.marked_as_spam_by IS 'User who marked the ticket as spam'; 