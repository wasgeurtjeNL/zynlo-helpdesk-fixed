-- Fix RLS policies for all tables to prevent 406 errors

-- Customers table policies
DROP POLICY IF EXISTS "Users can view customers" ON customers;
DROP POLICY IF EXISTS "Users can create customers" ON customers;
DROP POLICY IF EXISTS "Users can update customers" ON customers;

CREATE POLICY "Users can view customers" ON customers
  FOR SELECT USING (true);

CREATE POLICY "Users can create customers" ON customers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update customers" ON customers
  FOR UPDATE USING (true);

-- Conversations table policies
DROP POLICY IF EXISTS "Users can view conversations" ON conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations" ON conversations;

CREATE POLICY "Users can view conversations" ON conversations
  FOR SELECT USING (true);

CREATE POLICY "Users can create conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update conversations" ON conversations
  FOR UPDATE USING (true);

-- Messages table policies
DROP POLICY IF EXISTS "Users can view messages" ON messages;
DROP POLICY IF EXISTS "Users can create messages" ON messages;
DROP POLICY IF EXISTS "Users can update messages" ON messages;

CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (true);

-- Tickets table policies
DROP POLICY IF EXISTS "Users can view tickets" ON tickets;
DROP POLICY IF EXISTS "Users can create tickets" ON tickets;
DROP POLICY IF EXISTS "Users can update tickets" ON tickets;

CREATE POLICY "Users can view tickets" ON tickets
  FOR SELECT USING (true);

CREATE POLICY "Users can create tickets" ON tickets
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update tickets" ON tickets
  FOR UPDATE USING (true);

-- User signatures table policies
DROP POLICY IF EXISTS "Users can view signatures" ON user_signatures;
DROP POLICY IF EXISTS "Users can create signatures" ON user_signatures;
DROP POLICY IF EXISTS "Users can update signatures" ON user_signatures;

CREATE POLICY "Users can view signatures" ON user_signatures
  FOR SELECT USING (true);

CREATE POLICY "Users can create signatures" ON user_signatures
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update signatures" ON user_signatures
  FOR UPDATE USING (true);

-- Teams table policies
DROP POLICY IF EXISTS "Users can view teams" ON teams;
DROP POLICY IF EXISTS "Users can create teams" ON teams;
DROP POLICY IF EXISTS "Users can update teams" ON teams;

CREATE POLICY "Users can view teams" ON teams
  FOR SELECT USING (true);

CREATE POLICY "Users can create teams" ON teams
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update teams" ON teams
  FOR UPDATE USING (true);

-- Users table policies
DROP POLICY IF EXISTS "Users can view users" ON users;
DROP POLICY IF EXISTS "Users can create users" ON users;
DROP POLICY IF EXISTS "Users can update users" ON users;

CREATE POLICY "Users can view users" ON users
  FOR SELECT USING (true);

CREATE POLICY "Users can create users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update users" ON users
  FOR UPDATE USING (true);

-- Webhook logs table policies
DROP POLICY IF EXISTS "Users can view webhook_logs" ON webhook_logs;
DROP POLICY IF EXISTS "Users can create webhook_logs" ON webhook_logs;

CREATE POLICY "Users can view webhook_logs" ON webhook_logs
  FOR SELECT USING (true);

CREATE POLICY "Users can create webhook_logs" ON webhook_logs
  FOR INSERT WITH CHECK (true); 