-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to trigger the Gmail sync Edge Function
CREATE OR REPLACE FUNCTION trigger_gmail_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Make HTTP request to our Edge Function
  PERFORM net.http_post(
    url := 'https://' || current_setting('app.settings.project_ref') || '.supabase.co/functions/v1/gmail-sync',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('trigger', 'cron')::text
  );
  
  -- Log the sync trigger
  INSERT INTO public.system_logs (level, message, metadata, created_at)
  VALUES (
    'info',
    'Gmail sync triggered via cron',
    jsonb_build_object('timestamp', now()),
    now()
  );
EXCEPTION WHEN OTHERS THEN
  -- Log any errors
  INSERT INTO public.system_logs (level, message, metadata, created_at)
  VALUES (
    'error',
    'Failed to trigger Gmail sync: ' || SQLERRM,
    jsonb_build_object('error', SQLERRM, 'timestamp', now()),
    now()
  );
END;
$$;

-- Create system_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.system_logs (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  level text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON public.system_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON public.system_logs(level);

-- Schedule the cron job to run every minute
-- Note: This requires the pg_cron extension and superuser privileges
-- If pg_cron is not available, we'll use an alternative approach
DO $$
BEGIN
  -- Try to schedule with pg_cron
  BEGIN
    PERFORM cron.schedule(
      'gmail-sync-job',
      '* * * * *', -- Every minute
      'SELECT trigger_gmail_sync();'
    );
    
    INSERT INTO public.system_logs (level, message, metadata, created_at)
    VALUES (
      'info',
      'Gmail sync cron job scheduled successfully',
      jsonb_build_object('schedule', '* * * * *', 'timestamp', now()),
      now()
    );
  EXCEPTION WHEN OTHERS THEN
    -- If pg_cron fails, log the error but don't fail the migration
    INSERT INTO public.system_logs (level, message, metadata, created_at)
    VALUES (
      'warning',
      'Could not schedule pg_cron job: ' || SQLERRM,
      jsonb_build_object('error', SQLERRM, 'fallback', 'manual_trigger', 'timestamp', now()),
      now()
    );
  END;
END $$;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION trigger_gmail_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION trigger_gmail_sync() TO service_role;

-- Create a manual trigger function for testing
CREATE OR REPLACE FUNCTION manual_gmail_sync()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Trigger the sync
  PERFORM trigger_gmail_sync();
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Gmail sync triggered manually',
    'timestamp', now()
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'timestamp', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION manual_gmail_sync() TO authenticated;
GRANT EXECUTE ON FUNCTION manual_gmail_sync() TO service_role; 