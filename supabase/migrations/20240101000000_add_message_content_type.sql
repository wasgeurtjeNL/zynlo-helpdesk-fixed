-- Add content_type column to messages table to store the Content-Type header
ALTER TABLE messages 
ADD COLUMN content_type VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN messages.content_type IS 'Content-Type header of the message (e.g., text/html, text/plain)';

-- Optionally update existing messages based on content analysis
-- This is commented out by default as it might take time on large tables
-- UPDATE messages 
-- SET content_type = 
--   CASE 
--     WHEN content LIKE '%<html%' OR content LIKE '%<!DOCTYPE%' THEN 'text/html'
--     ELSE 'text/plain'
--   END
-- WHERE content_type IS NULL; 