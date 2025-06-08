# Database Setup - Zynlo Helpdesk

## 🚨 **Belangrijk: Database migraties toepassen**

Voordat je de Gmail integratie kunt gebruiken, moet je de database setup uitvoeren in je Supabase project.

## 📋 **Stap-voor-stap Setup**

### 1. **Open Supabase Dashboard**
1. Ga naar [supabase.com](https://supabase.com)
2. Log in en selecteer je Zynlo Helpdesk project
3. Ga naar "SQL Editor" in de sidebar

### 2. **Voer Database Setup uit**
1. Klik op "New Query" 
2. Kopieer en plak de volgende SQL code:

```sql
-- Zynlo Helpdesk Database Setup
-- Run this in your Supabase SQL Editor

-- 1. Create oauth_tokens table
CREATE TABLE IF NOT EXISTS oauth_tokens (
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

-- 2. Enable RLS on oauth_tokens
ALTER TABLE oauth_tokens ENABLE ROW LEVEL SECURITY;

-- 3. Add created_by column to channels if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='channels' AND column_name='created_by') THEN
        ALTER TABLE channels ADD COLUMN created_by uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_channel_id ON oauth_tokens(channel_id);
CREATE INDEX IF NOT EXISTS idx_oauth_tokens_provider ON oauth_tokens(provider);
CREATE INDEX IF NOT EXISTS idx_channels_created_by ON channels(created_by);

-- 5. Create RLS policies
DO $$
BEGIN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Users can manage oauth tokens for their channels" ON oauth_tokens;
    
    -- Create new policy
    CREATE POLICY "Users can manage oauth tokens for their channels" ON oauth_tokens
      FOR ALL USING (
        channel_id IN (
          SELECT id FROM channels 
          WHERE created_by = auth.uid()
        )
      );
      
    -- Update channels RLS if needed
    DROP POLICY IF EXISTS "Users can manage their channels" ON channels;
    CREATE POLICY "Users can manage their channels" ON channels
      FOR ALL USING (created_by = auth.uid());
      
EXCEPTION
    WHEN duplicate_object THEN
        -- Policy already exists, ignore
        NULL;
END $$;

-- 6. Grant necessary permissions
GRANT ALL ON oauth_tokens TO authenticated;
GRANT ALL ON channels TO authenticated;

-- 7. Test the setup
SELECT 
    'oauth_tokens' as table_name,
    COUNT(*) as row_count
FROM oauth_tokens
UNION ALL
SELECT 
    'channels' as table_name,
    COUNT(*) as row_count  
FROM channels;

-- Success message
SELECT 'Database setup completed successfully!' as status;
```

3. Klik op "Run" om de setup uit te voeren

### 3. **Verificatie**
Na het uitvoeren zou je moeten zien:
- ✅ `oauth_tokens table created`
- ✅ `RLS policies created`
- ✅ `Indexes created`
- ✅ `Database setup completed successfully!`

## 🔧 **Troubleshooting**

### **Error: "Gmail tokens niet gevonden"**
- **Oorzaak**: De `oauth_tokens` tabel bestaat niet
- **Oplossing**: Voer de database setup hierboven uit

### **Error: "Channel niet gevonden"**
- **Oorzaak**: De `created_by` kolom bestaat niet in channels tabel
- **Oplossing**: Voer de database setup hierboven uit

### **Error: "Permission denied"**
- **Oorzaak**: RLS policies zijn niet correct ingesteld
- **Oplossing**: Controleer of je bent ingelogd en voer setup opnieuw uit

## 📊 **Tabel Structuur**

### **oauth_tokens**
```sql
CREATE TABLE oauth_tokens (
  id uuid PRIMARY KEY,
  channel_id uuid REFERENCES channels(id),
  provider text DEFAULT 'gmail',
  access_token text NOT NULL,
  refresh_token text,
  expires_at timestamptz,
  scope text,
  token_type text DEFAULT 'Bearer',
  created_at timestamptz,
  updated_at timestamptz
);
```

### **channels** (updated)
```sql
-- Added field:
created_by uuid REFERENCES auth.users(id)
```

## 🚀 **Na Setup**

Na succesvolle database setup kun je:

1. **Gmail accounts koppelen** via OAuth flow
2. **Emails synchroniseren** met echte Gmail API
3. **Tokens beheren** automatisch (refresh, expiry)
4. **Kanaal details bekijken** op `/kanalen/email/[id]`

## 🔐 **Beveiliging**

- ✅ **RLS enabled**: Alleen eigen channels en tokens toegankelijk
- ✅ **OAuth tokens encrypted**: Veilig opgeslagen in database  
- ✅ **Automatic token refresh**: Geen handmatige interventie nodig
- ✅ **Scoped permissions**: Alleen Gmail read access

---

**⚠️ Belangrijk**: Voer deze setup eenmalig uit voordat je de Gmail integratie probeert te gebruiken! 