# Check webhook logs for debugging

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

$headers = @{
    "Authorization" = "Bearer $serviceKey"
    "apikey" = $serviceKey
    "Content-Type" = "application/json"
}

Write-Host "Latest webhook logs:" -ForegroundColor Yellow
$response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/webhook_logs?order=created_at.desc&limit=3" -Headers $headers -Method GET

foreach ($log in $response) {
    Write-Host "[$($log.created_at)] $($log.channel) - Processed: $($log.processed)" -ForegroundColor Cyan
    if ($log.error) {
        Write-Host "  Error: $($log.error)" -ForegroundColor Red
    }
}

Write-Host "`nPress any key to exit..."
$Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") | Out-Null 