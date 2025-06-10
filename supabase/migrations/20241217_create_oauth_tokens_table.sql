-- Create oauth_tokens table for storing OAuth authentication tokens
CREATE TABLE IF NOT EXISTS oauth_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  channel_id UUID REFERENCES channels(id) ON DELETE CASCADE,
  provider TEXT NOT NULL, -- 'gmail', 'outlook', etc.
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,
  scope TEXT,
  token_type TEXT DEFAULT 'Bearer',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create unique constraint to prevent duplicate tokens per channel
CREATE UNIQUE INDEX IF NOT EXISTS oauth_tokens_channel_provider_idx 
ON oauth_tokens(channel_id, provider);

-- Add RLS (Row Level Security)
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access tokens for channels they own
CREATE POLICY "Users can manage their own channel tokens" ON oauth_tokens
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM channels 
    WHERE channels.id = oauth_tokens.channel_id 
    AND channels.created_by = auth.uid()
  )
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_oauth_tokens_updated_at 
BEFORE UPDATE ON oauth_tokens 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant access to service role
GRANT ALL ON oauth_tokens TO service_role;
GRANT ALL ON oauth_tokens TO authenticated; 