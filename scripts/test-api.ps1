# Test API server connection
Write-Host "Testing API server connection..." -ForegroundColor Cyan

# Test localhost
try {
    $response = Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
    Write-Host "localhost:3001 is reachable" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "localhost:3001 failed: $_" -ForegroundColor Red
}

Write-Host ""

# Test 127.0.0.1
try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3001/health" -UseBasicParsing
    Write-Host "127.0.0.1:3001 is reachable" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "127.0.0.1:3001 failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "Testing Gmail sync endpoint..." -ForegroundColor Cyan
$testChannelId = "1f8927a9-acc3-40bf-aa0b-a88e0dfcc4dd"

try {
    $response = Invoke-WebRequest -Uri "http://127.0.0.1:3001/sync/gmail/$testChannelId" -Method POST -UseBasicParsing
    Write-Host "Gmail sync endpoint is reachable" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor Gray
} catch {
    Write-Host "Gmail sync endpoint failed: $_" -ForegroundColor Red
} 