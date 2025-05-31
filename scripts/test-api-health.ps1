# Test API Server Health Check

Write-Host "Testing API Server Health..." -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    
    Write-Host "✅ API Server is running!" -ForegroundColor Green
    Write-Host "Status: $($response.status)" -ForegroundColor Cyan
    Write-Host "Timestamp: $($response.timestamp)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ API Server is not responding" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`nPress any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 