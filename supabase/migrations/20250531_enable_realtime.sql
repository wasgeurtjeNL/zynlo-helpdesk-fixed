-- Enable Realtime for the tickets table
ALTER publication supabase_realtime ADD TABLE tickets;

-- Also enable for messages table for real-time conversation updates
ALTER publication supabase_realtime ADD TABLE messages; 