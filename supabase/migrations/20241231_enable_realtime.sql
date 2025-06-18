-- Enable realtime for tickets table
ALTER PUBLICATION supabase_realtime ADD TABLE tickets;

-- Enable realtime for messages table  
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for customers table (for ticket updates)
ALTER PUBLICATION supabase_realtime ADD TABLE customers;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime'; 