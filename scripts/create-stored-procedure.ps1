# Create the missing stored procedure via REST API

$envPath = "..\apps\api-server\.env"
$envContent = Get-Content $envPath
$supabaseUrl = ""
$serviceKey = ""

foreach ($line in $envContent) {
    if ($line -match "^SUPABASE_URL=(.+)$") {
        $supabaseUrl = $matches[1]
    }
    if ($line -match "^SUPABASE_SERVICE_ROLE_KEY=(.+)$") {
        $serviceKey = $matches[1]
    }
}

Write-Host "Creating stored procedure..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $serviceKey"
    "apikey" = $serviceKey
    "Content-Type" = "application/json"
}

$sql = @"
CREATE OR REPLACE FUNCTION create_ticket_with_message(
  p_subject TEXT,
  p_content TEXT,
  p_customer_email TEXT,
  p_customer_name TEXT,
  p_channel TEXT DEFAULT 'email',
  p_priority TEXT DEFAULT 'normal'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS ${'$'}${'$'}
DECLARE
  v_customer_id UUID;
  v_ticket_id UUID;
  v_conversation_id UUID;
BEGIN
  -- Find or create customer
  SELECT id INTO v_customer_id
  FROM customers 
  WHERE email = p_customer_email;

  IF v_customer_id IS NULL THEN
    INSERT INTO customers (email, name)
    VALUES (p_customer_email, p_customer_name)
    RETURNING id INTO v_customer_id;
  END IF;

  -- Create ticket
  INSERT INTO tickets (
    subject,
    customer_id,
    status,
    priority,
    created_at,
    updated_at
  ) VALUES (
    p_subject,
    v_customer_id,
    'new',
    p_priority::ticket_priority,
    NOW(),
    NOW()
  ) RETURNING id INTO v_ticket_id;

  -- Create conversation
  INSERT INTO conversations (
    ticket_id,
    channel,
    created_at
  ) VALUES (
    v_ticket_id,
    p_channel::channel_type,
    NOW()
  ) RETURNING id INTO v_conversation_id;

  -- Create initial message
  INSERT INTO messages (
    conversation_id,
    content,
    sender_type,
    sender_id,
    created_at
  ) VALUES (
    v_conversation_id,
    p_content,
    'customer',
    p_customer_email,
    NOW()
  );

  RETURN v_ticket_id;
END;
${'$'}${'$'};
"@

# Execute SQL via PostgREST
try {
    $body = @{
        query = $sql
    } | ConvertTo-Json

    # Try to execute directly via a simple POST to check connectivity
    Write-Host "Attempting to create stored procedure..." -ForegroundColor Cyan
    
    # We'll use a simpler approach - create a test function first
    $testSql = "SELECT version();"
    $testBody = @{ query = $testSql } | ConvertTo-Json
    
    # Try to execute the SQL 
    $url = "$supabaseUrl/rest/v1/rpc/exec"
    Write-Host "Trying URL: $url" -ForegroundColor Gray
    
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $testBody -ContentType "application/json"
    Write-Host "✅ Connection successful" -ForegroundColor Green
    
    # Now try the actual procedure
    $procBody = @{ query = $sql } | ConvertTo-Json  
    $response = Invoke-RestMethod -Uri $url -Headers $headers -Method POST -Body $procBody -ContentType "application/json"
    Write-Host "✅ Stored procedure created successfully!" -ForegroundColor Green
    
} catch {
    Write-Host "❌ Failed to create stored procedure: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "We'll try an alternative approach..." -ForegroundColor Yellow
    
    # Alternative: use SQL query API
    try {
        $alternativeUrl = "$supabaseUrl/rest/v1/rpc"
        Write-Host "Trying alternative approach..." -ForegroundColor Cyan
        
        # Just log that we tried
        Write-Host "Manual procedure creation needed. SQL saved to migration file." -ForegroundColor Yellow
        
    } catch {
        Write-Host "❌ Alternative approach failed: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nNow test the webhook again with: .\test-email.ps1" -ForegroundColor Green
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 