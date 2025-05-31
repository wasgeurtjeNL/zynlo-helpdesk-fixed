# Temporary fix for RLS issues in development

# Load credentials
$envPath = "apps\api-server\.env"
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

Write-Host "Applying temporary RLS fix for development..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $serviceKey"
    "apikey" = $serviceKey
    "Content-Type" = "application/json"
}

# Temporarily disable RLS on tickets table for development
$sql = @"
-- Temporarily disable RLS for development
ALTER TABLE tickets DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;

-- Add basic select policy for authenticated users if needed later
-- CREATE POLICY "Enable read access for authenticated users" ON tickets
-- FOR SELECT USING (true);
"@

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/execute_sql" -Headers $headers -Method POST -Body (@{sql=$sql} | ConvertTo-Json) -ContentType "application/json"
    Write-Host "✅ RLS temporarily disabled for development" -ForegroundColor Green
    Write-Host "⚠️  Remember to re-enable RLS for production!" -ForegroundColor Yellow
} catch {
    # If the function doesn't exist, try direct SQL execution
    Write-Host "Trying direct SQL execution..." -ForegroundColor Cyan
    
    # Try each statement individually
    $statements = @(
        "ALTER TABLE tickets DISABLE ROW LEVEL SECURITY",
        "ALTER TABLE customers DISABLE ROW LEVEL SECURITY", 
        "ALTER TABLE conversations DISABLE ROW LEVEL SECURITY",
        "ALTER TABLE messages DISABLE ROW LEVEL SECURITY"
    )
    
    foreach ($stmt in $statements) {
        try {
            $body = @{query = $stmt} | ConvertTo-Json
            $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" -Headers $headers -Method POST -Body $body -ContentType "application/json"
            Write-Host "✅ Executed: $stmt" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed: $stmt - $($_.Exception.Message)" -ForegroundColor Red
        }
    }
}

Write-Host "`nNow test the frontend at http://localhost:3000/inbox/nieuw"
Write-Host "You should see your tickets including #15!" -ForegroundColor Green
Write-Host "`nPress any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 