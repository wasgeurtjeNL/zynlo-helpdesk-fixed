-- Add indexes for performance optimization
-- These indexes will speed up common queries in the ticketing system

-- Index on customers.email for quick customer lookups
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

-- Index on tickets.status for filtering by status
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);

-- Index on tickets.created_at for date-based sorting and filtering
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- Index on tickets.assignee_id for filtering by assigned user
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);

-- Composite index for common ticket list queries
CREATE INDEX IF NOT EXISTS idx_tickets_status_created ON tickets(status, created_at DESC);

-- Index on messages.conversation_id for faster message lookups
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);

-- Index on conversations.ticket_id for faster conversation lookups
CREATE INDEX IF NOT EXISTS idx_conversations_ticket_id ON conversations(ticket_id); 