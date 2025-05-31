# Quick script to check tickets in Supabase

# Load credentials from API server .env
$envPath = "..\apps\api-server\.env"
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env file not found at $envPath" -ForegroundColor Red
    exit 1
}

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

Write-Host "Checking tickets in database..." -ForegroundColor Yellow

$headers = @{
    "Authorization" = "Bearer $serviceKey"
    "apikey" = $serviceKey
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/tickets?select=*&order=created_at.desc&limit=5" -Headers $headers -Method GET
    
    Write-Host "✅ Latest tickets:" -ForegroundColor Green
    foreach ($ticket in $response) {
        Write-Host "  #$($ticket.number) - $($ticket.subject) - $($ticket.status) - $($ticket.created_at)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error checking tickets: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Checking conversations..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/conversations?select=*&order=created_at.desc&limit=5" -Headers $headers -Method GET
    
    Write-Host "✅ Latest conversations:" -ForegroundColor Green
    foreach ($conv in $response) {
        Write-Host "  $($conv.id) - $($conv.channel) - $($conv.created_at)" -ForegroundColor Cyan
    }
} catch {
    Write-Host "❌ Error checking conversations: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 