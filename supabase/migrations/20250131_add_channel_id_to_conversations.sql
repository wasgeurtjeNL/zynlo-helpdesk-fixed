-- Add channel_id column to conversations table
-- This allows us to track which email channel was used for a conversation

-- Add the column
ALTER TABLE conversations 
ADD COLUMN channel_id UUID REFERENCES channels(id) ON DELETE SET NULL;

-- Create an index for better query performance
CREATE INDEX idx_conversations_channel_id ON conversations(channel_id);

-- Add comment for documentation
COMMENT ON COLUMN conversations.channel_id IS 'Reference to the channel used for this conversation (e.g., which Gmail account)';

-- Update existing email conversations to use the first available email channel
-- This is a one-time migration to set default values
DO $$
DECLARE
  default_channel_id UUID;
BEGIN
  -- Get the first active email channel
  SELECT id INTO default_channel_id
  FROM channels
  WHERE type = 'email' AND is_active = true
  LIMIT 1;
  
  -- Only update if we found a channel
  IF default_channel_id IS NOT NULL THEN
    UPDATE conversations
    SET channel_id = default_channel_id
    WHERE channel = 'email' AND channel_id IS NULL;
  END IF;
END $$; 