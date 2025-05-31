# Script to update the test email script with correct credentials

Write-Host "Updating test email script with current .env credentials..." -ForegroundColor Yellow

# Load .env file
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

# Read environment variables from .env
$envContent = Get-Content .env
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

if (-not $supabaseUrl -or -not $serviceKey) {
    Write-Host "❌ Could not find Supabase credentials in .env file!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Found Supabase credentials" -ForegroundColor Green
Write-Host "URL: $supabaseUrl" -ForegroundColor Cyan
Write-Host "Service Key Length: $($serviceKey.Length)" -ForegroundColor Cyan

# Update the test script
$testScriptPath = "..\..\scripts\test-email.ps1"
if (-not (Test-Path $testScriptPath)) {
    Write-Host "❌ Test script not found at $testScriptPath" -ForegroundColor Red
    exit 1
}

# Read the test script
$scriptContent = Get-Content $testScriptPath -Raw

# Update the credentials
$scriptContent = $scriptContent -replace '\$SUPABASE_URL = ".*"', "`$SUPABASE_URL = `"$supabaseUrl`""
$scriptContent = $scriptContent -replace '\$SUPABASE_SERVICE_KEY = ".*"', "`$SUPABASE_SERVICE_KEY = `"$serviceKey`""

# Write back to file
$scriptContent | Set-Content $testScriptPath -Encoding UTF8

Write-Host "✅ Updated test script successfully!" -ForegroundColor Green
Write-Host "You can now run: cd ..\..\scripts && .\test-email.ps1" -ForegroundColor Yellow 