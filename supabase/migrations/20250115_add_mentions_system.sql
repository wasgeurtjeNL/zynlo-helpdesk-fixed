-- Create mentions table to track @mentions in messages and comments
CREATE TABLE IF NOT EXISTS mentions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentioned_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mention_text TEXT NOT NULL, -- The actual @username text used
  position_start INTEGER NOT NULL, -- Starting position in the message content
  position_end INTEGER NOT NULL, -- Ending position in the message content
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(message_id, mentioned_user_id, position_start)
);

-- Create indexes for performance
CREATE INDEX idx_mentions_mentioned_user ON mentions(mentioned_user_id);
CREATE INDEX idx_mentions_message ON mentions(message_id);
CREATE INDEX idx_mentions_mentioned_by ON mentions(mentioned_by_user_id);
CREATE INDEX idx_mentions_unread ON mentions(mentioned_user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_mentions_created_at ON mentions(created_at DESC);

-- Enable realtime for mentions
ALTER PUBLICATION supabase_realtime ADD TABLE mentions;

-- Enable RLS
ALTER TABLE mentions ENABLE ROW LEVEL SECURITY;

-- RLS policies for mentions
CREATE POLICY "Users can view mentions of themselves" ON mentions
  FOR SELECT
  USING (mentioned_user_id = auth.uid());

CREATE POLICY "Users can view mentions they created" ON mentions
  FOR SELECT
  USING (mentioned_by_user_id = auth.uid());

CREATE POLICY "Users can create mentions" ON mentions
  FOR INSERT
  WITH CHECK (mentioned_by_user_id = auth.uid());

CREATE POLICY "Users can update their own mention read status" ON mentions
  FOR UPDATE
  USING (mentioned_user_id = auth.uid())
  WITH CHECK (mentioned_user_id = auth.uid());

-- Function to extract and store mentions from message content
CREATE OR REPLACE FUNCTION extract_and_store_mentions(
  p_message_id UUID,
  p_content TEXT,
  p_mentioned_by_user_id UUID
)
RETURNS void AS $$
DECLARE
  mention_pattern TEXT := '@(\w+)';
  mention_match RECORD;
  user_match RECORD;
  mention_start INTEGER;
  mention_end INTEGER;
BEGIN
  -- Clear existing mentions for this message
  DELETE FROM mentions WHERE message_id = p_message_id;
  
  -- Find all @mentions in the content
  FOR mention_match IN 
    SELECT 
      (regexp_matches(p_content, mention_pattern, 'g'))[1] as username,
      position('@' || (regexp_matches(p_content, mention_pattern, 'g'))[1] in p_content) as start_pos
  LOOP
    -- Calculate positions
    mention_start := mention_match.start_pos;
    mention_end := mention_start + length('@' || mention_match.username);
    
    -- Find user by username (check both full_name and email)
    SELECT id INTO user_match
    FROM users 
    WHERE 
      LOWER(REPLACE(full_name, ' ', '')) = LOWER(mention_match.username)
      OR LOWER(SPLIT_PART(email, '@', 1)) = LOWER(mention_match.username)
      OR LOWER(full_name) LIKE '%' || LOWER(mention_match.username) || '%'
    LIMIT 1;
    
    -- Store the mention if user found
    IF user_match.id IS NOT NULL AND user_match.id != p_mentioned_by_user_id THEN
      INSERT INTO mentions (
        message_id,
        mentioned_user_id,
        mentioned_by_user_id,
        mention_text,
        position_start,
        position_end
      ) VALUES (
        p_message_id,
        user_match.id,
        p_mentioned_by_user_id,
        '@' || mention_match.username,
        mention_start,
        mention_end
      )
      ON CONFLICT (message_id, mentioned_user_id, position_start) DO NOTHING;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get mention suggestions based on partial username
CREATE OR REPLACE FUNCTION get_mention_suggestions(
  p_query TEXT,
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  email TEXT,
  username TEXT,
  avatar_url TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.full_name,
    u.email,
    COALESCE(
      NULLIF(REPLACE(u.full_name, ' ', ''), ''),
      SPLIT_PART(u.email, '@', 1)
    ) as username,
    u.avatar_url
  FROM users u
  WHERE 
    u.is_active = true
    AND u.id != auth.uid()
    AND (
      LOWER(COALESCE(u.full_name, '')) ILIKE '%' || LOWER(p_query) || '%'
      OR LOWER(u.email) ILIKE '%' || LOWER(p_query) || '%'
      OR LOWER(REPLACE(COALESCE(u.full_name, ''), ' ', '')) ILIKE '%' || LOWER(p_query) || '%'
      OR LOWER(SPLIT_PART(u.email, '@', 1)) ILIKE '%' || LOWER(p_query) || '%'
    )
  ORDER BY 
    -- Prioritize exact username matches
    CASE WHEN LOWER(COALESCE(REPLACE(u.full_name, ' ', ''), SPLIT_PART(u.email, '@', 1))) = LOWER(p_query) THEN 1 ELSE 2 END,
    -- Then by name similarity
    CASE WHEN LOWER(COALESCE(u.full_name, '')) ILIKE LOWER(p_query) || '%' THEN 1 ELSE 2 END,
    u.full_name, u.email
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark mentions as read
CREATE OR REPLACE FUNCTION mark_mentions_as_read(
  p_user_id UUID,
  p_message_ids UUID[] DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  IF p_message_ids IS NULL THEN
    -- Mark all unread mentions as read
    UPDATE mentions 
    SET is_read = true 
    WHERE mentioned_user_id = p_user_id AND is_read = false;
  ELSE
    -- Mark specific mentions as read
    UPDATE mentions 
    SET is_read = true 
    WHERE mentioned_user_id = p_user_id 
    AND message_id = ANY(p_message_ids)
    AND is_read = false;
  END IF;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment for documentation
COMMENT ON TABLE mentions IS 'Stores @mentions found in messages and comments for notification and tracking purposes';
COMMENT ON FUNCTION extract_and_store_mentions IS 'Parses message content for @mentions and stores them in the mentions table';
COMMENT ON FUNCTION get_mention_suggestions IS 'Returns user suggestions for @mention autocomplete based on partial query';
COMMENT ON FUNCTION mark_mentions_as_read IS 'Marks mentions as read for a specific user'; 