-- Add indexes for email thread reconstruction queries

-- Index for finding messages by messageId in metadata
CREATE INDEX IF NOT EXISTS idx_messages_metadata_message_id 
ON messages ((metadata->>'messageId'));

-- Index for finding messages by inReplyTo
CREATE INDEX IF NOT EXISTS idx_messages_metadata_in_reply_to 
ON messages ((metadata->>'inReplyTo'));

-- Index for finding messages by references (using GIN for array search)
CREATE INDEX IF NOT EXISTS idx_messages_metadata_references 
ON messages USING GIN ((metadata->'references'));

-- Index for finding recent tickets by created_at
CREATE INDEX IF NOT EXISTS idx_tickets_created_at 
ON tickets (created_at DESC);

-- Index for finding messages by conversation_id and created_at
CREATE INDEX IF NOT EXISTS idx_messages_conversation_created 
ON messages (conversation_id, created_at);

-- Index for finding conversations by ticket_id
CREATE INDEX IF NOT EXISTS idx_conversations_ticket_id 
ON conversations (ticket_id);

-- Composite index for finding messages with specific sender in a conversation
CREATE INDEX IF NOT EXISTS idx_messages_conversation_sender 
ON messages (conversation_id, sender_id);

-- Index for webhook logs by created_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created_at 
ON webhook_logs (created_at DESC);

-- Index for finding attachments in messages (JSONB GIN index)
CREATE INDEX IF NOT EXISTS idx_messages_attachments 
ON messages USING GIN (attachments);

-- Add comment explaining the indexes
COMMENT ON INDEX idx_messages_metadata_message_id IS 'Used for finding existing messages by Message-ID header during thread reconstruction';
COMMENT ON INDEX idx_messages_metadata_in_reply_to IS 'Used for finding parent messages in email threads';
COMMENT ON INDEX idx_messages_metadata_references IS 'Used for finding all messages in an email thread chain';
COMMENT ON INDEX idx_tickets_created_at IS 'Used for finding recent tickets for subject-based thread matching';
COMMENT ON INDEX idx_messages_conversation_created IS 'Used for retrieving conversation history in chronological order';
COMMENT ON INDEX idx_messages_attachments IS 'Used for finding messages with attachments for cleanup operations'; 