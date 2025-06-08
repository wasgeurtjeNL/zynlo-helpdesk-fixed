-- Create oauth_tokens table for storing Gmail tokens securely
CREATE TABLE oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'gmail',
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  token_type text DEFAULT 'Bearer',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW(),
  
  -- Ensure one token set per channel
  UNIQUE(channel_id, provider)
);

-- Add RLS policies
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to manage their own tokens
CREATE POLICY "Users can manage oauth tokens for their channels" ON oauth_tokens
  FOR ALL USING (
    channel_id IN (
      SELECT id FROM channels 
      WHERE created_by = auth.uid()
    )
  );

-- Add index for faster lookups
CREATE INDEX idx_oauth_tokens_channel_id ON oauth_tokens(channel_id);
CREATE INDEX idx_oauth_tokens_provider ON oauth_tokens(provider); 