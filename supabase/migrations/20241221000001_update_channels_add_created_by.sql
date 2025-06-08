-- Add created_by field to channels table
ALTER TABLE channels 
ADD COLUMN created_by uuid REFERENCES auth.users(id);

-- Create index for performance
CREATE INDEX idx_channels_created_by ON channels(created_by);

-- Update RLS policy to include created_by access
DROP POLICY IF EXISTS "Users can manage oauth tokens for their channels" ON oauth_tokens;

CREATE POLICY "Users can manage oauth tokens for their channels" ON oauth_tokens
  FOR ALL USING (
    channel_id IN (
      SELECT id FROM channels 
      WHERE created_by = auth.uid()
    )
  ); 