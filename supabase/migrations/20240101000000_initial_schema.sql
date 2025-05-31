-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'pending', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE channel_type AS ENUM ('email', 'whatsapp', 'chat', 'phone', 'api');
CREATE TYPE sender_type AS ENUM ('customer', 'agent', 'system');

-- Create teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    team_id UUID REFERENCES teams(id),
    role TEXT DEFAULT 'agent',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create customers table
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT,
    phone TEXT,
    name TEXT,
    external_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(email),
    UNIQUE(phone)
);

-- Create tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    number SERIAL UNIQUE,
    subject TEXT NOT NULL,
    description TEXT,
    status ticket_status DEFAULT 'new',
    priority ticket_priority DEFAULT 'normal',
    customer_id UUID REFERENCES customers(id),
    assignee_id UUID REFERENCES users(id),
    team_id UUID REFERENCES teams(id),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ
);

-- Create conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
    channel channel_type NOT NULL,
    external_id TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    sender_type sender_type NOT NULL,
    sender_id TEXT NOT NULL,
    sender_name TEXT,
    attachments JSONB[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create webhook_logs table
CREATE TABLE webhook_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    channel TEXT NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    processed BOOLEAN DEFAULT false,
    error TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);
CREATE INDEX idx_messages_conversation ON messages(conversation_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_conversations_ticket ON conversations(ticket_id);
CREATE INDEX idx_webhook_logs_channel ON webhook_logs(channel);
CREATE INDEX idx_webhook_logs_created_at ON webhook_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON tickets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_logs ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (to be expanded based on requirements)
-- Allow authenticated users to read their own team
CREATE POLICY "Users can view their own team" ON teams
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM users WHERE team_id = teams.id
    ));

-- Allow authenticated users to read their profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

-- Allow authenticated users to update their profile
CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Allow authenticated users to view tickets
CREATE POLICY "Authenticated users can view tickets" ON tickets
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create tickets
CREATE POLICY "Authenticated users can create tickets" ON tickets
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update assigned tickets
CREATE POLICY "Users can update assigned tickets" ON tickets
    FOR UPDATE USING (assignee_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM users WHERE role = 'admin'
    ));

-- Allow authenticated users to view conversations
CREATE POLICY "Authenticated users can view conversations" ON conversations
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to view messages
CREATE POLICY "Authenticated users can view messages" ON messages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to create messages
CREATE POLICY "Authenticated users can create messages" ON messages
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Service role can do everything on webhook_logs
CREATE POLICY "Service role full access to webhook_logs" ON webhook_logs
    FOR ALL USING (auth.role() = 'service_role'); 