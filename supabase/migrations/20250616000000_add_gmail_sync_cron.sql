-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable the http extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS http;

-- Create a system_logs table for tracking cron job execution
CREATE TABLE IF NOT EXISTS public.system_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  level TEXT NOT NULL DEFAULT 'info',
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on system_logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for system_logs (only service role can access)
CREATE POLICY "Allow service role access to system_logs" ON public.system_logs
  FOR ALL TO service_role USING (true);

-- Create a function to trigger the Gmail sync Edge Function
CREATE OR REPLACE FUNCTION public.trigger_gmail_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  project_ref TEXT;
  service_key TEXT;
  function_url TEXT;
  response http_response_result;
BEGIN
  -- Get project reference from current database URL
  SELECT current_setting('app.settings.project_ref', true) INTO project_ref;
  
  -- If project_ref is not set, extract from database URL or use hardcoded value
  IF project_ref IS NULL OR project_ref = '' THEN
    project_ref := 'nkrytssezaefinbjgwnq'; -- Hardcoded for this project
  END IF;
  
  -- Get service role key (this should be set as a database setting)
  SELECT current_setting('app.settings.service_role_key', true) INTO service_key;
  
  -- If service key is not set, log error and exit
  IF service_key IS NULL OR service_key = '' THEN
    INSERT INTO public.system_logs (level, message, metadata)
    VALUES ('error', 'Gmail sync failed: Service role key not configured', 
            jsonb_build_object('function', 'trigger_gmail_sync', 'error', 'missing_service_key'));
    RETURN;
  END IF;
  
  -- Build the Edge Function URL
  function_url := 'https://' || project_ref || '.supabase.co/functions/v1/gmail-sync';
  
  -- Make HTTP request to trigger the Gmail sync Edge Function
  SELECT http_post(
    function_url,
    jsonb_build_object('trigger', 'database_cron')::text,
    'application/json',
    ARRAY[
      http_header('Authorization', 'Bearer ' || service_key),
      http_header('Content-Type', 'application/json')
    ]
  ) INTO response;
  
  -- Log the sync trigger attempt
  INSERT INTO public.system_logs (level, message, metadata)
  VALUES (
    CASE 
      WHEN response.status >= 200 AND response.status < 300 THEN 'info'
      ELSE 'error'
    END,
    'Gmail sync triggered via cron job',
    jsonb_build_object(
      'function', 'trigger_gmail_sync',
      'status_code', response.status,
      'response', response.content,
      'url', function_url,
      'trigger_time', NOW()
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Log any errors that occur
  INSERT INTO public.system_logs (level, message, metadata)
  VALUES ('error', 'Gmail sync cron job failed: ' || SQLERRM, 
          jsonb_build_object('function', 'trigger_gmail_sync', 'error', SQLSTATE));
END;
$$;

-- Create the cron job to run every minute
-- Note: This will only work if pg_cron is properly configured on the database
SELECT cron.schedule(
  'gmail-sync-every-minute',
  '* * * * *',  -- Every minute
  'SELECT public.trigger_gmail_sync();'
);

-- Log that the cron job has been set up
INSERT INTO public.system_logs (level, message, metadata)
VALUES ('info', 'Gmail sync cron job configured successfully', 
        jsonb_build_object('schedule', 'every_minute', 'function', 'trigger_gmail_sync'));

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.trigger_gmail_sync() TO postgres;
GRANT EXECUTE ON FUNCTION public.trigger_gmail_sync() TO service_role; 