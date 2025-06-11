-- Add RLS policies for channels table to allow owners to access their own channels

-- Ensure table exists (skip if already present)
CREATE TABLE IF NOT EXISTS channels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type channel_type NOT NULL,
  provider TEXT,
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  last_sync TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS if not already enabled
ALTER TABLE channels ENABLE ROW LEVEL SECURITY;

-- Allow owners (created_by) to SELECT / UPDATE / DELETE their own channels
DROP POLICY IF EXISTS "Owners can manage their channels" ON channels;
CREATE POLICY "Owners can manage their channels" ON channels
  FOR ALL USING (auth.uid() = created_by);

-- Service role has full access by default (no change needed)

-- Trigger to keep updated_at fresh
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_channels_updated_at ON channels;
CREATE TRIGGER update_channels_updated_at
  BEFORE UPDATE ON channels
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 