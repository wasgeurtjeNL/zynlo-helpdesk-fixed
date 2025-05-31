# Debug script to simulate frontend ticket queries

# Load credentials from API server .env
$envPath = "apps\api-server\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

$envContent = Get-Content $envPath
$supabaseUrl = ""
$anonKey = ""
$serviceKey = ""

foreach ($line in $envContent) {
    if ($line -match "^SUPABASE_URL=(.+)$") {
        $supabaseUrl = $matches[1]
    }
    if ($line -match "^SUPABASE_ANON_KEY=(.+)$") {
        $anonKey = $matches[1]
    }
    if ($line -match "^SUPABASE_SERVICE_ROLE_KEY=(.+)$") {
        $serviceKey = $matches[1]
    }
}

Write-Host "Testing frontend ticket queries..." -ForegroundColor Yellow
Write-Host "Supabase URL: $supabaseUrl" -ForegroundColor Cyan

# Test 1: Query with service key (should work)
Write-Host "`n=== Test 1: Query with Service Key ===" -ForegroundColor Magenta
$serviceHeaders = @{
    "Authorization" = "Bearer $serviceKey"
    "apikey" = $serviceKey
    "Content-Type" = "application/json"
}

try {
    $serviceResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tickets?select=*,customer:customer_id(id,name,email),assignee:assignee_id(id,email,full_name)&status=eq.new&order=created_at.desc" -Headers $serviceHeaders -Method GET
    Write-Host "✅ Service key query successful! Found $($serviceResponse.Count) tickets" -ForegroundColor Green
    foreach ($ticket in $serviceResponse | Select-Object -First 3) {
        Write-Host "  #$($ticket.number) - $($ticket.subject) - $($ticket.status)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Service key query failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2: Query with anon key (frontend simulation)  
Write-Host "`n=== Test 2: Query with Anon Key (Frontend Simulation) ===" -ForegroundColor Magenta
$anonHeaders = @{
    "Authorization" = "Bearer $anonKey"
    "apikey" = $anonKey
    "Content-Type" = "application/json"
}

try {
    $anonResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tickets?select=*,customer:customer_id(id,name,email),assignee:assignee_id(id,email,full_name)&status=eq.new&order=created_at.desc" -Headers $anonHeaders -Method GET
    Write-Host "✅ Anon key query successful! Found $($anonResponse.Count) tickets" -ForegroundColor Green
    foreach ($ticket in $anonResponse | Select-Object -First 3) {
        Write-Host "  #$($ticket.number) - $($ticket.subject) - $($ticket.status)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Anon key query failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "This could indicate RLS policy restrictions!" -ForegroundColor Yellow
}

# Test 3: Check RLS policies
Write-Host "`n=== Test 3: Check RLS Status ===" -ForegroundColor Magenta
try {
    $rlsResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/check_table_rls" -Headers $serviceHeaders -Method POST -Body '{"table_name": "tickets"}' -ContentType "application/json"
    Write-Host "✅ RLS check successful" -ForegroundColor Green
    $rlsResponse | ConvertTo-Json
} catch {
    Write-Host "❌ RLS check failed or function doesn't exist" -ForegroundColor Red
}

# Test 4: Get current user context (anon key)
Write-Host "`n=== Test 4: User Context Check ===" -ForegroundColor Magenta
try {
    $userResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/user" -Headers $anonHeaders -Method GET
    Write-Host "✅ User context check successful" -ForegroundColor Green
    $userResponse | ConvertTo-Json
} catch {
    Write-Host "❌ User context check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "User may not be authenticated - this could be the issue!" -ForegroundColor Yellow
}

Write-Host "`nPress any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 